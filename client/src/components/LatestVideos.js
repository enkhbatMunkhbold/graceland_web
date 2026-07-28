import { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/latest-videos.css';

function LatestVideos({ onSelectVideo }) {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    api.getLatestYouTubeVideos()
      .then(data => setVideos(data))
      .catch(error => {
        console.error('Unable to load latest YouTube videos:', error);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVideo) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') setSelectedVideo(null);
    };
    document.body.classList.add('video-modal-open');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('video-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedVideo]);

  return (
    <section className="latest-videos" aria-labelledby="latest-videos-title">
      <div className="latest-videos-inner">
        <div className="latest-videos-heading">
          <p>{t('latestVideosKicker')}</p>
          <h2 id="latest-videos-title">{t('latestVideosTitle')}</h2>
        </div>

        {loading ? (
          <p className="latest-videos-status">{t('latestVideosLoading')}</p>
        ) : failed || videos.length === 0 ? (
          <p className="latest-videos-status latest-videos-status--error">
            {t('latestVideosUnavailable')}
          </p>
        ) : (
          <div className="latest-videos-grid">
            {videos.map(video => (
              <button
                type="button"
                className="latest-video-card"
                key={video.id}
                onClick={() => {
                  if (onSelectVideo) {
                    onSelectVideo(video);
                  } else {
                    setSelectedVideo(video);
                  }
                }}
                aria-label={`${t('playVideo')}: ${video.title}`}
              >
                <span className="latest-video-thumbnail">
                  <img src={video.thumbnail_url} alt="" loading="lazy" />
                  <span className="latest-video-play" aria-hidden="true">
                    <Play />
                  </span>
                </span>
                <span className="latest-video-title">{video.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!onSelectVideo && selectedVideo && (
        <div
          className="latest-video-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="latest-video-modal-title"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelectedVideo(null);
          }}
        >
          <div className="latest-video-dialog">
            <button
              type="button"
              className="latest-video-close"
              onClick={() => setSelectedVideo(null)}
              aria-label={t('closeVideo')}
              autoFocus
            >
              <X />
            </button>
            <div className="latest-video-player">
              <iframe
                src={`${selectedVideo.embed_url}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <h3 id="latest-video-modal-title">{selectedVideo.title}</h3>
          </div>
        </div>
      )}
    </section>
  );
}

export default LatestVideos;
