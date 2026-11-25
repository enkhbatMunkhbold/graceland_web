import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import MinistryContentField from './MinistryContentField';

jest.mock('../services/api', () => ({
  api: {
    getMinistryPageContent: jest.fn(),
    updateMinistryPageContent: jest.fn(),
    uploadMinistryFile: jest.fn(),
  },
}));

describe('MinistryContentField staff editing', () => {
  beforeEach(() => {
    api.getMinistryPageContent.mockResolvedValue({ slug: 'men', blocks: [] });
    api.updateMinistryPageContent.mockImplementation((slug, data) =>
      Promise.resolve({ slug, blocks: data.blocks })
    );
  });

  afterEach(() => jest.clearAllMocks());

  test('lets staff add and save text on a ministry page', async () => {
    render(
      <LanguageProvider>
        <UserContext.Provider value={{ user: { is_admin: false, is_staff: true } }}>
          <MinistryContentField slug="men" variant="canvas" />
        </UserContext.Provider>
      </LanguageProvider>
    );

    expect(await screen.findByRole('button', { name: 'Add text' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Browse files' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    fireEvent.change(screen.getByPlaceholderText('Write a paragraph…'), {
      target: { value: 'Men supporting one another in faith.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save content' }));

    await waitFor(() => expect(api.updateMinistryPageContent).toHaveBeenCalledWith(
      'men',
      { blocks: [expect.objectContaining({ type: 'text', content: 'Men supporting one another in faith.' })] }
    ));
  });

  test('lets staff crop, layer, move, and resize image content', async () => {
    api.getMinistryPageContent.mockResolvedValue({
      slug: 'men',
      blocks: [{
        id: 'photo',
        type: 'image',
        url: '/uploads/photo.jpg',
        caption: '',
        layout: { x: 0, y: 0, w: 6, h: 5 },
        crop: { x: 50, y: 50, zoom: 1 },
        z: 0,
      }],
    });

    render(
      <LanguageProvider>
        <UserContext.Provider value={{ user: { is_admin: false, is_staff: true } }}>
          <MinistryContentField slug="men" variant="canvas" />
        </UserContext.Provider>
      </LanguageProvider>
    );

    expect(await screen.findByRole('button', { name: 'Move content block' })).not.toBeNull();
    fireEvent.change(screen.getByRole('slider', { name: 'Crop left / right' }), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bring content forward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save content' }));

    await waitFor(() => expect(api.updateMinistryPageContent).toHaveBeenCalledWith(
      'men',
      { blocks: [expect.objectContaining({
        type: 'image',
        crop: { x: 25, y: 50, zoom: 1 },
        z: 1,
        layout: { x: 0, y: 0, w: 6, h: 5 },
      })] }
    ));
  });
});
