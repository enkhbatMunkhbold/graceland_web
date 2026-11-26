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

function renderEditor(user = { is_admin: false, is_staff: true }) {
  return render(
    <LanguageProvider>
      <UserContext.Provider value={{ user }}>
        <MinistryContentField slug="men" />
      </UserContext.Provider>
    </LanguageProvider>
  );
}

describe('Ministry document editing', () => {
  beforeEach(() => {
    api.getMinistryPageContent.mockResolvedValue({ slug: 'men', blocks: [] });
    api.updateMinistryPageContent.mockImplementation((slug, data) =>
      Promise.resolve({ slug, blocks: data.blocks })
    );
    api.uploadMinistryFile.mockResolvedValue({ url: '/uploads/ministry/men/pasted.jpg' });
  });

  afterEach(() => jest.clearAllMocks());

  test('lets staff format document content and save it', async () => {
    renderEditor();

    await screen.findByRole('textbox');
    fireEvent.change(screen.getByRole('combobox', { name: 'Text style' }), {
      target: { value: 'h2' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save content' }).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Save content' }));

    await waitFor(() => expect(api.updateMinistryPageContent).toHaveBeenCalledWith(
      'men',
      { blocks: [expect.objectContaining({
        id: 'document',
        type: 'document',
        content: expect.objectContaining({ type: 'doc' }),
      })] }
    ));
  });

  test('uploads an image pasted from the clipboard into the document', async () => {
    const { container } = renderEditor();
    const editor = await screen.findByRole('textbox');
    const file = new File(['image-bytes'], 'clipboard.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
      },
    });

    await waitFor(() => expect(api.uploadMinistryFile).toHaveBeenCalledWith('men', file));
    await waitFor(() => expect(container.querySelector('.ministry-document-page img')).not.toBeNull());
  });

  test('renders public ministry documents without editing controls', async () => {
    api.getMinistryPageContent.mockResolvedValue({
      slug: 'men',
      blocks: [{
        id: 'document',
        type: 'document',
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Public ministry news' }] }],
        },
      }],
    });

    renderEditor(null);

    expect(await screen.findByText('Public ministry news')).not.toBeNull();
    expect(screen.queryByRole('toolbar', { name: 'Document formatting' })).toBeNull();
  });
});
