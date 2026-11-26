import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../services/api';

const contentCache = new Map();

function ImportedMinistryContent({ slug, children }) {
  const [document, setDocument] = useState(() => contentCache.get(slug) || null);

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

  if (!document) return children;

  return (
    <div className="ministry-imported-document">
      <div
        className="ministry-imported-content"
        dangerouslySetInnerHTML={{ __html: document.html }}
      />
      {document.originalUrl && (
        <a className="ministry-document-download" href={document.originalUrl} download>
          <Download aria-hidden="true" />
          Download original {document.sourceType?.toUpperCase() || 'document'}
        </a>
      )}
    </div>
  );
}

export default ImportedMinistryContent;
