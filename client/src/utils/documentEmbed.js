function isGoogleDriveUrl(url) {
  return /drive\.google\.com/i.test(url);
}

function isGoogleSlidesUrl(url) {
  return /docs\.google\.com\/presentation/i.test(url);
}

export function getDocumentEmbedUrl(url) {
  if (!url) return null;

  const trimmed = url.trim();

  try {
    if (isGoogleSlidesUrl(trimmed)) {
      const embedUrl = trimmed.replace('/edit', '/embed').replace('/view', '/embed');
      return embedUrl.includes('/embed') ? embedUrl : `${embedUrl}/embed`;
    }

    if (isGoogleDriveUrl(trimmed)) {
      if (trimmed.includes('/folders/')) {
        return trimmed.replace('/view', '/embeddedfolderview').replace(/\/$/, '') + '?sortby=name&sortorder=ascending#grid';
      }
      if (trimmed.includes('/file/d/')) {
        const fileId = trimmed.match(/\/file\/d\/([^/]+)/)?.[1];
        if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    if (/\.(pptx?|docx?|xlsx?)($|\?)/i.test(trimmed)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(trimmed)}`;
    }

    if (/\.pdf($|\?)/i.test(trimmed)) {
      return trimmed;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function isFolderUrl(url) {
  if (!url) return false;
  return /drive\.google\.com\/drive\/folders\//i.test(url) || /\/folders\//i.test(url);
}

export function isPresentationUrl(url) {
  if (!url) return false;
  return (
    isGoogleSlidesUrl(url) ||
    /\.(pptx?|odp)($|\?)/i.test(url) ||
    /view\.officeapps\.live\.com/i.test(url)
  );
}
