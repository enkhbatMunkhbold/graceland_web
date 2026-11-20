import { useEffect, useState } from 'react';
import { ArrowRight, Megaphone, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/announcements.css';

const ANNOUNCEMENT_OWNER_TOKENS_KEY = 'gracelandAnnouncementOwnerTokens';

function getAnnouncementOwnerTokens() {
  try {
    return JSON.parse(window.localStorage.getItem(ANNOUNCEMENT_OWNER_TOKENS_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function removeAnnouncementOwnerToken(id) {
  const tokens = getAnnouncementOwnerTokens();
  delete tokens[id];
  window.localStorage.setItem(ANNOUNCEMENT_OWNER_TOKENS_KEY, JSON.stringify(tokens));
}

function TextWithLinks({ children }) {
  const parts = String(children || '').split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => part.startsWith('http://') || part.startsWith('https://') ? (
    <a key={`${part}-${index}`} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
  ) : part);
}

function Announcements() {
  const { t, language } = useLanguage();
  const [churchAnnouncement, setChurchAnnouncement] = useState(null);
  const [publicAnnouncements, setPublicAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getHomeAnnouncement(), api.getMemberAnnouncements()])
      .then(([churchResult, publicResult]) => {
        if (!active) return;
        if (churchResult.status === 'fulfilled') setChurchAnnouncement(churchResult.value);
        if (publicResult.status === 'fulfilled') {
          const tokens = getAnnouncementOwnerTokens();
          setPublicAnnouncements(publicResult.value.map(item => ({
            ...item,
            canManage: Boolean(tokens[item.id]),
          })));
        }
        if (churchResult.status === 'rejected' && publicResult.status === 'rejected') {
          setError(t('announcementsLoadError'));
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [t]);

  const formatDate = value => value ? new Date(value).toLocaleDateString(
    language === 'mn' ? 'mn-MN' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  ) : '';

  const saveAnnouncement = async id => {
    const content = editContent.trim();
    if (!content) return;
    setSavingId(id);
    setError('');
    try {
      await api.updateMemberAnnouncement(id, content, getAnnouncementOwnerTokens()[id]);
      setPublicAnnouncements(current => current.map(item => item.id === id ? { ...item, content } : item));
      setEditingId(null);
      setEditContent('');
    } catch (saveError) {
      setError(t('announcementUpdateError'));
    } finally {
      setSavingId(null);
    }
  };

  const deleteAnnouncement = async id => {
    if (!window.confirm(t('announcementDeleteConfirm'))) return;
    setDeletingId(id);
    setError('');
    try {
      await api.deleteMemberAnnouncement(id, getAnnouncementOwnerTokens()[id]);
      removeAnnouncementOwnerToken(id);
      setPublicAnnouncements(current => current.filter(item => item.id !== id));
    } catch (deleteError) {
      setError(t('announcementDeleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="announcements-page">
      <section className="announcements-hero">
        <div className="announcements-shell">
          <p className="announcements-kicker">{t('community')}</p>
          <h1>{t('announcements')}</h1>
          <p>{t('announcementsPageIntro')}</p>
        </div>
      </section>

      <section className="announcements-section">
        <div className="announcements-shell announcements-layout">
          <section className="announcements-column" aria-labelledby="church-announcements-title">
            <div className="announcements-heading">
              <Megaphone aria-hidden="true" />
              <div>
                <p className="announcements-kicker">{t('fromTheChurch')}</p>
                <h2 id="church-announcements-title">{t('churchAnnouncements')}</h2>
              </div>
            </div>
            {loading ? <p className="announcements-state">{t('announcementsLoading')}</p> : churchAnnouncement?.enabled ? (
              <article className="church-announcement-card">
                {churchAnnouncement.type === 'image' && churchAnnouncement.mediaUrl && (
                  <img src={churchAnnouncement.mediaUrl} alt={churchAnnouncement.alt || ''} />
                )}
                {churchAnnouncement.type === 'video' && churchAnnouncement.mediaUrl && (
                  <video src={churchAnnouncement.mediaUrl} poster={churchAnnouncement.posterUrl || undefined} controls playsInline preload="metadata" />
                )}
                {(churchAnnouncement.title || churchAnnouncement.body) && (
                  <div className="church-announcement-copy">
                    {churchAnnouncement.title && <h3>{churchAnnouncement.title}</h3>}
                    {churchAnnouncement.body && <div><TextWithLinks>{churchAnnouncement.body}</TextWithLinks></div>}
                  </div>
                )}
              </article>
            ) : <p className="announcements-state">{t('churchAnnouncementsEmpty')}</p>}
          </section>

          <section className="announcements-column" aria-labelledby="public-announcements-title">
            <div className="announcements-heading announcements-heading--public">
              <Users aria-hidden="true" />
              <div>
                <p className="announcements-kicker">{t('communityBoard')}</p>
                <h2 id="public-announcements-title">{t('publicAnnouncements')}</h2>
              </div>
              <Link className="announcements-submit-link" to="/announcements/new">
                {t('insertAnnouncement')} <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            {loading ? <p className="announcements-state">{t('announcementsLoading')}</p> : error ? (
              <p className="announcements-state announcements-state--error">{error}</p>
            ) : publicAnnouncements.length ? (
              <div className="public-announcements-list">
                {publicAnnouncements.map(item => (
                  <article className="public-announcement-card" key={item.id}>
                    <strong>{language === 'mn' && item.author_name === 'Anonymous' ? t('anonymous') : item.author_name}</strong>
                    {item.title && <h3>{item.title}</h3>}
                    {editingId === item.id ? (
                      <textarea
                        className="public-announcement-edit"
                        value={editContent}
                        onChange={event => setEditContent(event.target.value)}
                        maxLength="5000"
                        rows="6"
                        autoFocus
                      />
                    ) : <div><TextWithLinks>{item.content}</TextWithLinks></div>}
                    <time dateTime={item.publish_date || undefined}>{formatDate(item.publish_date)}</time>
                    {item.canManage && (
                      <div className="public-announcement-actions">
                        {editingId === item.id ? (
                          <>
                            <button type="button" disabled={savingId === item.id || !editContent.trim()} onClick={() => saveAnnouncement(item.id)}>{savingId === item.id ? t('savingAnnouncement') : t('saveAnnouncement')}</button>
                            <button type="button" onClick={() => { setEditingId(null); setEditContent(''); }}>{t('cancelAnnouncementEdit')}</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => { setEditingId(item.id); setEditContent(item.content); }}>{t('editAnnouncement')}</button>
                        )}
                        <button type="button" disabled={deletingId === item.id} onClick={() => deleteAnnouncement(item.id)}>{deletingId === item.id ? t('deletingAnnouncement') : t('deleteAnnouncement')}</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : <p className="announcements-state">{t('publicAnnouncementsEmpty')}</p>}
          </section>
        </div>
      </section>
    </main>
  );
}

export default Announcements;
