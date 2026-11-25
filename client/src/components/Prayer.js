import { useCallback, useEffect, useRef, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import TurnstileWidget from './TurnstileWidget';
import '../styling/prayer.css';

const PRAYER_OWNER_TOKENS_KEY = 'gracelandPrayerOwnerTokens';

function getPrayerOwnerTokens() {
  try {
    return JSON.parse(window.localStorage.getItem(PRAYER_OWNER_TOKENS_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function savePrayerOwnerToken(id, token) {
  if (!id || !token) return;
  const tokens = getPrayerOwnerTokens();
  tokens[id] = token;
  window.localStorage.setItem(PRAYER_OWNER_TOKENS_KEY, JSON.stringify(tokens));
}

function removePrayerOwnerToken(id) {
  const tokens = getPrayerOwnerTokens();
  delete tokens[id];
  window.localStorage.setItem(PRAYER_OWNER_TOKENS_KEY, JSON.stringify(tokens));
}

function Prayer() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    requestText: '',
    keepPrivate: false,
    website: '',
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [wallRequests, setWallRequests] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [wallError, setWallError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState(false);
  const [formHeight, setFormHeight] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingId, setSavingId] = useState(null);
  const formCardRef = useRef(null);

  const loadPrayerWall = useCallback(async () => {
    setWallLoading(true);
    setWallError('');
    try {
      const tokens = getPrayerOwnerTokens();
      const requests = await api.getPrayerWall();
      setWallRequests(requests.map(item => ({
        ...item,
        canManage: Boolean(tokens[item.id]),
      })));
    } catch (error) {
      setWallError(t('prayerWallError'));
    } finally {
      setWallLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrayerWall();
  }, [loadPrayerWall]);

  useEffect(() => {
    const card = formCardRef.current;
    if (!card) return undefined;
    const updateHeight = () => setFormHeight(Math.ceil(card.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

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
      const createdPrayer = await api.submitPrayerRequest({
        name,
        request_text: requestText,
        publication_consent: !formData.keepPrivate,
        website: formData.website,
        turnstile_token: turnstileToken,
      });
      savePrayerOwnerToken(createdPrayer?.id, createdPrayer?.owner_token);
      setFormData({
        name: '',
        requestText: '',
        keepPrivate: false,
        website: '',
      });
      setTurnstileToken('');
      setSubmitMessage(t(
        formData.keepPrivate
          ? 'prayerRequestPrivateSuccess'
          : 'prayerRequestSuccess'
      ));
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

  const deleteWallPrayer = async id => {
    const message = language === 'mn' ? 'Энэ залбирлыг устгах уу?' : 'Delete this prayer request?';
    if (!window.confirm(message)) return;
    setDeletingId(id);
    try {
      await api.deletePublicPrayerRequest(id, getPrayerOwnerTokens()[id]);
      removePrayerOwnerToken(id);
      setWallRequests(current => current.filter(item => item.id !== id));
    } catch (error) {
      setWallError(language === 'mn' ? 'Залбирлыг устгаж чадсангүй.' : 'Unable to delete the prayer request.');
    } finally {
      setDeletingId(null);
    }
  };

  const saveWallPrayer = async id => {
    const nextText = editText.trim();
    if (!nextText) return;
    setSavingId(id);
    try {
      await api.updatePublicPrayerRequest(id, nextText, getPrayerOwnerTokens()[id]);
      setWallRequests(current => current.map(item => item.id === id ? { ...item, request_text: nextText } : item));
      setEditingId(null);
      setEditText('');
    } catch (error) {
      setWallError(language === 'mn' ? 'Залбирлыг засаж чадсангүй.' : 'Unable to update the prayer request.');
    } finally {
      setSavingId(null);
    }
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
        <div className="prayer-shell prayer-layout" style={formHeight ? { '--prayer-form-height': `${formHeight}px` } : undefined}>
          <article ref={formCardRef} className="prayer-form-card">
            <HeartHandshake aria-hidden="true" />
            <h2>{t('sharePrayerRequest')}</h2>
            <p>{t('prayerFormIntro')}</p>
            <form onSubmit={handleSubmit} className="prayer-form">
              <label aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
                <span>Website</span>
                <input
                  type="text"
                  value={formData.website}
                  onChange={event => setFormData({ ...formData, website: event.target.value })}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </label>
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
                  checked={formData.keepPrivate}
                  onChange={event => setFormData({
                    ...formData,
                    keepPrivate: event.target.checked,
                  })}
                />
                <span>{t('prayerPublicationConsent')}</span>
              </label>
              <p className="prayer-privacy-note">{t('prayerConsentExplanation')}</p>
              <TurnstileWidget onToken={setTurnstileToken} />
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
                  <article className="prayer-wall-card" key={item.id}>
                    <h3>{item.name || t('anonymous')}</h3>
                    {editingId === item.id ? (
                      <textarea
                        className="prayer-wall-edit-text"
                        value={editText}
                        onChange={event => setEditText(event.target.value)}
                        maxLength="2000"
                        rows="5"
                        autoFocus
                      />
                    ) : <p>{item.request_text}</p>}
                    <time dateTime={item.date || undefined}>{formatDate(item.date)}</time>
                    {item.canManage && <div className="prayer-wall-card-actions">
                      {editingId === item.id ? (
                        <>
                          <button type="button" disabled={savingId === item.id || !editText.trim()} onClick={() => saveWallPrayer(item.id)}>{savingId === item.id ? (language === 'mn' ? 'Хадгалж байна…' : 'Saving…') : (language === 'mn' ? 'Хадгалах' : 'Save')}</button>
                          <button type="button" onClick={() => { setEditingId(null); setEditText(''); }}>{language === 'mn' ? 'Болих' : 'Cancel'}</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => { setEditingId(item.id); setEditText(item.request_text); }}>{language === 'mn' ? 'Засах' : 'Edit'}</button>
                      )}
                      <button type="button" disabled={deletingId === item.id} onClick={() => deleteWallPrayer(item.id)}>{deletingId === item.id ? (language === 'mn' ? 'Устгаж байна…' : 'Deleting…') : (language === 'mn' ? 'Устгах' : 'Delete')}</button>
                    </div>}
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
