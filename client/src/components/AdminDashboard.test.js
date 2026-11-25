import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import AdminDashboard from './AdminDashboard';

jest.mock('../services/api', () => ({
  api: {
    getAdminPrayerRequests: jest.fn(),
    getAdminAnnouncements: jest.fn(),
    getRoleUsers: jest.fn(),
    getRoleAudit: jest.fn(),
    getHomeAnnouncement: jest.fn(),
    getEvents: jest.fn(),
    getDailyJobs: jest.fn(),
  },
}));

describe('AdminDashboard operations workspace', () => {
  beforeEach(() => {
    api.getAdminPrayerRequests.mockResolvedValue([
      { id: 1, status: 'new', request_text: 'Please pray', publication_consent: false },
    ]);
    api.getAdminAnnouncements.mockResolvedValue([]);
    api.getRoleUsers.mockResolvedValue([
      { id: 1, username: 'admin', email: 'admin@example.com', is_admin: true },
    ]);
    api.getRoleAudit.mockResolvedValue([]);
    api.getHomeAnnouncement.mockResolvedValue({ enabled: true, mediaUrl: '', type: 'image' });
    api.getEvents.mockResolvedValue([]);
    api.getDailyJobs.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  test('shows the operational overview and opens focused management sections', async () => {
    render(
      <LanguageProvider>
        <UserContext.Provider value={{ user: { id: 1, username: 'admin', is_admin: true, is_staff: true } }}>
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>
        </UserContext.Provider>
      </LanguageProvider>
    );

    expect(screen.getByRole('heading', { name: 'Church operations' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Today at a glance' })).not.toBeNull();
    await waitFor(() => expect(screen.getByText('Live')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Announcement/ }));
    expect(screen.getByRole('heading', { name: 'Official church announcement' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Public submissions/ }));
    expect(screen.getByRole('heading', { name: 'Public submissions' })).not.toBeNull();
    expect(await screen.findByText('Please pray')).not.toBeNull();
  });
});
