import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/events.css';

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MN = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

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

function buildSundayServiceEvent(date, title) {
  const dateKey = toDateKey(date);
  return {
    id: `sunday-service-${dateKey}`,
    title,
    start_datetime: `${dateKey}T15:30:00`,
    end_datetime: null,
    location: null,
    isRecurring: true,
  };
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
    try {
      const data = await api.getEvents(viewYear, viewMonth + 1);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const key = event.start_datetime.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });

    calendarDays.forEach(day => {
      if (day.date.getDay() !== 0) return;
      const key = toDateKey(day.date);
      if (!map[key]) map[key] = [];
      map[key].push(buildSundayServiceEvent(day.date, t('sundayService')));
    });

    Object.values(map).forEach(dayEvents => {
      dayEvents.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    });
    return map;
  }, [events, calendarDays, t]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayEvents = eventsByDate[selectedDateKey] || [];

  const monthLabel = viewDate.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

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
            <div className="events-calendar-toolbar">
              <div className="events-calendar-nav">
                <button type="button" className="events-calendar-nav-btn" onClick={goToPreviousMonth} aria-label={t('previousMonth')}>
                  <ChevronLeft />
                </button>
                <h3 className="events-calendar-month">{monthLabel}</h3>
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
                          {dayEvents.slice(0, 2).map(event => (
                            <span
                              key={event.id}
                              className={`events-calendar-event-pill${event.isRecurring ? ' events-calendar-event-pill--recurring' : ''}`}
                              title={event.title}
                            >
                              {event.title}
                            </span>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="events-calendar-more">+{dayEvents.length - 2}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="events-day-panel">
              <h3 className="events-day-panel-title">
                {t('eventsOnDay')} — {selectedDate.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>

              {selectedDayEvents.length > 0 && (
                <div className="events-day-list">
                  {selectedDayEvents.map(event => (
                    <article key={event.id} className="event-card event-card--compact">
                      <div className="event-content">
                        <h4 className="event-title">{event.title}</h4>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                        <div className="event-meta">
                          <Clock className="meta-icon" />
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
                        </div>
                        {event.location && (
                          <div className="event-meta">
                            <MapPin className="meta-icon" />
                            {event.location}
                          </div>
                        )}
                        {isAdmin && !event.isRecurring && (
                          <button
                            type="button"
                            className="event-edit-btn"
                            onClick={() => openEditModal(event)}
                          >
                            {t('editEvent')}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
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
