import { useCallback, useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/prayer.css';

function Prayer() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    requestText: '',
    publicationConsent: false,
  });
  const [wallRequests, setWallRequests] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [wallError, setWallError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState(false);

  const loadPrayerWall = useCallback(async () => {
    setWallLoading(true);
    setWallError('');
    try {
      setWallRequests(await api.getPrayerWall());
    } catch (error) {
      setWallError(t('prayerWallError'));
    } finally {
      setWallLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrayerWall();
  }, [loadPrayerWall]);

  const handleSubmit = async event => {
    event.preventDefault();
    const name = formData.name.trim();
    const requestText = formData.requestText.trim();

    setSubmitMessage('');
    setSubmitError(false);
    if (!requestText) {
      setSubmitMessage(t('prayerRequestRequired'));
      setSubmitError(true);
      return;
    }

    setSubmitting(true);
    try {
      await api.submitPrayerRequest({
        name,
        request_text: requestText,
        publication_consent: formData.publicationConsent,
      });
      setFormData({
        name: '',
        requestText: '',
        publicationConsent: false,
      });
      setSubmitMessage(t('prayerRequestSuccess'));
    } catch (error) {
      setSubmitMessage(t('prayerRequestError'));
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = value => {
    if (!value) return '';
    return new Date(value).toLocaleDateString(
      language === 'mn' ? 'mn-MN' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  return (
    <main className="prayer-page">
      <section className="prayer-hero">
        <div className="prayer-shell prayer-hero-content">
          <p className="prayer-kicker">{t('prayerPageKicker')}</p>
          <h1>{t('prayerPageTitle')}</h1>
          <p>{t('prayerPageIntro')}</p>
        </div>
      </section>

      <section className="prayer-section">
        <div className="prayer-shell prayer-layout">
          <article className="prayer-form-card">
            <HeartHandshake aria-hidden="true" />
            <h2>{t('sharePrayerRequest')}</h2>
            <p>{t('prayerFormIntro')}</p>
            <form onSubmit={handleSubmit} className="prayer-form">
              <label>
                <span>{t('prayerName')}</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={event => setFormData({
                    ...formData,
                    name: event.target.value,
                  })}
                  maxLength="100"
                  placeholder={t('prayerNamePlaceholder')}
                  autoComplete="name"
                />
              </label>
              <label>
                <span>{t('prayerRequestLabel')}</span>
                <textarea
                  value={formData.requestText}
                  onChange={event => setFormData({
                    ...formData,
                    requestText: event.target.value,
                  })}
                  maxLength="2000"
                  rows="7"
                  required
                />
              </label>
              <label className="prayer-consent">
                <input
                  type="checkbox"
                  checked={formData.publicationConsent}
                  onChange={event => setFormData({
                    ...formData,
                    publicationConsent: event.target.checked,
                  })}
                />
                <span>{t('prayerPublicationConsent')}</span>
              </label>
              <p className="prayer-privacy-note">{t('prayerConsentExplanation')}</p>
              <button type="submit" disabled={submitting}>
                {submitting ? t('prayerSubmitting') : t('submitPrayerRequest')}
              </button>
              {submitMessage && (
                <p
                  className={`prayer-submit-message${submitError ? ' prayer-submit-message--error' : ''}`}
                  role="status"
                >
                  {submitMessage}
                </p>
              )}
            </form>
          </article>

          <section className="prayer-wall" aria-labelledby="prayer-wall-title">
            <div className="prayer-wall-heading">
              <p className="prayer-kicker">{t('prayerWallKicker')}</p>
              <h2 id="prayer-wall-title">{t('prayerWallTitle')}</h2>
              <p>{t('prayerWallIntro')}</p>
            </div>
            {wallLoading ? (
              <p className="prayer-wall-state">{t('prayerWallLoading')}</p>
            ) : wallError ? (
              <p className="prayer-wall-state prayer-wall-state--error">{wallError}</p>
            ) : wallRequests.length === 0 ? (
              <p className="prayer-wall-state">{t('prayerWallEmpty')}</p>
            ) : (
              <div className="prayer-wall-grid">
                {wallRequests.map(item => (
                  <article className="prayer-wall-card" key={`${item.number}-${item.date}`}>
                    <span className="prayer-wall-number" aria-label={`${t('prayerNumber')} ${item.number}`}>
                      #{item.number}
                    </span>
                    <h3>{item.name || t('anonymous')}</h3>
                    <p>{item.request_text}</p>
                    <time dateTime={item.date || undefined}>{formatDate(item.date)}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default Prayer;
