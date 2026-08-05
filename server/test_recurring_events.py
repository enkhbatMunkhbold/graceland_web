from datetime import datetime, time
from app import _expand_recurring_events


class Values:
    def __init__(self, **values):
        self.__dict__.update(values)


def _rule(slug, weekdays, start_time, **overrides):
    values = {
        'slug': slug,
        'title': slug.replace('-', ' ').title(),
        'recurrence_type': 'weekly',
        'weekdays': weekdays,
        'start_time': start_time,
        'end_time': None,
        'location': None,
        'description': None,
        'skip_last_match': False,
    }
    values.update(overrides)
    return Values(**values)


def _expand(year, month, rules):
    return _expand_recurring_events(year, month, rules=rules)


def test_quiet_time_excludes_mondays_and_wednesdays():
    quiet_time = _rule('quiet-time', '1,3,4,5,6', time(6, 0), end_time=time(6, 30))

    events = _expand(2026, 8, [quiet_time])

    assert events
    assert all(event['start_datetime'][11:16] == '06:00' for event in events)
    assert all(event['end_datetime'][11:16] == '06:30' for event in events)
    event_weekdays = {
        datetime.fromisoformat(event['start_datetime']).weekday()
        for event in events
    }
    assert event_weekdays == {1, 3, 4, 5, 6}


def test_last_friday_church_event_replaces_zoom_event():
    zoom_friday = _rule(
        'friday-evening-prayer-zoom',
        '4',
        time(21, 30),
        location='Zoom',
        skip_last_match=True,
    )
    church_friday = _rule(
        'last-friday-evening-prayer-church',
        '4',
        time(21, 30),
        recurrence_type='last_weekday',
        location='1955 Geary Rd. Walnut Creek, CA 94597',
    )

    events = _expand(2026, 8, [zoom_friday, church_friday])
    friday_events = [event for event in events if event['start_datetime'].startswith('2026-08')]

    assert len(friday_events) == 4
    assert sum(event['location'] == 'Zoom' for event in friday_events) == 3
    assert sum(event['location'].startswith('1955 Geary Rd.') for event in friday_events) == 1
    assert next(event for event in friday_events if event['location'] != 'Zoom')[
        'start_datetime'
    ].startswith('2026-08-28')
