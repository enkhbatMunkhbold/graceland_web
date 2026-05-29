const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov']);
const EMBED_EXTENSIONS = new Set(['pdf', 'ppt', 'pptx']);

function getExtension(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

export function createBlockFromUpload(file, url) {
  const ext = getExtension(file.name);
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (IMAGE_EXTENSIONS.has(ext)) {
    return { id, type: 'image', url, caption: file.name, size: 'small' };
  }

  if (VIDEO_EXTENSIONS.has(ext)) {
    return { id, type: 'video', url };
  }

  if (EMBED_EXTENSIONS.has(ext)) {
    return { id, type: 'embed', url, title: file.name };
  }

  return { id, type: 'file', url, title: file.name };
}

export function isAllowedUploadFile(file) {
  const ext = getExtension(file.name);
  if (!ext) return false;

  return (
    IMAGE_EXTENSIONS.has(ext) ||
    VIDEO_EXTENSIONS.has(ext) ||
    EMBED_EXTENSIONS.has(ext) ||
    ['doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'csv'].includes(ext)
  );
}
