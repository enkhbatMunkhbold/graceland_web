import { useState, useEffect } from 'react';
import { Book } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/sermons.css';

function Sermons() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    api.getSermons()
      .then(data => {
        setSermons(data.slice(0, 3));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching sermons:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section id="sermons" className="sermons-section">
        <div className="sermons-container">
          <h2 className="section-title">{t('latestSermons')}</h2>
          <div className="loading">Loading...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="sermons" className="sermons-section">
        <div className="sermons-container">
          <h2 className="section-title">{t('latestSermons')}</h2>
          <div className="error">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="sermons" className="sermons-section">
      <div className="sermons-container">
        <div className="section-header">
          <h2 className="section-title">{t('latestSermons')}</h2>
        </div>

        <div className="sermons-grid">
          {sermons.map(sermon => (
            <div key={sermon.id} className="sermon-card">
              <div className="sermon-icon-wrapper">
                <Book className="sermon-icon" />
              </div>
              <h3 className="sermon-title">{sermon.title}</h3>
              <p className="sermon-speaker">{sermon.speaker_name}</p>
              <p className="sermon-scripture">{sermon.scripture_reference}</p>
              <p className="sermon-date">{new Date(sermon.date).toLocaleDateString()}</p>
              {(sermon.video_url || sermon.audio_url) && (
                <button className="sermon-button">
                  {t('watchNow')} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Sermons;