import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/contact.css';

function Contact() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(() => window.location.hash === '#feedback');
  const [formData, setFormData] = useState({ name: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const syncWithHash = () => setIsOpen(window.location.hash === '#feedback');
    window.addEventListener('hashchange', syncWithHash);
    return () => window.removeEventListener('hashchange', syncWithHash);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') closeFeedback();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeFeedback = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsOpen(false);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');
    try {
      await api.submitFeedback({
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      setSubmitMessage(t('feedbackSuccess'));
      setFormData({ name: '', subject: '', message: '' });
    } catch (error) {
      setSubmitMessage(t('feedbackError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <section id="feedback" className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button className="contact-backdrop" type="button" onClick={closeFeedback} aria-label={t('closeFeedback')} />
      <div className="contact-panel">
        <button ref={closeButtonRef} className="contact-close" type="button" onClick={closeFeedback} aria-label={t('closeFeedback')}>
          <X aria-hidden="true" />
        </button>
        <p className="contact-kicker">{t('feedbackKicker')}</p>
        <h2 id="feedback-title">{t('feedbackTitle')}</h2>
        <p className="contact-intro">{t('feedbackFormIntro')}</p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            <span>{t('feedbackName')}</span>
            <input
              type="text"
              value={formData.name}
              onChange={event => setFormData({ ...formData, name: event.target.value })}
              className="form-input"
              maxLength="100"
              placeholder={t('feedbackNamePlaceholder')}
              autoComplete="name"
            />
          </label>
          <label>
            <span>{t('feedbackSubject')}</span>
            <input
              type="text"
              value={formData.subject}
              onChange={event => setFormData({ ...formData, subject: event.target.value })}
              className="form-input"
              maxLength="255"
              placeholder={t('feedbackSubjectPlaceholder')}
            />
          </label>
          <label>
            <span>{t('yourFeedback')}</span>
            <textarea
              value={formData.message}
              onChange={event => setFormData({ ...formData, message: event.target.value })}
              rows="5"
              className="form-textarea"
              maxLength="5000"
              required
            />
          </label>
          <button type="submit" disabled={submitting} className="form-button">
            {submitting ? t('submittingFeedback') : t('submitFeedback')}
          </button>
          {submitMessage && (
            <p className={`submit-message ${submitMessage === t('feedbackError') ? 'error' : 'success'}`} role="status">
              {submitMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export default Contact;
