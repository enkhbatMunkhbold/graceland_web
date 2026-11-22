const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL
  || (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5555')
).replace(/\/+$/, '');
let latestYouTubeVideosCache = null;
let latestYouTubeVideosCachedAt = 0;
let latestYouTubeVideosRequest = null;
const LATEST_YOUTUBE_VIDEOS_CACHE_TTL = 30 * 1000;

export const api = {
  getHomeAnnouncement: async () => {
    const response = await fetch(`${API_BASE_URL}/home-announcement`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load the home announcement');
    return response.json();
  },

  getMemberAnnouncements: async () => {
    const response = await fetch(`${API_BASE_URL}/announcements`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load member announcements');
    return response.json();
  },

  createMemberAnnouncement: async data => {
    const response = await fetch(`${API_BASE_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to post the announcement');
    }
    return response.json();
  },

  updateMemberAnnouncement: async (id, content, ownerToken) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Announcement-Owner-Token': ownerToken,
      },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update the announcement');
    }
    return response.json();
  },

  deleteMemberAnnouncement: async (id, ownerToken) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: 'DELETE',
      headers: { 'X-Announcement-Owner-Token': ownerToken },
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete the announcement');
    }
    return response.json();
  },

  updateHomeAnnouncement: async data => {
    const response = await fetch(`${API_BASE_URL}/home-announcement`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save the home announcement');
    }
    return response.json();
  },

  uploadHomeAnnouncementFile: async file => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/home-announcement/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to upload the announcement file');
    }
    return response.json();
  },

  getSiteTextOverrides: async (pagePath, language) => {
    const params = new URLSearchParams({ page_path: pagePath, language });
    const response = await fetch(`${API_BASE_URL}/site-text-overrides?${params}`);
    if (!response.ok) throw new Error('Failed to load editable site text');
    return response.json();
  },

  updateSiteTextOverride: async (data) => {
    const response = await fetch(`${API_BASE_URL}/site-text-overrides`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save site text');
    }
    return response.json();
  },

  // Events
  getEvents: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/events${query ? `?${query}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  getEventById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  },

  getGoogleCalendarEvents: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const query = params.toString();
    const response = await fetch(
      `${API_BASE_URL}/google-calendar/events${query ? `?${query}` : ''}`
    );
    if (!response.ok) throw new Error('Calendar events are temporarily unavailable.');
    const data = await response.json();
    return data.events || [];
  },

  getDailyJobs: async (date) => {
    const params = new URLSearchParams({ date });
    const response = await fetch(`${API_BASE_URL}/daily-jobs?${params}`);
    if (!response.ok) throw new Error('Failed to load today’s jobs.');
    return response.json();
  },

  createDailyJob: async (data) => {
    const response = await fetch(`${API_BASE_URL}/daily-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create job.');
    }
    return response.json();
  },

  updateDailyJob: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/daily-jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update job.');
    }
    return response.json();
  },

  deleteDailyJob: async (id) => {
    const response = await fetch(`${API_BASE_URL}/daily-jobs/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete job.');
    }
  },

  createEvent: async (data) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create event');
    }
    return response.json();
  },

  updateEvent: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update event');
    }
    return response.json();
  },

  deleteEvent: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete event');
    }
    return response.json();
  },

  registerForEvent: async (eventId, data) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to register for event');
    return response.json();
  },

  // Sermons
  getSermons: async () => {
    const response = await fetch(`${API_BASE_URL}/sermons`);
    if (!response.ok) throw new Error('Failed to fetch sermons');
    return response.json();
  },

  getSermonById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/sermons/${id}`);
    if (!response.ok) throw new Error('Failed to fetch sermon');
    return response.json();
  },

  getLatestYouTubeVideos: async (query = '') => {
    const normalizedQuery = query.trim();
    const cacheIsFresh = Date.now() - latestYouTubeVideosCachedAt < LATEST_YOUTUBE_VIDEOS_CACHE_TTL;
    if (!normalizedQuery && latestYouTubeVideosCache && cacheIsFresh) {
      return latestYouTubeVideosCache;
    }
    if (!normalizedQuery && latestYouTubeVideosRequest) {
      return latestYouTubeVideosRequest;
    }

    const loadVideos = async () => {
      const params = new URLSearchParams({ limit: '9' });
      if (normalizedQuery) params.set('q', normalizedQuery);
      const response = await fetch(`${API_BASE_URL}/youtube/videos?${params}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Latest videos are temporarily unavailable.');
      const data = await response.json();
      return (data.videos || []).slice(0, 9);
    };

    if (normalizedQuery) return loadVideos();

    latestYouTubeVideosRequest = loadVideos()
      .then(videos => {
        latestYouTubeVideosCache = videos;
        latestYouTubeVideosCachedAt = Date.now();
        return videos;
      })
      .finally(() => {
        latestYouTubeVideosRequest = null;
      });
    return latestYouTubeVideosRequest;
  },

  // Ministries
  getMinistries: async () => {
    const response = await fetch(`${API_BASE_URL}/ministries`);
    if (!response.ok) throw new Error('Failed to fetch ministries');
    return response.json();
  },

  getMinistryById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ministries/${id}`);
    if (!response.ok) throw new Error('Failed to fetch ministry');
    return response.json();
  },

  getMinistryPageContent: async (slug) => {
    const response = await fetch(`${API_BASE_URL}/ministry-pages/${slug}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch ministry page content');
    return response.json();
  },

  updateMinistryPageContent: async (slug, data) => {
    const response = await fetch(`${API_BASE_URL}/ministry-pages/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update ministry page content');
    }
    return response.json();
  },

  uploadMinistryFile: async (slug, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/ministry-pages/${slug}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload file');
    }
    return response.json();
  },

  // Groups
  getGroups: async () => {
    const response = await fetch(`${API_BASE_URL}/groups`);
    if (!response.ok) throw new Error('Failed to fetch groups');
    return response.json();
  },

  // Contact
  submitContact: async (data) => {
    const response = await fetch(`${API_BASE_URL}/contact_messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  submitFeedback: async (data) => {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit feedback');
    }
    return response.json();
  },

  // Prayer requests. publication_consent is permission for staff review only;
  // it never makes a request public without approved_public status.
  submitPrayerRequest: async (data) => {
    const response = await fetch(`${API_BASE_URL}/prayer-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit prayer request');
    }
    return response.json();
  },

  getPrayerWall: async () => {
    const response = await fetch(`${API_BASE_URL}/prayer-wall`);
    if (!response.ok) throw new Error('Failed to load prayer wall');
    return response.json();
  },

  updatePublicPrayerRequest: async (id, requestText, ownerToken) => {
    const response = await fetch(`${API_BASE_URL}/prayer-requests/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Prayer-Owner-Token': ownerToken,
      },
      credentials: 'include',
      body: JSON.stringify({ request_text: requestText }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update prayer request');
    }
    return response.json();
  },

  deletePublicPrayerRequest: async (id, ownerToken) => {
    const response = await fetch(`${API_BASE_URL}/prayer-requests/${id}`, {
      method: 'DELETE',
      headers: { 'X-Prayer-Owner-Token': ownerToken },
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete prayer request');
    }
    return response.json();
  },

  getAdminPrayerRequests: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/prayer-requests`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to load prayer requests');
    return response.json();
  },

  updatePrayerRequestStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/admin/prayer-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update prayer request');
    }
    return response.json();
  },

  deletePrayerRequest: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/prayer-requests/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete prayer request');
    }
    return response.json();
  },

  getMyStaffRequest: async () => {
    const response = await fetch(`${API_BASE_URL}/role-requests/staff`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to load staff request');
    return response.json();
  },

  requestStaffAccess: async () => {
    const response = await fetch(`${API_BASE_URL}/role-requests/staff`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to request staff access');
    }
    return response.json();
  },

  getRoleRequests: async (status = 'pending') => {
    const response = await fetch(`${API_BASE_URL}/admin/role-requests?status=${encodeURIComponent(status)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to load role requests');
    return response.json();
  },

  reviewRoleRequest: async (id, decision) => {
    const response = await fetch(`${API_BASE_URL}/admin/role-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ decision }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to review role request');
    }
    return response.json();
  },

  getRoleUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to load users');
    return response.json();
  },

  updateUserRoles: async (id, roles) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(roles),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update user roles');
    }
    return response.json();
  },

  getRoleAudit: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/role-audit`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to load role audit');
    return response.json();
  },

  // Auth
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  signup: async (username, email, password, inviteToken) => {
    const response = await fetch(`${API_BASE_URL}/sign_up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, invite_token: inviteToken }),
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Signup failed');
    return response.json();
  },

  createSignupInvite: async (expiresInDays = 7) => {
    const response = await fetch(`${API_BASE_URL}/admin/signup-invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ expires_in_days: expiresInDays }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create signup invitation');
    }
    return response.json();
  },

  requestPasswordReset: async username => {
    const response = await fetch(`${API_BASE_URL}/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Password recovery is unavailable');
    return data;
  },

  confirmPasswordReset: async (username, code, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, code, new_password: newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Invalid or expired recovery code');
    return data;
  },

  checkSession: async () => {
    const response = await fetch(`${API_BASE_URL}/check_session`, {
      credentials: 'include'
    });
    if (!response.ok) return null;
    return response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Logout failed');
    return response.json();
  }
};
