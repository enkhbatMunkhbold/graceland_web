const API_BASE_URL = 'http://localhost:5555';

export const api = {
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
    const params = new URLSearchParams({ limit: '9' });
    if (query.trim()) params.set('q', query.trim());
    const response = await fetch(`${API_BASE_URL}/youtube/videos?${params}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Latest videos are temporarily unavailable.');
    const data = await response.json();
    return (data.videos || []).slice(0, 9);
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

  signup: async (username, email, password) => {
    const response = await fetch(`${API_BASE_URL}/sign_up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Signup failed');
    return response.json();
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
