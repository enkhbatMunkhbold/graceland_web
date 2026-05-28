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