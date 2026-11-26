import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/ministry-content.css';

const EMPTY_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] };
const MAX_IMAGE_DIMENSION = 360;
const IMAGE_COMPRESSION_QUALITY = 0.72;

async function prepareImageForUpload(file) {
  if (!file || file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  if (Math.max(bitmap.width, bitmap.height) <= MAX_IMAGE_DIMENSION && file.size <= 250 * 1024) {
    bitmap.close?.();
    return file;
  }
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, IMAGE_COMPRESSION_QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'ministry-image';
  const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `${baseName}.${extension}`, { type: outputType, lastModified: file.lastModified });
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({ 'data-align': attributes.align || 'center' }),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width') ? Number(element.getAttribute('width')) : null,
        renderHTML: (attributes) => attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height') ? Number(element.getAttribute('height')) : null,
        renderHTML: (attributes) => attributes.height ? { height: attributes.height } : {},
      },
    };
  },
}).configure({
  HTMLAttributes: { class: 'ministry-document-image' },
  resize: {
    enabled: true,
    directions: ['top', 'right', 'bottom', 'left', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
    minWidth: 80,
    minHeight: 60,
    alwaysPreserveAspectRatio: false,
  },
});

function textNode(text) {
  return text ? [{ type: 'text', text }] : undefined;
}

function legacyBlocksToDocument(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return EMPTY_DOCUMENT;
  const savedDocument = blocks.find((block) => block.type === 'document' && block.content?.type === 'doc');
  if (savedDocument) return savedDocument.content;

  const content = [];
  blocks.forEach((block) => {
    if (block.type === 'text') {
      String(block.content || '').split('\n').forEach((line) => {
        content.push({ type: 'paragraph', content: textNode(line) });
      });
      return;
    }
    if (block.type === 'image' && block.url) {
      content.push({
        type: 'image',
        attrs: {
          src: block.url,
          alt: block.caption || '',
          title: block.caption || '',
          width: null,
          height: null,
          align: 'center',
        },
      });
      if (block.caption) content.push({ type: 'paragraph', content: textNode(block.caption) });
      return;
    }
    if (block.url) {
      const label = block.title || (block.type === 'video' ? 'Video' : 'Open attachment');
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: label, marks: [{ type: 'link', attrs: { href: block.url, target: '_blank', rel: 'noopener noreferrer nofollow', class: null } }] }],
      });
    }
  });
  return { type: 'doc', content: content.length ? content : EMPTY_DOCUMENT.content };
}

function ToolbarButton({ active = false, children, disabled = false, onClick, title }) {
  return (
    <button
      type="button"
      className={active ? 'is-active' : ''}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function MinistryDocumentSurface({ content, editable, onChange, onUpload, uploadBusy }) {
  const imageInputRef = useRef(null);

  const extensions = useMemo(() => [
    StarterKit.configure({ link: { openOnClick: !editable } }),
    ResizableImage,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: 'Start writing this ministry page…' }),
  ], [editable]);

  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: nextEditor }) => onChange?.(nextEditor.getJSON()),
    editorProps: {
      attributes: {
        class: `ministry-document-page${editable ? ' ministry-document-page--editing' : ''}`,
        role: 'textbox',
        'aria-label': editable ? 'Ministry document editor' : 'Ministry document',
        'aria-readonly': editable ? 'false' : 'true',
        spellcheck: 'true',
      },
    },
  }, [editable]);

  useEffect(() => {
    if (!editor || !content) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current !== incoming) editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return <p className="ministry-content-status">Loading editor…</p>;

  const setLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const href = window.prompt('Link address', previous);
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
  };

  const addImageUrl = () => {
    const src = window.prompt('Image address');
    if (src?.trim()) editor.chain().focus().setImage({ src: src.trim(), alt: '', title: '' }).run();
  };

  const editImageDescription = () => {
    const attrs = editor.getAttributes('image');
    const description = window.prompt('Image description or caption', attrs.alt || '');
    if (description !== null) {
      editor.chain().focus().updateAttributes('image', { alt: description, title: description }).run();
    }
  };

  const imageSelected = editor.isActive('image');
  const selectedImage = imageSelected ? editor.getAttributes('image') : {};

  const handleImagePaste = (event) => {
    if (!editable) return;
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    onUpload(files, editor);
  };

  const handleImageDrop = (event) => {
    if (!editable) return;
    const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    onUpload(files, editor);
  };

  return (
    <div className="ministry-document-editor" onPasteCapture={handleImagePaste} onDropCapture={handleImageDrop}>
      {editable && (
        <>
          <div className="ministry-document-toolbar" role="toolbar" aria-label="Document formatting">
            <select
              aria-label="Text style"
              value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'p') editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) }).run();
              }}
            >
              <option value="p">Normal text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">Bold</ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">Italic</ToolbarButton>
            <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">Strike</ToolbarButton>
            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bulleted list">Bullets</ToolbarButton>
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">Numbers</ToolbarButton>
            <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Add or edit link">Link</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>Left</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>Center</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>Right</ToolbarButton>
            <ToolbarButton onClick={() => imageInputRef.current?.click()} disabled={uploadBusy}>Upload image</ToolbarButton>
            <ToolbarButton onClick={addImageUrl}>Image URL</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>Undo</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>Redo</ToolbarButton>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            hidden
            onChange={(event) => {
              onUpload(Array.from(event.target.files || []), editor);
              event.target.value = '';
            }}
          />
          {imageSelected && (
            <div className="ministry-document-image-toolbar" role="toolbar" aria-label="Selected image controls">
              <span>Selected image:</span>
              <ToolbarButton onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}>Align left</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}>Center</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}>Align right</ToolbarButton>
              <ToolbarButton onClick={editImageDescription}>Description</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteSelection().run()}>Remove image</ToolbarButton>
              <label>
                <span>Width</span>
                <input
                  aria-label="Image width"
                  type="range"
                  min="80"
                  max="900"
                  value={selectedImage.width || 600}
                  onChange={(event) => editor.chain().focus().updateAttributes('image', { width: Number(event.target.value) }).run()}
                />
              </label>
              <label>
                <span>Height</span>
                <input
                  aria-label="Image height"
                  type="range"
                  min="60"
                  max="900"
                  value={selectedImage.height || 400}
                  onChange={(event) => editor.chain().focus().updateAttributes('image', { height: Number(event.target.value) }).run()}
                />
              </label>
              <small>Use width and height independently to resize or reshape the image.</small>
            </div>
          )}
          <p className="ministry-document-paste-help">
            Paste text or an image with Ctrl+V / Cmd+V. You can also drag image files directly onto the page.
          </p>
        </>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function MinistryContentField({ slug }) {
  const { t } = useLanguage();
  const { user } = useContext(UserContext);
  const canManageContent = Boolean(user?.is_admin || user?.is_staff);
  const [documentContent, setDocumentContent] = useState(EMPTY_DOCUMENT);
  const [savedContent, setSavedContent] = useState(EMPTY_DOCUMENT);
  const currentContentRef = useRef(EMPTY_DOCUMENT);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMinistryPageContent(slug);
      const nextContent = legacyBlocksToDocument(data.blocks);
      currentContentRef.current = nextContent;
      setDocumentContent(nextContent);
      setSavedContent(nextContent);
      setHasChanges(false);
    } catch {
      setError(t('ministryContentLoadError'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const uploadImages = useCallback(async (files, editor) => {
    const images = files.filter((file) => file?.type?.startsWith('image/'));
    if (!images.length || !editor) return;
    setUploading(true);
    setError('');
    try {
      const uploads = await Promise.all(images.map(async (file) => {
        let uploadFile = file;
        try {
          uploadFile = await prepareImageForUpload(file);
        } catch {
          // Older browsers may not support image decoding; upload the original.
        }
        const result = await api.uploadMinistryFile(slug, uploadFile);
        return { result, file };
      }));
      uploads.forEach(({ result, file }) => {
        editor.chain().focus().setImage({
          src: result.url,
          alt: file.name,
          title: file.name,
        }).run();
      });
    } catch {
      setError(t('ministryContentUploadError'));
    } finally {
      setUploading(false);
    }
  }, [slug, t]);

  const handleDocumentChange = useCallback((nextContent) => {
    currentContentRef.current = nextContent;
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const blocks = [{ id: 'document', type: 'document', content: currentContentRef.current }];
      const data = await api.updateMinistryPageContent(slug, { blocks });
      const nextContent = legacyBlocksToDocument(data.blocks);
      currentContentRef.current = nextContent;
      setDocumentContent(nextContent);
      setSavedContent(nextContent);
      setHasChanges(false);
    } catch {
      setError(t('ministryContentSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="ministry-content-status">{t('ministryContentLoading')}</p>;

  return (
    <div className="ministry-content-field ministry-content-field--canvas">
      {canManageContent && (
        <div className="ministry-document-admin-heading">
          <div>
            <strong>Ministry document</strong>
            <span>Edit this page like a document, then save it for public visitors.</span>
          </div>
          <div className="ministry-content-actions">
            <button type="button" className="ministry-content-save" onClick={handleSave} disabled={saving || uploading || !hasChanges}>
              {saving ? t('ministryContentSaving') : t('ministryContentSave')}
            </button>
            <button type="button" className="ministry-content-cancel" onClick={() => {
              currentContentRef.current = savedContent;
              setDocumentContent(JSON.parse(JSON.stringify(savedContent)));
              setHasChanges(false);
            }} disabled={saving || !hasChanges}>
              {t('ministryContentCancel')}
            </button>
          </div>
        </div>
      )}
      {uploading && <p className="ministry-content-uploading">{t('ministryContentUploading')}</p>}
      {error && <p className="ministry-content-error">{error}</p>}
      <MinistryDocumentSurface
        key={`${slug}-${canManageContent ? 'edit' : 'read'}`}
        content={documentContent}
        editable={canManageContent}
        onChange={handleDocumentChange}
        onUpload={uploadImages}
        uploadBusy={uploading}
      />
    </div>
  );
}

export default MinistryContentField;
