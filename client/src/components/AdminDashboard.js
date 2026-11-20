import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/admin-dashboard.css';
import '../styling/admin-invite.css';

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
  const [roleRequests, setRoleRequests] = useState([]);
  const [roleUsers, setRoleUsers] = useState([]);
  const [roleAudit, setRoleAudit] = useState([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState('');
  const [roleBusyId, setRoleBusyId] = useState(null);
  const [signupInvite, setSignupInvite] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

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

  const loadRoleData = useCallback(async () => {
    setRoleLoading(true);
    setRoleError('');
    try {
      const [pending, users, audit] = await Promise.all([
        api.getRoleRequests(),
        api.getRoleUsers(),
        api.getRoleAudit(),
      ]);
      setRoleRequests(pending);
      setRoleUsers(users);
      setRoleAudit(audit);
    } catch (roleLoadError) {
      setRoleError('Unable to load users and roles.');
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      loadRequests();
      loadRoleData();
    }
    else setLoading(false);
    api.getHomeAnnouncement()
      .then(setAnnouncement)
      .catch(() => setAnnouncementMessage('Unable to load the current announcement.'));
  }, [loadRequests, loadRoleData, user?.is_admin]);

  const reviewRoleRequest = async (id, decision) => {
    setRoleBusyId(`request-${id}`);
    setRoleError('');
    try {
      await api.reviewRoleRequest(id, decision);
      await loadRoleData();
    } catch (reviewError) {
      setRoleError(reviewError.message || 'Unable to review this request.');
    } finally {
      setRoleBusyId(null);
    }
  };

  const changeUserRole = async (target, role, checked) => {
    setRoleBusyId(`user-${target.id}`);
    setRoleError('');
    try {
      const updated = await api.updateUserRoles(target.id, { [role]: checked });
      setRoleUsers(current => current.map(item => item.id === target.id ? updated : item));
      setRoleAudit(await api.getRoleAudit());
    } catch (roleChangeError) {
      setRoleError(roleChangeError.message || 'Unable to update this role.');
    } finally {
      setRoleBusyId(null);
    }
  };

  const createSignupInvite = async () => {
    setInviteBusy(true);
    setInviteMessage('');
    try {
      const result = await api.createSignupInvite(7);
      setSignupInvite(`${window.location.origin}/SignUp?invite=${encodeURIComponent(result.token)}`);
    } catch (inviteError) {
      setInviteMessage(inviteError.message || t('signupInviteError'));
    } finally {
      setInviteBusy(false);
    }
  };

  const copySignupInvite = async () => {
    try {
      await navigator.clipboard.writeText(signupInvite);
      setInviteMessage(t('inviteCopied'));
    } catch (copyError) {
      setInviteMessage(t('copyInviteError'));
    }
  };

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
      let next = { ...announcement, title: '', body: '' };
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
                        setAnnouncement(current => ({ ...current, type: 'image', mediaUrl: '', posterUrl: '', alt: '' }));
                      }}
                    >Remove image or video</button>
                  )}
                </div>
                <div className="admin-announcement-footer">
                  <button type="submit" disabled={announcementBusy}>{announcementBusy ? 'Publishing...' : 'Publish announcement'}</button>
                  {announcementMessage && <p role="status">{announcementMessage}</p>}
                </div>
              </form>
            ) : <p className="admin-state">Loading announcement...</p>}
          </section>
          {user?.is_admin && <section className="admin-role-section" aria-labelledby="role-management-title">
            <div className="admin-section-heading">
              <p>{t('adminDashboard')}</p>
              <h2 id="role-management-title">{t('roleManagement')}</h2>
              <span>{t('roleManagementIntro')}</span>
            </div>
            <div className="admin-role-content">
              {roleError && <p className="admin-alert" role="alert">{roleError}</p>}
              {user?.username === 'Boojoo' && (
                <div className="admin-invite-panel">
                  <div>
                    <h3>{t('signupInviteTitle')}</h3>
                    <p>{t('signupInviteIntro')}</p>
                  </div>
                  <button type="button" disabled={inviteBusy} onClick={createSignupInvite}>
                    {inviteBusy ? t('creatingInvite') : t('createSignupInvite')}
                  </button>
                  {signupInvite && (
                    <div className="admin-invite-result">
                      <input type="text" readOnly value={signupInvite} aria-label={t('signupInviteLink')} />
                      <button type="button" onClick={copySignupInvite}>{t('copyInviteLink')}</button>
                    </div>
                  )}
                  {inviteMessage && <p className="admin-invite-message" role="status">{inviteMessage}</p>}
                </div>
              )}
              {roleLoading ? <p className="admin-state">Loading users and roles...</p> : (
                <>
                  <h3>{t('pendingStaffRequests')}</h3>
                  {roleRequests.length ? (
                    <div className="admin-role-requests">
                      {roleRequests.map(item => (
                        <article key={item.id} className="admin-role-request-card">
                          <div><strong>{item.user.username}</strong><span>{item.user.email}</span></div>
                          <div className="admin-role-request-actions">
                            <button type="button" disabled={roleBusyId === `request-${item.id}`} onClick={() => reviewRoleRequest(item.id, 'approved')}>{t('approveStaffRequest')}</button>
                            <button type="button" disabled={roleBusyId === `request-${item.id}`} onClick={() => reviewRoleRequest(item.id, 'rejected')}>{t('rejectStaffRequest')}</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : <p className="admin-state">{t('noPendingStaffRequests')}</p>}

                  <h3>All users</h3>
                  <div className="admin-role-users">
                    {roleUsers.map(item => (
                      <article key={item.id} className="admin-role-user-card">
                        <div className="admin-role-user-identity">
                          <strong>{item.username}</strong>
                          <span>{item.email}</span>
                          {item.is_protected && <em>{t('protectedAccount')}</em>}
                        </div>
                        <div className="admin-role-toggles">
                          <label>
                            <input type="checkbox" checked={item.is_staff} disabled={item.is_protected || roleBusyId === `user-${item.id}`} onChange={event => changeUserRole(item, 'is_staff', event.target.checked)} />
                            <span>{t('staffRole')}</span>
                          </label>
                          <label>
                            <input type="checkbox" checked={item.is_admin} disabled={item.is_protected || user?.username !== 'Boojoo' || roleBusyId === `user-${item.id}`} onChange={event => changeUserRole(item, 'is_admin', event.target.checked)} />
                            <span>{t('administratorRole')}</span>
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>

                  <h3>{t('roleAuditTitle')}</h3>
                  {roleAudit.length ? <div className="admin-role-audit">
                    {roleAudit.map(entry => <p key={entry.id}><strong>{entry.actor}</strong> {entry.action} {entry.role} — {entry.target}<time>{formatDate(entry.created_at)}</time></p>)}
                  </div> : <p className="admin-state">No role changes recorded yet.</p>}
                </>
              )}
            </div>
          </section>}
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
