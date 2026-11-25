import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FileText, FolderOpen, Presentation, Upload } from 'lucide-react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import { createBlockFromUpload, isAllowedUploadFile } from '../utils/ministryFileBlocks';
import { getDocumentEmbedUrl, isFolderUrl, isPresentationUrl } from '../utils/documentEmbed';
import { getVideoEmbedUrl, isDirectVideoUrl } from '../utils/videoEmbed';
import '../styling/ministry-content.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const MinistryGridLayout = WidthProvider(GridLayout);
const GRID_COLUMNS = 12;
const GRID_ROW_HEIGHT = 54;

function defaultBlockLayout(type, blocks, size) {
  const y = blocks.reduce((bottom, block) => {
    const layout = block.layout;
    return layout ? Math.max(bottom, layout.y + layout.h) : bottom;
  }, 0);
  const dimensions = {
    text: { w: 6, h: 3 },
    image: size === 'small' ? { w: 3, h: 3 } : { w: 6, h: 5 },
    video: { w: 6, h: 5 },
    file: { w: 6, h: 2 },
    embed: { w: 8, h: 7 },
  }[type] || { w: 6, h: 3 };
  return { x: 0, y, ...dimensions };
}

function normalizeBlockLayouts(blocks) {
  const normalized = [];
  blocks.forEach((block) => {
    normalized.push({
      ...block,
      layout: block.layout || defaultBlockLayout(block.type, normalized, block.size),
      z: Number.isInteger(block.z) ? block.z : 0,
      ...(block.type === 'image' && !block.crop
        ? { crop: { x: 50, y: 50, zoom: 1 } }
        : {}),
    });
  });
  return normalized;
}

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
  const canManageContent = Boolean(user?.is_admin || user?.is_staff);
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
      const nextBlocks = normalizeBlockLayouts(Array.isArray(data.blocks) ? data.blocks : []);
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
    const base = { id: createBlockId(), type, layout: defaultBlockLayout(type, blocks), z: 0 };
    if (type === 'text') {
      setBlocks((prev) => [...prev, { ...base, content: '' }]);
    } else if (type === 'file' || type === 'embed') {
      setBlocks((prev) => [...prev, { ...base, title: '', url: '' }]);
    } else if (type === 'image') {
      setBlocks((prev) => [...prev, { ...base, url: '', caption: '', crop: { x: 50, y: 50, zoom: 1 } }]);
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

  const updateLayout = (layout) => {
    const byId = new Map(layout.map((item) => [item.i, item]));
    setBlocks((prev) => prev.map((block) => {
      const item = byId.get(block.id);
      if (!item) return block;
      return {
        ...block,
        layout: { x: item.x, y: item.y, w: item.w, h: item.h },
      };
    }));
    setIsEditing(true);
  };

  const changeLayer = (id, direction) => {
    setBlocks((prev) => prev.map((block) => (
      block.id === id
        ? { ...block, z: Math.max(-20, Math.min(20, (block.z || 0) + direction)) }
        : block
    )));
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
    if (!canManageContent) return;

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
        const uploaded = createBlockFromUpload(file, result.url);
        uploadedBlocks.push(uploaded);
      }
      setBlocks((prev) => {
        const next = [...prev];
        uploadedBlocks.forEach((uploaded) => {
          next.push({
            ...uploaded,
            layout: defaultBlockLayout(uploaded.type, next, uploaded.size),
            z: 0,
            ...(uploaded.type === 'image' ? { crop: { x: 50, y: 50, zoom: 1 } } : {}),
          });
        });
        return next;
      });
      setIsEditing(true);
    } catch {
      setError(t('ministryContentUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (event) => {
    if (!canManageContent || uploading) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    if (!canManageContent || uploading) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (event) => {
    if (!canManageContent || uploading) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    if (!canManageContent || uploading) return;
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
      const crop = block.crop || { x: 50, y: 50, zoom: 1 };
      return (
        <figure key={block.id} className="ministry-content-figure">
          <div className="ministry-content-image-crop">
            <img
              src={block.url}
              alt={block.caption || t('ministryContentImageAlt')}
              style={{
                objectPosition: `${crop.x}% ${crop.y}%`,
                transform: `scale(${crop.zoom})`,
              }}
            />
          </div>
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
      const crop = block.crop || { x: 50, y: 50, zoom: 1 };

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
            <div className="ministry-content-preview-crop">
              <img
                className="ministry-content-preview"
                src={block.url}
                alt=""
                style={{
                  objectPosition: `${crop.x}% ${crop.y}%`,
                  transform: `scale(${crop.zoom})`,
                }}
              />
            </div>
          ) : null}
          <div className="ministry-content-crop-controls">
            <label>
              <span>Crop left / right</span>
              <input type="range" min="0" max="100" value={crop.x} onChange={(e) => updateBlock(block.id, { crop: { ...crop, x: Number(e.target.value) } })} />
            </label>
            <label>
              <span>Crop up / down</span>
              <input type="range" min="0" max="100" value={crop.y} onChange={(e) => updateBlock(block.id, { crop: { ...crop, y: Number(e.target.value) } })} />
            </label>
            <label>
              <span>Crop zoom</span>
              <input type="range" min="1" max="3" step="0.05" value={crop.zoom} onChange={(e) => updateBlock(block.id, { crop: { ...crop, zoom: Number(e.target.value) } })} />
            </label>
          </div>
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

  const gridLayout = blocks.map((block) => ({
    i: block.id,
    ...(block.layout || defaultBlockLayout(block.type, blocks, block.size)),
    minW: 1,
    minH: 1,
  }));

  const renderEditableGridBlock = (block) => (
    <div key={block.id} className={`ministry-content-grid-item ministry-content-grid-item--${block.type}`} style={{ zIndex: block.z || 0 }}>
      <div className="ministry-content-grid-toolbar">
        <button type="button" className="ministry-content-drag-handle" aria-label="Move content block">
          Move
        </button>
        <span>{block.type}</span>
        <button type="button" onClick={() => changeLayer(block.id, -1)} aria-label="Send content backward">
          Back
        </button>
        <button type="button" onClick={() => changeLayer(block.id, 1)} aria-label="Bring content forward">
          Front
        </button>
      </div>
      {renderEditBlock(block)}
    </div>
  );

  const renderPublicGridBlock = (block) => {
    const layout = block.layout || defaultBlockLayout(block.type, blocks, block.size);
    return (
      <div
        key={block.id}
        className="ministry-content-public-grid-item"
        style={{
          gridColumn: `${layout.x + 1} / span ${layout.w}`,
          gridRow: `${layout.y + 1} / span ${layout.h}`,
          zIndex: block.z || 0,
        }}
      >
        {renderBlock(block)}
      </div>
    );
  };

  const fieldClassName = [
    'ministry-content-field',
    isCanvas ? 'ministry-content-field--canvas' : '',
    canManageContent && isCanvas ? 'ministry-content-field--droppable' : '',
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

      {canManageContent && isCanvas && (
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

      {isDragOver && canManageContent && (
        <div className="ministry-content-drop-overlay" aria-hidden="true">
          <Upload size={32} />
          <span>{t('ministryContentDropActive')}</span>
        </div>
      )}

      {uploading && (
        <p className="ministry-content-uploading">{t('ministryContentUploading')}</p>
      )}

      {canManageContent && (
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
            blocks.length === 0 ? (
              <p className="ministry-content-empty">{t(isCanvas ? 'ministryContentEmptyPlainAdmin' : 'ministryContentEmptyAdmin')}</p>
            ) : (
              <>
                <p className="ministry-content-layout-help">
                  Move blocks by their handles. Drag any edge or corner to resize. Blocks may overlap; use Back and Front to control which one is on top.
                </p>
                <MinistryGridLayout
                  className="ministry-content-layout-grid"
                  layout={gridLayout}
                  cols={GRID_COLUMNS}
                  rowHeight={GRID_ROW_HEIGHT}
                  margin={[12, 12]}
                  containerPadding={[0, 0]}
                  compactType={null}
                  preventCollision={false}
                  allowOverlap
                  resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
                  draggableHandle=".ministry-content-drag-handle"
                  onDragStop={updateLayout}
                  onResizeStop={updateLayout}
                >
                  {blocks.map(renderEditableGridBlock)}
                </MinistryGridLayout>
              </>
            )
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

      {blocks.length > 0 && !canManageContent && (
        <div className="ministry-content-display ministry-content-public-grid">
          {blocks.map(renderPublicGridBlock)}
        </div>
      )}

      {blocks.length === 0 && isCanvas && (
        <p className="ministry-content-empty ministry-content-empty--canvas">{t('ministryContentCanvasEmpty')}</p>
      )}

      {blocks.length === 0 && !isCanvas && !canManageContent && (
        <p className="ministry-content-empty">{t('ministryContentEmpty')}</p>
      )}
    </div>
  );
}

export default MinistryContentField;
