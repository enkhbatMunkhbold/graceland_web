import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
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
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

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
    loadRequests();
  }, [loadRequests]);

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
          <h1>{t('adminPrayerTitle')}</h1>
          <span>{t('adminPrayerIntro')}</span>
        </div>
      </header>
      <section className="admin-section">
        <div className="admin-shell">
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
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;
