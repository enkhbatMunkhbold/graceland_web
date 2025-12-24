import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/events.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    api.getEvents()
      .then(data => {
        setEvents(data.slice(0, 3)); // Show only 3 events
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching events:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section id="events" className="events-section">
        <div className="events-container">
          <h2 className="section-title">{t('upcomingEvents')}</h2>
          <div className="loading">Loading...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="events" className="events-section">
        <div className="events-container">
          <h2 className="section-title">{t('upcomingEvents')}</h2>
          <div className="error">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="events" className="events-section">
      <div className="events-container">
        <div className="section-header">
          <h2 className="section-title">{t('upcomingEvents')}</h2>
        </div>

        {events.length === 0 ? (
          <p className="no-events">{t('noEvents')}</p>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  <Calendar className="event-icon" />
                </div>
                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-description">{event.description}</p>
                  <div className="event-meta">
                    <Clock className="meta-icon" />
                    {new Date(event.start_datetime).toLocaleDateString()}
                  </div>
                  <div className="event-meta">
                    <MapPin className="meta-icon" />
                    {event.location || 'TBA'}
                  </div>
                  <button className="event-button">
                    {t('register')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Events;