import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Flag,
  HardHat,
  Heart,
  Landmark,
  MapPin,
  Plus,
  Ship,
  Sparkles,
  Star,
  TreePine,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import {
  getFederalHolidayMapForYears,
  HOLIDAY_TRANSLATION_KEYS,
} from '../utils/usFederalHolidays';
import { formatFullDate, formatMonthYear } from '../utils/formatLocalizedDate';
import '../styling/events.css';

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MN = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const HOUR_SLOTS = Array.from({ length: 24 }, (_, hour) => hour);
const CALENDAR_REFRESH_INTERVAL = 15 * 60 * 1000;

const HOLIDAY_ICONS = {
  newYearsDay: Sparkles,
  mlkDay: Heart,
  presidentsDay: Landmark,
  memorialDay: Flag,
  juneteenth: Star,
  independenceDay: Flag,
  laborDay: HardHat,
  columbusDay: Ship,
  veteransDay: Award,
  thanksgiving: UtensilsCrossed,
  christmas: TreePine,
};

function formatHourLabel(hour, language) {
  const date = new Date(2000, 0, 1, hour, 0);
  return date.toLocaleTimeString(language === 'mn' ? 'mn-MN' : 'en-US', {
    hour: 'numeric',
    hour12: true,
  });
}

function formatEventStartTime(event, language) {
  if (event.isAllDay || !event.start_datetime) return null;

  return new Date(event.start_datetime).toLocaleTimeString(
    language === 'mn' ? 'mn-MN' : 'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

function EventLabel({ event, className = '', showTime = false, language = 'en' }) {
  const Icon = event.holidayKey ? HOLIDAY_ICONS[event.holidayKey] : null;
  const startTime = showTime ? formatEventStartTime(event, language) : null;

  return (
    <span className={`events-event-label ${className}`.trim()}>
      {Icon && <Icon className="events-event-icon" aria-hidden="true" />}
      {startTime && <span className="events-event-label-time">{startTime}</span>}
      <span className="events-event-label-text">{event.title}</span>
    </span>
  );
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalDateInputValue(date) {
  return toDateKey(date);
}

function toLocalTimeInputValue(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function buildDateTime(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00`;
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = firstDay.getDay();
  const cells = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startPad - 1; i >= 0; i -= 1) {
    cells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: new Date(year, month + 1, nextDay),
      isCurrentMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}

function buildHolidayEvent(date, holidayKey, title) {
  const dateKey = toDateKey(date);
  return {
    id: `holiday-${holidayKey}-${dateKey}`,
    title,
    holidayKey,
    start_datetime: `${dateKey}T00:00:00`,
    end_datetime: null,
    location: null,
    isHoliday: true,
    isRecurring: true,
  };
}

function sortDayEvents(dayEvents) {
  const priority = (event) => {
    if (event.isHoliday) return 0;
    if (event.isRecurring) return 1;
    return 2;
  };

  return [...dayEvents].sort((a, b) => {
    const byPriority = priority(a) - priority(b);
    if (byPriority !== 0) return byPriority;
    return new Date(a.start_datetime) - new Date(b.start_datetime);
  });
}

function emptyForm(date) {
  return {
    title: '',
    description: '',
    date: toLocalDateInputValue(date || new Date()),
    startTime: '10:00',
    endTime: '',
    location: '',
    max_attendees: '',
  };
}

function formFromEvent(event) {
  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : null;
  return {
    title: event.title || '',
    description: event.description || '',
    date: toLocalDateInputValue(start),
    startTime: toLocalTimeInputValue(start),
    endTime: end ? toLocalTimeInputValue(end) : '',
    location: event.location || '',
    max_attendees: event.max_attendees ? String(event.max_attendees) : '',
  };
}

function Events() {
  const [events, setEvents] = useState([]);
  const [googleCalendarError, setGoogleCalendarError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { t, language } = useLanguage();
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.is_admin);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const weekdays = language === 'mn' ? WEEKDAYS_MN : WEEKDAYS_EN;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [localResult, googleResult] = await Promise.allSettled([
      api.getEvents(viewYear, viewMonth + 1),
      api.getGoogleCalendarEvents(viewYear, viewMonth + 1),
    ]);

    if (localResult.status === 'rejected') {
      console.error('Error fetching events:', localResult.reason);
      setError(localResult.reason.message);
      setLoading(false);
      return;
    }

    const calendarEvents = googleResult.status === 'fulfilled'
      ? googleResult.value
      : [];
    if (googleResult.status === 'rejected') {
      console.error('Error fetching Google Calendar events:', googleResult.reason);
    }
    setGoogleCalendarError(googleResult.status === 'rejected');
    setEvents([...localResult.value, ...calendarEvents]);
    setLoading(false);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const refreshTimer = window.setInterval(loadEvents, CALENDAR_REFRESH_INTERVAL);
    return () => window.clearInterval(refreshTimer);
  }, [loadEvents]);

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const holidayMap = useMemo(() => {
    const years = [...new Set(calendarDays.map(day => day.date.getFullYear()))];
    return getFederalHolidayMapForYears(years);
  }, [calendarDays]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const key = event.start_datetime.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });

    calendarDays.forEach(day => {
      const key = toDateKey(day.date);

      const holidayKey = holidayMap[key];
      if (holidayKey) {
        if (!map[key]) map[key] = [];
        map[key].push(buildHolidayEvent(day.date, holidayKey, t(HOLIDAY_TRANSLATION_KEYS[holidayKey])));
      }

    });

    Object.keys(map).forEach(key => {
      map[key] = sortDayEvents(map[key]);
    });
    return map;
  }, [events, calendarDays, holidayMap, t]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayEvents = useMemo(
    () => eventsByDate[selectedDateKey] || [],
    [eventsByDate, selectedDateKey]
  );

  const monthLabel = formatMonthYear(viewDate, language);

  const selectedDateLabel = formatFullDate(selectedDate, language);

  const { allDayEvents, eventsByHour } = useMemo(() => {
    const byHour = HOUR_SLOTS.reduce((acc, hour) => {
      acc[hour] = [];
      return acc;
    }, {});
    const allDay = [];

    selectedDayEvents.forEach(event => {
      if (event.isHoliday || event.isAllDay) {
        allDay.push(event);
        return;
      }
      const hour = new Date(event.start_datetime).getHours();
      byHour[hour].push(event);
    });

    return { allDayEvents: allDay, eventsByHour: byHour };
  }, [selectedDayEvents]);

  const renderSlotEvent = (event) => (
    <article
      key={event.id}
      className={[
        'events-slot-event',
        event.isHoliday && 'events-slot-event--holiday',
        event.isRecurring && !event.isHoliday && 'events-slot-event--recurring',
        event.isGoogleCalendar && 'events-slot-event--google',
      ].filter(Boolean).join(' ')}
    >
      <div className="events-slot-event-title">
        <EventLabel event={event} className="event-title-label" />
      </div>
      {!event.isHoliday && (
        <p className="events-slot-event-time">
          {new Date(event.start_datetime).toLocaleTimeString(language === 'mn' ? 'mn-MN' : 'en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
          {event.end_datetime && (
            <>
              {' – '}
              {new Date(event.end_datetime).toLocaleTimeString(language === 'mn' ? 'mn-MN' : 'en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </>
          )}
        </p>
      )}
      {event.description && (
        <p className="events-slot-event-description">{event.description}</p>
      )}
      {event.location && (
        <p className="events-slot-event-location">
          <MapPin className="meta-icon" />
          {event.location}
        </p>
      )}
      {isAdmin && !event.isRecurring && !event.isHoliday && !event.isReadOnly && (
        <button
          type="button"
          className="event-edit-btn events-slot-event-edit"
          onClick={() => openEditModal(event)}
        >
          {t('editEvent')}
        </button>
      )}
    </article>
  );

  const openCreateModal = (date) => {
    setEditingEvent(null);
    setForm(emptyForm(date));
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setForm(formFromEvent(event));
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
    setFormError('');
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    start_datetime: buildDateTime(form.date, form.startTime),
    end_datetime: form.endTime ? buildDateTime(form.date, form.endTime) : null,
    location: form.location.trim() || null,
    max_attendees: form.max_attendees ? parseInt(form.max_attendees, 10) : null,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError(t('fillAllFields'));
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload();
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, payload);
      } else {
        await api.createEvent(payload);
      }
      closeModal();
      await loadEvents();
    } catch (err) {
      setFormError(err.message || t('eventSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !window.confirm(t('confirmDeleteEvent'))) return;

    setSaving(true);
    setFormError('');
    try {
      await api.deleteEvent(editingEvent.id);
      closeModal();
      await loadEvents();
    } catch (err) {
      setFormError(err.message || t('eventDeleteError'));
    } finally {
      setSaving(false);
    }
  };

  const goToPreviousMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day.date);
    if (!day.isCurrentMonth) {
      setViewDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
  };

  const handleDayDoubleClick = (day) => {
    if (!isAdmin) return;
    setSelectedDate(day.date);
    openCreateModal(day.date);
  };

  const todayKey = toDateKey(new Date());

  return (
    <section id="events" className="events-section">
      <div className="events-container">
        <div className="section-header">
          <h2 className="section-title">
            {t('eventsCalendar').split(' ').map((word, index) => (
              <span key={index} className="word">{word}</span>
            ))}
          </h2>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">Error: {error}</div>
        ) : (
          <>
            <div className={`events-layout-columns${user ? '' : ' events-layout-columns--calendar-only'}`}>
              <div className="events-calendar-column">
                <div className="events-calendar-toolbar">
                  <div className="events-calendar-nav">
                    <button type="button" className="events-calendar-nav-btn" onClick={goToPreviousMonth} aria-label={t('previousMonth')}>
                      <ChevronLeft />
                    </button>
                    <h3 className={`events-calendar-month${language === 'mn' ? ' events-date-title--mn' : ''}`}>{monthLabel}</h3>
                    <button type="button" className="events-calendar-nav-btn" onClick={goToNextMonth} aria-label={t('nextMonth')}>
                      <ChevronRight />
                    </button>
                  </div>
                  <div className="events-calendar-actions">
                    <button type="button" className="events-today-btn" onClick={goToToday}>
                      {t('today')}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="events-add-btn"
                        onClick={() => openCreateModal(selectedDate)}
                      >
                        <Plus className="events-add-icon" />
                        {t('addEvent')}
                      </button>
                    )}
                  </div>
                </div>
                {googleCalendarError && (
                  <p className="events-google-fallback">{t('calendarEventsUnavailable')}</p>
                )}
                <div className="events-calendar">
                <div className="events-calendar-weekdays">
                  {weekdays.map(label => (
                    <div key={label} className="events-calendar-weekday">{label}</div>
                  ))}
                </div>
                <div className="events-calendar-grid">
                  {calendarDays.map(day => {
                    const dateKey = toDateKey(day.date);
                    const dayEvents = eventsByDate[dateKey] || [];
                    const isSelected = dateKey === selectedDateKey;
                    const isToday = dateKey === todayKey;

                    return (
                      <button
                        key={dateKey + day.isCurrentMonth}
                        type="button"
                        className={[
                          'events-calendar-day',
                          !day.isCurrentMonth && 'events-calendar-day--muted',
                          isSelected && 'events-calendar-day--selected',
                          isToday && 'events-calendar-day--today',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleDayClick(day)}
                        onDoubleClick={() => handleDayDoubleClick(day)}
                      >
                        <span className="events-calendar-day-number">{day.date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <div className="events-calendar-day-events">
                            {dayEvents.slice(0, 3).map(event => (
                              <span
                                key={event.id}
                                className={[
                                  'events-calendar-event-pill',
                                  event.isHoliday && 'events-calendar-event-pill--holiday',
                                  event.isRecurring && !event.isHoliday && 'events-calendar-event-pill--recurring',
                                  event.isGoogleCalendar && 'events-calendar-event-pill--google',
                                ].filter(Boolean).join(' ')}
                                title={
                                  event.isGoogleCalendar
                                    ? `${formatEventStartTime(event, language) || ''} ${event.title}`.trim()
                                    : event.title
                                }
                              >
                                <EventLabel
                                  event={event}
                                  showTime={event.isGoogleCalendar}
                                  language={language}
                                />
                              </span>
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="events-calendar-more">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>

              {user && (
              <div className="events-day-column">
                <h3 className={`events-day-panel-title${language === 'mn' ? ' events-date-title--mn' : ''}`}>{selectedDateLabel}</h3>
                <aside className="events-day-panel">
                  <div className="events-day-panel-content">
                    <div className="events-time-slots">
                      {allDayEvents.length > 0 && (
                        <div className="events-time-slot events-time-slot--allday">
                          <div className="events-time-slot-label">{t('allDay')}</div>
                          <div className="events-time-slot-body">
                            {allDayEvents.map(renderSlotEvent)}
                          </div>
                        </div>
                      )}
                      {HOUR_SLOTS.map(hour => (
                        <div key={hour} className="events-time-slot">
                          <div className="events-time-slot-label">{formatHourLabel(hour, language)}</div>
                          <div className="events-time-slot-body">
                            {eventsByHour[hour].map(renderSlotEvent)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
              )}
            </div>
          </>
        )}
      </div>

      {modalOpen && isAdmin && (
        <div className="events-modal-overlay" onClick={closeModal}>
          <div className="events-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="events-modal-header">
              <h3>{editingEvent ? t('editEvent') : t('addEvent')}</h3>
              <button type="button" className="events-modal-close" onClick={closeModal} aria-label={t('cancel')}>
                <X />
              </button>
            </div>

            <form className="events-form" onSubmit={handleSave}>
              {formError && <div className="events-form-error">{formError}</div>}

              <label className="events-form-label">
                {t('eventTitle')}
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleFormChange('title', e.target.value)}
                  required
                />
              </label>

              <label className="events-form-label">
                {t('eventDescription')}
                <textarea
                  value={form.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </label>

              <div className="events-form-row">
                <label className="events-form-label">
                  {t('eventDate')}
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => handleFormChange('date', e.target.value)}
                    required
                  />
                </label>
                <label className="events-form-label">
                  {t('eventStartTime')}
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => handleFormChange('startTime', e.target.value)}
                    required
                  />
                </label>
                <label className="events-form-label">
                  {t('eventEndTime')}
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => handleFormChange('endTime', e.target.value)}
                  />
                </label>
              </div>

              <label className="events-form-label">
                {t('eventLocation')}
                <input
                  type="text"
                  value={form.location}
                  onChange={e => handleFormChange('location', e.target.value)}
                />
              </label>

              <label className="events-form-label">
                {t('maxAttendees')}
                <input
                  type="number"
                  min="1"
                  value={form.max_attendees}
                  onChange={e => handleFormChange('max_attendees', e.target.value)}
                />
              </label>

              <div className="events-form-actions">
                {editingEvent && (
                  <button
                    type="button"
                    className="events-delete-btn"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {t('deleteEvent')}
                  </button>
                )}
                <div className="events-form-actions-right">
                  <button type="button" className="events-cancel-btn" onClick={closeModal} disabled={saving}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="events-save-btn" disabled={saving}>
                    {saving ? '...' : t('saveEvent')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Events;
