import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import Events from './Events';

describe('Events Google Calendar integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('merges local and read-only Google events while keeping admin controls for local events', async () => {
    const start = new Date();
    start.setHours(18, 30, 0, 0);
    const end = new Date(start);
    end.setHours(20, 0, 0, 0);
    const dateKey = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, '0'),
      String(start.getDate()).padStart(2, '0'),
    ].join('-');
    const event = {
      id: 'google-event-1',
      title: 'Google Calendar Fellowship',
      description: 'Dinner and fellowship from Google Calendar.',
      start_datetime: `${dateKey}T18:30:00`,
      end_datetime: `${dateKey}T20:00:00`,
      location: 'Graceland Bible Church',
      isGoogleCalendar: true,
      isReadOnly: true,
      isAllDay: false,
    };
    const localEvent = {
      id: 42,
      title: 'Local Church Event',
      description: 'Managed in the local database.',
      start_datetime: `${dateKey}T10:00:00`,
      end_datetime: null,
      location: 'Community Room',
    };
    jest.spyOn(api, 'getGoogleCalendarEvents').mockResolvedValue([event]);
    jest.spyOn(api, 'getEvents').mockResolvedValue([localEvent]);

    render(
      <LanguageProvider>
        <UserContext.Provider value={{ user: { is_admin: true } }}>
          <Events />
        </UserContext.Provider>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(event.title).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('6:30 PM').length).toBeGreaterThan(0);
    expect(screen.getAllByText(localEvent.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(event.description).length).toBeGreaterThan(0);
    expect(api.getEvents).toHaveBeenCalled();
    expect(api.getGoogleCalendarEvents).toHaveBeenCalledWith(
      start.getFullYear(),
      start.getMonth() + 1
    );
    expect(screen.getByRole('button', { name: /add event/i })).not.toBeNull();
    expect(screen.getAllByRole('button', { name: /edit event/i })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: /upcoming events/i })).toBeNull();
    expect(screen.queryByText('Sunday Service')).toBeNull();
  });
});
