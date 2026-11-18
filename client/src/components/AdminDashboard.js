import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/admin-dashboard.css';

const STATUS_KEYS = {
  new: 'prayerStatusNew',
  approved_public: 'prayerStatusApproved',
  private: 'prayerStatusPrivate',
  answered: 'prayerStatusAnswered',
  archived: 'prayerStatusArchived',
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useContext(UserContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRequests(await api.getAdminPrayerRequests());
    } catch (requestError) {
      setError(t('adminPrayerLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?.is_admin) loadRequests();
    else setLoading(false);
    api.getHomeAnnouncement()
      .then(setAnnouncement)
      .catch(() => setAnnouncementMessage('Unable to load the current announcement.'));
  }, [loadRequests, user?.is_admin]);

  const changeAnnouncement = event => {
    const { name, value, type, checked } = event.target;
    setAnnouncement(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setAnnouncementMessage('');
  };

  const chooseAnnouncementFile = file => {
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
    if (!type) {
      setAnnouncementMessage('Please choose an image or video file.');
      return;
    }
    setAnnouncementFile(file);
    setAnnouncement(current => ({ ...current, type }));
    setAnnouncementMessage('');
  };

  const saveAnnouncement = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setAnnouncementBusy(true);
    setAnnouncementMessage('');
    try {
      let next = { ...announcement, title: '' };
      if (announcementFile) {
        const uploaded = await api.uploadHomeAnnouncementFile(announcementFile);
        next.mediaUrl = uploaded.url;
      }
      const saved = await api.updateHomeAnnouncement(next);
      setAnnouncement(saved);
      setAnnouncementFile(null);
      const fileInput = form.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      setAnnouncementMessage('Announcement published successfully.');
      navigate('/home');
    } catch (announcementError) {
      setAnnouncementMessage(announcementError.message || 'Unable to publish the announcement.');
    } finally {
      setAnnouncementBusy(false);
    }
  };

  const updateStatus = async (id, status) => {
    setBusyId(id);
    setError('');
    try {
      const updated = await api.updatePrayerRequestStatus(id, status);
      setRequests(current => current.map(item => item.id === id ? updated : item));
    } catch (requestError) {
      setError(t('adminPrayerUpdateError'));
    } finally {
      setBusyId(null);
    }
  };

  const deleteRequest = async id => {
    if (!window.confirm(t('adminPrayerDeleteConfirm'))) return;
    setBusyId(id);
    setError('');
    try {
      await api.deletePrayerRequest(id);
      setRequests(current => current.filter(item => item.id !== id));
    } catch (requestError) {
      setError(t('adminPrayerDeleteError'));
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = value => value ? new Date(value).toLocaleString(
    language === 'mn' ? 'mn-MN' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  ) : '';

  return (
    <main className="admin-page">
      <header className="admin-hero">
        <div className="admin-shell">
          <p>{t('adminDashboard')}</p>
          <h1>{t('adminDashboard')}</h1>
          <span>Manage frequently updated home-page content.</span>
        </div>
      </header>
      <section className="admin-section">
        <div className="admin-shell">
          <section className="admin-announcement-editor" aria-labelledby="announcement-editor-title">
            <div className="admin-section-heading">
              <p>Home page</p>
              <h2 id="announcement-editor-title">Official church announcement</h2>
              <span>Publish the official announcement shown on the far left of the home page.</span>
            </div>
            {announcement ? (
              <form className="admin-announcement-form" onSubmit={saveAnnouncement}>
                <label className="admin-toggle">
                  <input name="enabled" type="checkbox" checked={announcement.enabled} onChange={changeAnnouncement} />
                  <span>Show announcement on the home page</span>
                </label>
                <div className="admin-form-grid">
                  <label
                    className="admin-field-wide admin-announcement-dropzone"
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                      event.preventDefault();
                      chooseAnnouncementFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <span>Image or video (optional)</span>
                    <strong>Drag and drop a file here, or click to choose one</strong>
                    <input type="file" accept="image/*,video/*" onChange={event => chooseAnnouncementFile(event.target.files?.[0])} />
                    {(announcementFile || announcement.mediaUrl) && (
                      <small>{announcementFile ? announcementFile.name : 'The current uploaded file will be kept.'}</small>
                    )}
                  </label>
                  {(announcementFile || announcement.mediaUrl) && (
                    <button
                      className="admin-clear-media admin-field-wide"
                      type="button"
                      onClick={() => {
                        setAnnouncementFile(null);
                        setAnnouncement(current => ({ ...current, type: 'text', mediaUrl: '', posterUrl: '', alt: '' }));
                      }}
                    >Remove image or video</button>
                  )}
                  <label className="admin-field-wide">
                    <span>{announcement.type === 'text' ? 'Announcement text' : 'Text below the image or video'}</span>
                    <textarea name="body" value={announcement.body} onChange={changeAnnouncement} rows="5" maxLength="5000" placeholder="Type text, an explanation, or a link..." />
                  </label>
                </div>
                <div className="admin-announcement-footer">
                  <button type="submit" disabled={announcementBusy}>{announcementBusy ? 'Publishing...' : 'Publish announcement'}</button>
                  {announcementMessage && <p role="status">{announcementMessage}</p>}
                </div>
              </form>
            ) : <p className="admin-state">Loading announcement...</p>}
          </section>
          {user?.is_admin && <section className="admin-prayer-section" aria-labelledby="prayer-admin-title">
          <h2 id="prayer-admin-title" className="admin-subheading">Prayer requests</h2>
          {error && <p className="admin-alert" role="alert">{error}</p>}
          {loading ? (
            <p className="admin-state">{t('adminPrayerLoading')}</p>
          ) : requests.length === 0 ? (
            <p className="admin-state">{t('adminPrayerEmpty')}</p>
          ) : (
            <div className="admin-prayer-list">
              {requests.map(item => (
                <article className="admin-prayer-card" key={item.id}>
                  <div className="admin-prayer-meta">
                    <time dateTime={item.date_submitted || undefined}>{formatDate(item.date_submitted)}</time>
                    <span className={`admin-consent${item.publication_consent ? ' admin-consent--yes' : ''}`}>
                      {item.publication_consent ? t('publicationAllowed') : t('publicationPrivate')}
                    </span>
                  </div>
                  <h2>{item.name || t('anonymous')}</h2>
                  <p>{item.request_text}</p>
                  <div className="admin-prayer-actions">
                    <label>
                      <span>{t('prayerCurrentStatus')}</span>
                      <select
                        value={item.status}
                        disabled={busyId === item.id}
                        onChange={event => updateStatus(item.id, event.target.value)}
                      >
                        {Object.entries(STATUS_KEYS).map(([status, key]) => (
                          <option
                            key={status}
                            value={status}
                            disabled={status === 'approved_public' && !item.publication_consent}
                          >
                            {t(key)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="admin-delete"
                      disabled={busyId === item.id}
                      onClick={() => deleteRequest(item.id)}
                    >
                      {t('deletePrayerRequest')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          </section>}
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;
