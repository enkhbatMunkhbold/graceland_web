import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Home,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/admin-dashboard.css';
import '../styling/admin-invite.css';
import '../styling/admin-users.css';

const STATUS_KEYS = {
  new: 'prayerStatusNew',
  approved_public: 'prayerStatusApproved',
  private: 'prayerStatusPrivate',
  answered: 'prayerStatusAnswered',
  archived: 'prayerStatusArchived',
};

const toDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useContext(UserContext);
  const [activeSection, setActiveSection] = useState('overview');
  const [todayEvents, setTodayEvents] = useState([]);
  const [todayJobs, setTodayJobs] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [requests, setRequests] = useState([]);
  const [communityAnnouncements, setCommunityAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
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
      const [prayers, announcements] = await Promise.all([
        api.getAdminPrayerRequests(),
        api.getAdminAnnouncements(),
      ]);
      setRequests(prayers);
      setCommunityAnnouncements(announcements);
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
      const [users, audit] = await Promise.all([
        api.getRoleUsers(),
        api.getRoleAudit(),
      ]);
      setRoleUsers(users);
      setRoleAudit(audit);
    } catch (roleLoadError) {
      setRoleError('Unable to load users and roles.');
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin || user?.is_staff) {
      loadRequests();
    }
    if (user?.is_admin) {
      loadRoleData();
    }
    else setLoading(false);
    api.getHomeAnnouncement()
      .then(setAnnouncement)
      .catch(() => setAnnouncementMessage('Unable to load the current announcement.'));
  }, [loadRequests, loadRoleData, user?.is_admin, user?.is_staff]);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const todayKey = toDateKey(today);

    const loadOverview = async () => {
      setOverviewLoading(true);
      setOverviewError('');
      const [eventsResult, jobsResult] = await Promise.allSettled([
        api.getEvents(today.getFullYear(), today.getMonth() + 1),
        api.getDailyJobs(todayKey),
      ]);
      if (cancelled) return;

      if (eventsResult.status === 'fulfilled') {
        setTodayEvents(eventsResult.value.filter(event => event.start_datetime?.slice(0, 10) === todayKey));
      }
      if (jobsResult.status === 'fulfilled') setTodayJobs(jobsResult.value);
      if (eventsResult.status === 'rejected' || jobsResult.status === 'rejected') {
        setOverviewError('Some operational information could not be loaded.');
      }
      setOverviewLoading(false);
    };

    loadOverview();
    return () => { cancelled = true; };
  }, []);

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

  const deleteRoleUser = async target => {
    if (!window.confirm(t('deleteUserConfirm').replace('{name}', target.username))) return;
    setRoleBusyId(`user-${target.id}`);
    setRoleError('');
    try {
      await api.deleteRoleUser(target.id);
      setRoleUsers(current => current.filter(item => item.id !== target.id));
      setRoleAudit(await api.getRoleAudit());
    } catch (deleteError) {
      setRoleError(deleteError.message || t('deleteUserError'));
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

  const updateCommunityAnnouncement = async (id, status) => {
    setBusyId(`announcement-${id}`);
    setError('');
    try {
      const updated = await api.updateAdminAnnouncementStatus(id, status);
      setCommunityAnnouncements(current => current.map(item => item.id === id ? updated : item));
    } catch (reviewError) {
      setError(reviewError.message || 'Unable to review the announcement.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteCommunityAnnouncement = async id => {
    if (!window.confirm('Delete this community announcement?')) return;
    setBusyId(`announcement-${id}`);
    setError('');
    try {
      await api.deleteAdminAnnouncement(id);
      setCommunityAnnouncements(current => current.filter(item => item.id !== id));
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the announcement.');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = value => value ? new Date(value).toLocaleString(
    language === 'mn' ? 'mn-MN' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  ) : '';

  const pendingPrayerCount = requests.filter(item => item.status === 'new').length;
  const pendingAnnouncementCount = communityAnnouncements.filter(item => item.status === 'pending').length;
  const pendingReviewCount = pendingPrayerCount + pendingAnnouncementCount;
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'announcement', label: 'Announcement', icon: Megaphone },
    { id: 'prayer', label: 'Public submissions', icon: Bell },
    ...(user?.is_admin ? [{ id: 'staff', label: 'Staff access', icon: Users }] : []),
  ];

  return (
    <main className="admin-page">
      <header className="admin-hero">
        <div className="admin-shell">
          <p>Staff workspace</p>
          <h1>Church operations</h1>
          <span>Plan today, manage public content, and keep staff work organized.</span>
        </div>
      </header>
      <section className="admin-section">
        <div className="admin-shell admin-workspace">
          <aside className="admin-sidebar" aria-label="Operations navigation">
            <div className="admin-sidebar-user">
              <span>{user?.is_admin ? 'Administrator' : 'Staff member'}</span>
              <strong>{user?.username}</strong>
            </div>
            <nav className="admin-sidebar-nav">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={activeSection === item.id ? 'is-active' : ''}
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.id === 'prayer' && pendingReviewCount > 0 && <em>{pendingReviewCount}</em>}
                  </button>
                );
              })}
            </nav>
            <div className="admin-sidebar-links">
              <p>Manage website</p>
              <button type="button" onClick={() => navigate('/events')}><CalendarDays size={17} />Calendar & assignments<ChevronRight size={16} /></button>
              <button type="button" onClick={() => navigate('/sermons')}><Video size={17} />Sermons<ChevronRight size={16} /></button>
              <button type="button" onClick={() => navigate('/ministries')}><ClipboardList size={17} />Ministry pages<ChevronRight size={16} /></button>
            </div>
          </aside>

          <div className="admin-workspace-content">
          {activeSection === 'overview' && (
            <section className="admin-overview" aria-labelledby="operations-overview-title">
              <div className="admin-content-heading">
                <p>{new Date().toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <h2 id="operations-overview-title">Today at a glance</h2>
                <span>The information most likely to need your attention.</span>
              </div>

              <div className="admin-summary-grid">
                <button type="button" onClick={() => navigate('/events')}>
                  <CalendarDays />
                  <span>Today’s schedule</span>
                  <strong>{overviewLoading ? '—' : todayEvents.length + todayJobs.length}</strong>
                  <small>{todayEvents.length} events · {todayJobs.length} assignments</small>
                </button>
                {user?.is_admin && <button type="button" onClick={() => setActiveSection('prayer')}>
                  <Bell />
                  <span>Needs review</span>
                  <strong>{loading ? '—' : pendingPrayerCount}</strong>
                  <small>New prayer requests</small>
                </button>}
                <button type="button" onClick={() => setActiveSection('announcement')}>
                  <Megaphone />
                  <span>Home announcement</span>
                  <strong>{announcement?.enabled ? 'Live' : 'Off'}</strong>
                  <small>{announcement?.enabled ? 'Visible on the home page' : 'Not currently displayed'}</small>
                </button>
                {user?.is_admin && <button type="button" onClick={() => setActiveSection('staff')}>
                  <ShieldCheck />
                  <span>Staff access</span>
                  <strong>{roleLoading ? '—' : roleUsers.length}</strong>
                  <small>Authorized accounts</small>
                </button>}
              </div>

              {overviewError && <p className="admin-alert" role="alert">{overviewError}</p>}

              <div className="admin-overview-columns">
                <section className="admin-today-panel">
                  <div className="admin-panel-heading">
                    <div><p>Schedule</p><h3>Today</h3></div>
                    <button type="button" onClick={() => navigate('/events')}>Open calendar <ChevronRight size={16} /></button>
                  </div>
                  {overviewLoading ? <p className="admin-state">Loading today’s schedule...</p> : (
                    todayEvents.length || todayJobs.length ? <div className="admin-today-list">
                      {todayEvents.map(event => <article key={`event-${event.id}`}><CalendarDays /><div><strong>{event.title}</strong><span>{formatDate(event.start_datetime)}</span></div></article>)}
                      {todayJobs.map(job => <article key={`job-${job.id}`}><ClipboardList /><div><strong>{job.title}</strong><span>{job.start_time}{job.location ? ` · ${job.location}` : ''}</span></div></article>)}
                    </div> : <p className="admin-state">Nothing is scheduled for today.</p>
                  )}
                </section>

                <section className="admin-quick-panel">
                  <div className="admin-panel-heading"><div><p>Shortcuts</p><h3>Quick actions</h3></div></div>
                  <div className="admin-quick-actions">
                    <button type="button" onClick={() => navigate('/events')}><CalendarDays /><span><strong>Plan an event</strong><small>Calendar and daily assignments</small></span><ChevronRight /></button>
                    <button type="button" onClick={() => setActiveSection('announcement')}><Megaphone /><span><strong>Update announcement</strong><small>Control the home-page feature</small></span><ChevronRight /></button>
                    <button type="button" onClick={() => navigate('/sermons')}><Video /><span><strong>Manage sermons</strong><small>Review the public sermon page</small></span><ChevronRight /></button>
                    {user?.is_admin && <button type="button" onClick={() => setActiveSection('staff')}><Settings /><span><strong>Manage staff</strong><small>Invitations and permissions</small></span><ChevronRight /></button>}
                  </div>
                </section>
              </div>
            </section>
          )}

          {activeSection === 'announcement' && <section className="admin-announcement-editor" aria-labelledby="announcement-editor-title">
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
          </section>}
          {user?.is_admin && activeSection === 'staff' && <section className="admin-role-section" aria-labelledby="role-management-title">
            <div className="admin-section-heading">
              <p>{t('adminDashboard')}</p>
              <h2 id="role-management-title">{t('roleManagement')}</h2>
              <span>{t('roleManagementIntro')}</span>
            </div>
            <div className="admin-role-content">
              {roleError && <p className="admin-alert" role="alert">{roleError}</p>}
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
              {roleLoading ? <p className="admin-state">Loading users and roles...</p> : (
                <>
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
                            <input type="checkbox" checked={item.is_admin} disabled={item.is_protected || item.id === user?.id || (item.is_admin && user?.username !== 'Boojoo') || roleBusyId === `user-${item.id}`} onChange={event => changeUserRole(item, 'is_admin', event.target.checked)} />
                            <span>{t('administratorRole')}</span>
                          </label>
                          {!item.is_protected && !item.is_admin && item.id !== user?.id && (
                            <button className="admin-user-delete" type="button" disabled={roleBusyId === `user-${item.id}`} onClick={() => deleteRoleUser(item)}>{t('deleteUser')}</button>
                          )}
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
          {activeSection === 'prayer' && <section className="admin-prayer-section" aria-labelledby="prayer-admin-title">
          <h2 id="prayer-admin-title" className="admin-subheading">Public submissions</h2>
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
          <h2 className="admin-subheading">Community announcements</h2>
          {loading ? (
            <p className="admin-state">Loading announcements...</p>
          ) : communityAnnouncements.length === 0 ? (
            <p className="admin-state">No community announcements.</p>
          ) : (
            <div className="admin-prayer-list">
              {communityAnnouncements.map(item => (
                <article className="admin-prayer-card" key={`announcement-${item.id}`}>
                  <div className="admin-prayer-meta">
                    <time dateTime={item.submitted_at || undefined}>{formatDate(item.submitted_at)}</time>
                    <span className={`admin-consent${item.status === 'approved' ? ' admin-consent--yes' : ''}`}>{item.status}</span>
                  </div>
                  <h2>{item.name}</h2>
                  <p>{item.content}</p>
                  <div className="admin-prayer-actions">
                    <label>
                      <span>Review status</span>
                      <select value={item.status} disabled={busyId === `announcement-${item.id}`} onChange={event => updateCommunityAnnouncement(item.id, event.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                    <button type="button" className="admin-delete" disabled={busyId === `announcement-${item.id}`} onClick={() => deleteCommunityAnnouncement(item.id)}>Delete announcement</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          </section>}
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;
