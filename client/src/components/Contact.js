import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/contact.css';

function Contact() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(() => window.location.hash === '#contact');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const syncWithHash = () => setIsOpen(window.location.hash === '#contact');
    window.addEventListener('hashchange', syncWithHash);
    return () => window.removeEventListener('hashchange', syncWithHash);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') closeContact();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeContact = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsOpen(false);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');
    const payload = { ...formData, name: formData.name.trim() || 'Зочин' };
    try {
      await api.submitContact(payload);
      setSubmitMessage(t('contactSuccess'));
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitMessage(t('contactError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <section id="contact" className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <button className="contact-backdrop" type="button" onClick={closeContact} aria-label={t('closeContact')} />
      <div className="contact-panel">
        <button ref={closeButtonRef} className="contact-close" type="button" onClick={closeContact} aria-label={t('closeContact')}>
          <X aria-hidden="true" />
        </button>
        <p className="contact-kicker">{t('letsConnect')}</p>
        <h2 id="contact-title">{t('getInTouch')}</h2>
        <p className="contact-intro">{t('careContactIntro')}</p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            <span>{t('yourName')}</span>
            <input
              type="text"
              value={formData.name}
              onChange={event => setFormData({ ...formData, name: event.target.value })}
              className="form-input"
              autoComplete="name"
            />
          </label>
          <label>
            <span>{t('message')}</span>
            <textarea
              value={formData.message}
              onChange={event => setFormData({ ...formData, message: event.target.value })}
              rows="5"
              className="form-textarea"
              required
            />
          </label>
          <button type="submit" disabled={submitting} className="form-button">
            {submitting ? t('sendingMessage') : t('sendMessage')}
          </button>
          {submitMessage && (
            <p className={`submit-message ${submitMessage === t('contactError') ? 'error' : 'success'}`} role="status">
              {submitMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export default Contact;
