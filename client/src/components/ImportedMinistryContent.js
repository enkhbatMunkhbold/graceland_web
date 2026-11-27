import { useContext, useEffect, useRef, useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { api, apiAssetUrl } from '../services/api';
import UserContext from '../context/UserContext';

const contentCache = new Map();

const resolveDocumentAssetUrls = value => String(value || '').replace(
  /(src=")((?:\/(?:uploads\/|ministry-assets\/))[^"]+)/g,
  (match, prefix, url) => `${prefix}${apiAssetUrl(url)}`,
);

function ImportedMinistryContent({ slug }) {
  const { user } = useContext(UserContext);
  const canPublish = Boolean(user?.is_admin || user?.is_staff);
  const [document, setDocument] = useState(() => contentCache.get(slug) || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (contentCache.has(slug)) return () => { active = false; };

    api.getMinistryPageContent(slug)
      .then(data => {
        const imported = Array.isArray(data.blocks)
          ? data.blocks.find(block => block?.type === 'imported-document' && block.html)
          : null;
        contentCache.set(slug, imported || null);
        if (active) setDocument(imported || null);
      })
      .catch(() => contentCache.set(slug, null));

    return () => { active = false; };
  }, [slug]);

  const publishDocument = async event => {
    event.preventDefault();
    if (!selectedFile) {
      setMessage('Choose a Word or PDF document first.');
      return;
    }
    setPublishing(true);
    setMessage('');
    try {
      const result = await api.importMinistryDocument(slug, selectedFile);
      const imported = result.blocks?.find(block => block?.type === 'imported-document') || null;
      contentCache.set(slug, imported);
      setDocument(imported);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const warningCount = imported?.warnings?.length || 0;
      setMessage(warningCount
        ? `Published with ${warningCount} conversion note${warningCount === 1 ? '' : 's'}.`
        : 'Document converted and published successfully.');
    } catch (error) {
      setMessage(error.message || 'Unable to publish this document.');
    } finally {
      setPublishing(false);
    }
  };

  if (!document && !canPublish) return null;

  return (
    <div className="ministry-imported-document">
      {canPublish && (
        <form className="ministry-publish-panel" onSubmit={publishDocument}>
          <div>
            <FileUp aria-hidden="true" />
            <span>
              <strong>{document ? 'Replace ministry document' : 'Publish ministry document'}</strong>
              <small>Choose a Word (.docx) or PDF file, up to 20 MB.</small>
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            onChange={event => {
              setSelectedFile(event.target.files?.[0] || null);
              setMessage('');
            }}
          />
          <button type="submit" disabled={publishing || !selectedFile}>
            {publishing ? 'Converting...' : document ? 'Replace and publish' : 'Upload and publish'}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
      {document && <div
        className="ministry-imported-content"
        dangerouslySetInnerHTML={{ __html: resolveDocumentAssetUrls(document.html) }}
      />}
      {document?.originalUrl && (
        <a className="ministry-document-download" href={apiAssetUrl(document.originalUrl)} download>
          <Download aria-hidden="true" />
          Download original {document.sourceType?.toUpperCase() || 'document'}
        </a>
      )}
    </div>
  );
}

export default ImportedMinistryContent;
