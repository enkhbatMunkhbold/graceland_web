"""Persist Google Calendar events in the local database without duplicates."""

from datetime import date, datetime, time, timedelta, timezone
from threading import Event as ThreadEvent, Lock, Thread
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
import json

from config import (
    GOOGLE_CALENDAR_API_KEY,
    GOOGLE_CALENDAR_FUTURE_DAYS,
    GOOGLE_CALENDAR_HISTORY_DAYS,
    GOOGLE_CALENDAR_ID,
    GOOGLE_CALENDAR_SYNC_INTERVAL_SECONDS,
    GOOGLE_CALENDAR_TIMEZONE,
    db,
)
import models

SOURCE = 'google_calendar'
_sync_lock = Lock()
_scheduler_started = False
_scheduler_stop = ThreadEvent()


def _parse_google_datetime(value, is_all_day=False):
    if not value:
        return None
    if is_all_day:
        return datetime.combine(date.fromisoformat(value), time.min)
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    # Store wall time, matching the existing timezone-naive Event model.
    return parsed.replace(tzinfo=None)


def _parse_updated(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def _request_page(params):
    calendar_id = quote(GOOGLE_CALENDAR_ID, safe='')
    url = f'https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events?{urlencode(params)}'
    request = Request(url, headers={'User-Agent': 'GracelandChurchWebsite/1.0'})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))


def _fetch_pages(params):
    items = []
    next_sync_token = None
    while True:
        payload = _request_page(params)
        items.extend(payload.get('items', []))
        page_token = payload.get('nextPageToken')
        if not page_token:
            next_sync_token = payload.get('nextSyncToken')
            break
        params['pageToken'] = page_token
    return items, next_sync_token


def _event_values(item):
    start = item.get('start') or {}
    end = item.get('end') or {}
    is_all_day = bool(start.get('date') and not start.get('dateTime'))
    start_value = start.get('date') if is_all_day else start.get('dateTime')
    end_value = end.get('date') if is_all_day else end.get('dateTime')
    if not start_value:
        return None
    return {
        'title': item.get('summary') or 'Calendar event',
        'description': item.get('description') or None,
        'start_datetime': _parse_google_datetime(start_value, is_all_day),
        'end_datetime': _parse_google_datetime(end_value, is_all_day),
        'location': item.get('location') or None,
        'source': SOURCE,
        'external_id': item['id'],
        'external_updated_at': _parse_updated(item.get('updated')),
        'external_link': item.get('htmlLink') or None,
        'is_all_day': is_all_day,
        'is_read_only': True,
    }


def _upsert_item(item):
    external_id = item.get('id')
    if not external_id:
        return 'skipped'
    event = models.Event.query.filter_by(external_id=external_id).first()
    if item.get('status') == 'cancelled':
        if event:
            db.session.delete(event)
            return 'deleted'
        return 'skipped'

    values = _event_values(item)
    if not values:
        return 'skipped'
    if event is None:
        # Adopt an identical old/manual row on first import rather than showing
        # the same occurrence twice.
        event = models.Event.query.filter_by(
            title=values['title'],
            start_datetime=values['start_datetime'],
        ).first()
    created = event is None
    if created:
        event = models.Event()
        db.session.add(event)
    for key, value in values.items():
        setattr(event, key, value)
    return 'created' if created else 'updated'


def _full_sync_params(now):
    window_start = now - timedelta(days=GOOGLE_CALENDAR_HISTORY_DAYS)
    window_end = now + timedelta(days=GOOGLE_CALENDAR_FUTURE_DAYS)
    params = {
        'key': GOOGLE_CALENDAR_API_KEY,
        'timeMin': window_start.replace(microsecond=0).isoformat() + 'Z',
        'timeMax': window_end.replace(microsecond=0).isoformat() + 'Z',
        'timeZone': GOOGLE_CALENDAR_TIMEZONE,
        'singleEvents': 'true',
        'showDeleted': 'true',
        'maxResults': 2500,
    }
    return params, window_start, window_end


def sync_google_calendar(force=False, full=False):
    """Import once, then use Google's sync token for idempotent updates."""
    if not GOOGLE_CALENDAR_API_KEY or not GOOGLE_CALENDAR_ID:
        return {'skipped': True, 'reason': 'not_configured'}
    if not _sync_lock.acquire(blocking=False):
        return {'skipped': True, 'reason': 'already_running'}
    try:
        state = models.GoogleCalendarSyncState.query.filter_by(calendar_id=GOOGLE_CALENDAR_ID).first()
        if state is None:
            state = models.GoogleCalendarSyncState(calendar_id=GOOGLE_CALENDAR_ID)
            db.session.add(state)
            db.session.flush()
        now = datetime.utcnow()
        if (
            not force
            and state.last_success_at
            and now - state.last_success_at < timedelta(seconds=GOOGLE_CALENDAR_SYNC_INTERVAL_SECONDS)
        ):
            return {'skipped': True, 'reason': 'not_due', 'last_success_at': state.last_success_at.isoformat()}

        do_full = full or not state.sync_token
        if do_full:
            params, window_start, window_end = _full_sync_params(now)
        else:
            window_start, window_end = state.window_start, state.window_end
            params = {
                'key': GOOGLE_CALENDAR_API_KEY,
                'syncToken': state.sync_token,
                'singleEvents': 'true',
                'showDeleted': 'true',
                'maxResults': 2500,
            }

        try:
            items, next_sync_token = _fetch_pages(params)
        except HTTPError as error:
            if error.code == 410 and not do_full:
                state.sync_token = None
                db.session.commit()
                params, window_start, window_end = _full_sync_params(now)
                items, next_sync_token = _fetch_pages(params)
                do_full = True
            else:
                raise

        counts = {'created': 0, 'updated': 0, 'deleted': 0, 'skipped': 0}
        for item in items:
            counts[_upsert_item(item)] += 1

        state.sync_token = next_sync_token or state.sync_token
        state.window_start = window_start
        state.window_end = window_end
        state.last_success_at = now
        state.last_error = None
        db.session.commit()
        return {**counts, 'total_received': len(items), 'full_sync': do_full}
    except Exception as error:
        db.session.rollback()
        try:
            state = models.GoogleCalendarSyncState.query.filter_by(calendar_id=GOOGLE_CALENDAR_ID).first()
            if state:
                state.last_error = str(error)[:2000]
                db.session.commit()
        except Exception:
            db.session.rollback()
        raise
    finally:
        _sync_lock.release()


def start_hourly_sync(app):
    """Start a daemon that checks Google Calendar once per configured hour."""
    global _scheduler_started
    if _scheduler_started or not GOOGLE_CALENDAR_API_KEY or not GOOGLE_CALENDAR_ID:
        return
    _scheduler_started = True

    def run():
        if _scheduler_stop.wait(10):
            return
        while not _scheduler_stop.is_set():
            try:
                with app.app_context():
                    sync_google_calendar()
            except Exception as error:
                app.logger.warning('Google Calendar synchronization failed: %s', error)
            _scheduler_stop.wait(GOOGLE_CALENDAR_SYNC_INTERVAL_SECONDS)

    Thread(target=run, name='google-calendar-sync', daemon=True).start()


def run_import():
    from config import app
    with app.app_context():
        result = sync_google_calendar(force=True, full=True)
        print(json.dumps(result, indent=2, default=str))


if __name__ == '__main__':
    run_import()
