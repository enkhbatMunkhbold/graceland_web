import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FileText, FolderOpen, Presentation, Upload } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import { createBlockFromUpload, isAllowedUploadFile } from '../utils/ministryFileBlocks';
import { getDocumentEmbedUrl, isFolderUrl, isPresentationUrl } from '../utils/documentEmbed';
import { getVideoEmbedUrl, isDirectVideoUrl } from '../utils/videoEmbed';
import '../styling/ministry-content.css';

function createBlockId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function VideoBlock({ url }) {
  const embedUrl = getVideoEmbedUrl(url);

  if (!embedUrl) return null;

  if (isDirectVideoUrl(embedUrl)) {
    return (
      <div className="ministry-content-video">
        <video controls src={embedUrl} />
      </div>
    );
  }

  return (
    <div className="ministry-content-video">
      <iframe
        src={embedUrl}
        title="Ministry video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function EmbedBlock({ url, title }) {
  const embedUrl = getDocumentEmbedUrl(url);

  if (!embedUrl) return null;

  return (
    <div className="ministry-content-embed">
      {title ? <h3 className="ministry-content-embed-title">{title}</h3> : null}
      <div className="ministry-content-embed-frame">
        <iframe src={embedUrl} title={title || 'Embedded content'} allowFullScreen />
      </div>
    </div>
  );
}

function FileLinkIcon({ url }) {
  if (isFolderUrl(url)) return <FolderOpen size={22} aria-hidden="true" />;
  if (isPresentationUrl(url)) return <Presentation size={22} aria-hidden="true" />;
  return <FileText size={22} aria-hidden="true" />;
}

function MinistryContentField({ slug, variant = 'default' }) {
  const { t } = useLanguage();
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.is_admin);
  const isCanvas = variant === 'canvas' || variant === 'plain';

  const [blocks, setBlocks] = useState([]);
  const [savedBlocks, setSavedBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMinistryPageContent(slug);
      const nextBlocks = Array.isArray(data.blocks) ? data.blocks : [];
      setBlocks(nextBlocks);
      setSavedBlocks(nextBlocks);
    } catch {
      setError(t('ministryContentLoadError'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const addBlock = (type) => {
    const base = { id: createBlockId(), type };
    if (type === 'text') {
      setBlocks((prev) => [...prev, { ...base, content: '' }]);
    } else if (type === 'file' || type === 'embed') {
      setBlocks((prev) => [...prev, { ...base, title: '', url: '' }]);
    } else {
      setBlocks((prev) => [...prev, { ...base, url: '' }]);
    }
    setIsEditing(true);
  };

  const updateBlock = (id, updates) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, ...updates } : block)));
    setIsEditing(true);
  };

  const removeBlock = (id) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api.updateMinistryPageContent(slug, { blocks });
      const nextBlocks = Array.isArray(data.blocks) ? data.blocks : blocks;
      setBlocks(nextBlocks);
      setSavedBlocks(nextBlocks);
      setIsEditing(false);
    } catch {
      setError(t('ministryContentSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBlocks(savedBlocks);
    setIsEditing(false);
    setError('');
  };

  const hasUnsavedChanges = JSON.stringify(blocks) !== JSON.stringify(savedBlocks);

  const handleFiles = async (fileList) => {
    if (!isAdmin) return;

    const files = Array.from(fileList).filter(isAllowedUploadFile);
    if (files.length === 0) {
      setError(t('ministryContentUploadInvalid'));
      return;
    }

    setUploading(true);
    setError('');
    try {
      const uploadedBlocks = [];
      for (const file of files) {
        const result = await api.uploadMinistryFile(slug, file);
        uploadedBlocks.push(createBlockFromUpload(file, result.url));
      }
      setBlocks((prev) => [...prev, ...uploadedBlocks]);
      setIsEditing(true);
    } catch {
      setError(t('ministryContentUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (event) => {
    if (!isAdmin || uploading) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    if (!isAdmin || uploading) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (event) => {
    if (!isAdmin || uploading) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    if (!isAdmin || uploading) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleBrowseFiles = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const renderBlock = (block) => {
    if (block.type === 'text') {
      return (
        <p key={block.id} className="ministry-content-text">
          {block.content}
        </p>
      );
    }

    if (block.type === 'image') {
      return (
        <figure key={block.id} className="ministry-content-figure">
          <img src={block.url} alt={block.caption || t('ministryContentImageAlt')} />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }

    if (block.type === 'video') {
      return <VideoBlock key={block.id} url={block.url} />;
    }

    if (block.type === 'file') {
      return (
        <a
          key={block.id}
          href={block.url}
          className="ministry-content-file"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="ministry-content-file-icon">
            <FileLinkIcon url={block.url} />
          </span>
          <span className="ministry-content-file-label">
            {block.title || block.url}
          </span>
        </a>
      );
    }

    if (block.type === 'embed') {
      return <EmbedBlock key={block.id} url={block.url} title={block.title} />;
    }

    return null;
  };

  const renderEditBlock = (block) => {
    if (block.type === 'text') {
      return (
        <div key={block.id} className="ministry-content-edit-block">
          <label className="ministry-content-edit-label">{t('ministryContentText')}</label>
          <textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            rows={4}
            placeholder={t('ministryContentTextPlaceholder')}
          />
          <button type="button" className="ministry-content-remove" onClick={() => removeBlock(block.id)}>
            {t('ministryContentRemove')}
          </button>
        </div>
      );
    }

    if (block.type === 'image') {
      return (
        <div key={block.id} className="ministry-content-edit-block">
          <label className="ministry-content-edit-label">{t('ministryContentImageUrl')}</label>
          <input
            type="url"
            value={block.url}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            placeholder="https://"
          />
          <label className="ministry-content-edit-label">{t('ministryContentImageCaption')}</label>
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
            placeholder={t('ministryContentImageCaptionPlaceholder')}
          />
          {block.url ? (
            <img className="ministry-content-preview" src={block.url} alt="" />
          ) : null}
          <button type="button" className="ministry-content-remove" onClick={() => removeBlock(block.id)}>
            {t('ministryContentRemove')}
          </button>
        </div>
      );
    }

    if (block.type === 'video') {
      return (
        <div key={block.id} className="ministry-content-edit-block">
          <label className="ministry-content-edit-label">{t('ministryContentVideoUrl')}</label>
          <input
            type="url"
            value={block.url}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            placeholder={t('ministryContentVideoPlaceholder')}
          />
          {block.url ? <VideoBlock url={block.url} /> : null}
          <button type="button" className="ministry-content-remove" onClick={() => removeBlock(block.id)}>
            {t('ministryContentRemove')}
          </button>
        </div>
      );
    }

    if (block.type === 'file') {
      return (
        <div key={block.id} className="ministry-content-edit-block">
          <label className="ministry-content-edit-label">{t('ministryContentFileTitle')}</label>
          <input
            type="text"
            value={block.title || ''}
            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            placeholder={t('ministryContentFileTitlePlaceholder')}
          />
          <label className="ministry-content-edit-label">{t('ministryContentFileUrl')}</label>
          <input
            type="url"
            value={block.url}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            placeholder={t('ministryContentFilePlaceholder')}
          />
          <button type="button" className="ministry-content-remove" onClick={() => removeBlock(block.id)}>
            {t('ministryContentRemove')}
          </button>
        </div>
      );
    }

    if (block.type === 'embed') {
      return (
        <div key={block.id} className="ministry-content-edit-block">
          <label className="ministry-content-edit-label">{t('ministryContentEmbedTitle')}</label>
          <input
            type="text"
            value={block.title || ''}
            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            placeholder={t('ministryContentEmbedTitlePlaceholder')}
          />
          <label className="ministry-content-edit-label">{t('ministryContentEmbedUrl')}</label>
          <input
            type="url"
            value={block.url}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            placeholder={t('ministryContentEmbedPlaceholder')}
          />
          {block.url ? <EmbedBlock url={block.url} title={block.title} /> : null}
          <button type="button" className="ministry-content-remove" onClick={() => removeBlock(block.id)}>
            {t('ministryContentRemove')}
          </button>
        </div>
      );
    }

    return null;
  };

  const fieldClassName = [
    'ministry-content-field',
    isCanvas ? 'ministry-content-field--canvas' : '',
    isAdmin && isCanvas ? 'ministry-content-field--droppable' : '',
    isDragOver ? 'ministry-content-field--drag-over' : '',
    uploading ? 'ministry-content-field--uploading' : '',
  ].filter(Boolean).join(' ');

  const adminClassName = [
    'ministry-content-admin',
    isCanvas ? 'ministry-content-admin--canvas' : '',
  ].filter(Boolean).join(' ');

  if (loading) {
    return <p className="ministry-content-status">{t('ministryContentLoading')}</p>;
  }

  return (
    <div
      className={fieldClassName}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="ministry-content-file-input"
        multiple
        accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.ogg,.mov,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
        onChange={handleBrowseFiles}
      />

      {isAdmin && isCanvas && (
        <div className="ministry-content-drop-hint">
          <Upload size={18} aria-hidden="true" />
          <span>{t('ministryContentDropHint')}</span>
          <button
            type="button"
            className="ministry-content-browse-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {t('ministryContentBrowseFiles')}
          </button>
        </div>
      )}

      {isDragOver && isAdmin && (
        <div className="ministry-content-drop-overlay" aria-hidden="true">
          <Upload size={32} />
          <span>{t('ministryContentDropActive')}</span>
        </div>
      )}

      {uploading && (
        <p className="ministry-content-uploading">{t('ministryContentUploading')}</p>
      )}

      {isAdmin && (
        <div className={adminClassName}>
          <div className="ministry-content-admin-toolbar">
            <button type="button" onClick={() => addBlock('text')}>
              {t('ministryContentAddText')}
            </button>
            <button type="button" onClick={() => addBlock('image')}>
              {t('ministryContentAddImage')}
            </button>
            <button type="button" onClick={() => addBlock('video')}>
              {t('ministryContentAddVideo')}
            </button>
            <button type="button" onClick={() => addBlock('file')}>
              {t('ministryContentAddFile')}
            </button>
            <button type="button" onClick={() => addBlock('embed')}>
              {t('ministryContentAddEmbed')}
            </button>
          </div>

          {(isEditing || blocks.length > 0) && (
            <div className="ministry-content-edit-list">
              {blocks.length === 0 ? (
                <p className="ministry-content-empty">{t(isCanvas ? 'ministryContentEmptyPlainAdmin' : 'ministryContentEmptyAdmin')}</p>
              ) : (
                blocks.map(renderEditBlock)
              )}
            </div>
          )}

          {(isEditing || hasUnsavedChanges) && (
            <div className="ministry-content-actions">
              <button type="button" className="ministry-content-save" onClick={handleSave} disabled={saving}>
                {saving ? t('ministryContentSaving') : t('ministryContentSave')}
              </button>
              <button type="button" className="ministry-content-cancel" onClick={handleCancel} disabled={saving}>
                {t('ministryContentCancel')}
              </button>
            </div>
          )}
        </div>
      )}

      {error ? <p className="ministry-content-error">{error}</p> : null}

      {blocks.length > 0 && !isAdmin && (
        <div className="ministry-content-display">{blocks.map(renderBlock)}</div>
      )}

      {blocks.length === 0 && isCanvas && (
        <p className="ministry-content-empty ministry-content-empty--canvas">{t('ministryContentCanvasEmpty')}</p>
      )}

      {blocks.length === 0 && !isCanvas && !isAdmin && (
        <p className="ministry-content-empty">{t('ministryContentEmpty')}</p>
      )}
    </div>
  );
}

export default MinistryContentField;
