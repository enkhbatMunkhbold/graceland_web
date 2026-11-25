import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import TurnstileWidget from './TurnstileWidget';
import '../styling/announcement-form.css';

const ANNOUNCEMENT_OWNER_TOKENS_KEY = 'gracelandAnnouncementOwnerTokens';

function AnnouncementForm() {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mn = language === 'mn';

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const announcement = await api.createMemberAnnouncement({
        name: name.trim(),
        content: content.trim(),
        website,
        turnstile_token: turnstileToken,
      });
      if (announcement?.id && announcement?.owner_token) {
        let tokens = {};
        try {
          tokens = JSON.parse(window.localStorage.getItem(ANNOUNCEMENT_OWNER_TOKENS_KEY) || '{}');
        } catch (storageError) {
          tokens = {};
        }
        tokens[announcement.id] = announcement.owner_token;
        window.localStorage.setItem(ANNOUNCEMENT_OWNER_TOKENS_KEY, JSON.stringify(tokens));
      }
      setName('');
      setContent('');
      setWebsite('');
      setTurnstileToken('');
      setSuccess(mn ? 'Ð¢Ð°Ð½Ñ‹ Ð·Ð°Ñ€Ñ‹Ð³ Ñ…ÑÐ½Ð°Ð»Ñ‚Ð°Ð´ Ð¸Ð»Ð³ÑÑÐ»ÑÑ.' : 'Your announcement was submitted for staff review.');
    } catch (submitError) {
      setError(submitError.message || (mn ? 'Зарыг нийтэлж чадсангүй.' : 'Unable to post the announcement.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="announcement-form-page">
      <section className="announcement-form-card" aria-labelledby="announcement-form-title">
        <p className="announcement-form-kicker">{mn ? 'Олон нийтийн зар' : 'Community announcement'}</p>
        <h1 id="announcement-form-title">{mn ? 'Зар оруулах' : 'Post an announcement'}</h1>
        <p className="announcement-form-intro">
          {mn
            ? 'Нэрээ оруулахгүй бол таны зар “Нэргүй” гэж нийтлэгдэнэ.'
            : 'If you leave your name blank, your announcement will be posted as Anonymous.'}
        </p>
        <form onSubmit={submit}>
          <label aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
            <span>Website</span>
            <input value={website} onChange={event => setWebsite(event.target.value)} tabIndex="-1" autoComplete="off" />
          </label>
          <label>
            <span>{mn ? 'Нэр (заавал биш)' : 'Name (optional)'}</span>
            <input value={name} onChange={event => setName(event.target.value)} maxLength="120" autoComplete="name" />
          </label>
          <TurnstileWidget onToken={setTurnstileToken} />
          {success && <p role="status">{success}</p>}
          <label>
            <span>{mn ? 'Зар' : 'Announcement'}</span>
            <textarea value={content} onChange={event => setContent(event.target.value)} rows="8" maxLength="5000" required />
          </label>
          {error && <p className="announcement-form-error" role="alert">{error}</p>}
          <div className="announcement-form-actions">
            <button type="submit" disabled={submitting || !content.trim()}>
              {submitting ? (mn ? 'Нийтэлж байна…' : 'Posting…') : (mn ? 'Нийтлэх' : 'Post announcement')}
            </button>
            <Link to="/announcements">{mn ? 'Буцах' : 'Cancel'}</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default AnnouncementForm;
