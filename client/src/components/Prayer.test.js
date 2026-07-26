import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Prayer from './Prayer';
import { api } from '../services/api';

jest.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: key => key, language: 'en' }),
}));

jest.mock('../services/api', () => ({
  api: {
    getPrayerWall: jest.fn(),
    submitPrayerRequest: jest.fn(),
  },
}));

describe('Prayer', () => {
  beforeEach(() => {
    api.getPrayerWall.mockResolvedValue([]);
    api.submitPrayerRequest.mockResolvedValue({
      message: 'Prayer request submitted successfully',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('submits an anonymous request privately by default', async () => {
    render(<Prayer />);
    await waitFor(() => expect(api.getPrayerWall).toHaveBeenCalled());

    const consent = screen.getByLabelText('prayerPublicationConsent');
    expect(consent.checked).toBe(false);

    fireEvent.change(screen.getByLabelText('prayerRequestLabel'), {
      target: { value: '  Please pray for peace.  ' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: 'submitPrayerRequest',
    }));

    await waitFor(() => expect(api.submitPrayerRequest).toHaveBeenCalledWith({
      name: '',
      request_text: 'Please pray for peace.',
      publication_consent: false,
    }));
  });

  test('submits a trimmed name with explicit publication consent', async () => {
    render(<Prayer />);
    await waitFor(() => expect(api.getPrayerWall).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('prayerName'), {
      target: { value: '  Grace  ' },
    });
    fireEvent.change(screen.getByLabelText('prayerRequestLabel'), {
      target: { value: 'Please pray for my family.' },
    });
    fireEvent.click(screen.getByLabelText('prayerPublicationConsent'));
    fireEvent.click(screen.getByRole('button', {
      name: 'submitPrayerRequest',
    }));

    await waitFor(() => expect(api.submitPrayerRequest).toHaveBeenCalledWith({
      name: 'Grace',
      request_text: 'Please pray for my family.',
      publication_consent: true,
    }));
  });
});
