export function isDirectVideoUrl(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url || '');
}

export function getVideoEmbedUrl(url) {
  if (!url) return null;

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\//, '');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (parsed.hostname.includes('facebook.com') || parsed.hostname.includes('fb.watch')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`;
    }

    if (isDirectVideoUrl(trimmed)) {
      return trimmed;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
