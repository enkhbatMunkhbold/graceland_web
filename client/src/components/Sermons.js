import { useState, useEffect, useMemo } from 'react';
import { Play, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import LatestVideos from './LatestVideos';
import '../styling/sermons.css';

function getSermonWatchUrl(sermon) {
  if (sermon.source === 'facebook' && sermon.external_id) {
    return `https://www.facebook.com/watch/?v=${sermon.external_id}`;
  }
  return sermon.video_url || sermon.audio_url || null;
}

function Sermons() {
  const [sermons, setSermons] = useState([]);
  const [selectedSermonId, setSelectedSermonId] = useState(null);
  const [latestYouTubeVideo, setLatestYouTubeVideo] = useState(null);
  const [featuredSource, setFeaturedSource] = useState('youtube');
  const [isLatestVideoPlaying, setIsLatestVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [youtubeLoading, setYoutubeLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    api.getSermons()
      .then(data => {
        setSermons(data);
        if (data.length > 0) {
          setSelectedSermonId(data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching sermons:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    api.getLatestYouTubeVideos()
      .then(videos => {
        setLatestYouTubeVideo(videos[0] || null);
      })
      .catch(err => {
        console.error('Error fetching latest YouTube video:', err);
      })
      .finally(() => setYoutubeLoading(false));
  }, []);

  const filteredSermons = useMemo(() => {
    if (!searchQuery.trim()) return sermons;
    const q = searchQuery.toLowerCase().trim();
    return sermons.filter(
      s =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.speaker_name && s.speaker_name.toLowerCase().includes(q)) ||
        (s.scripture_reference && s.scripture_reference.toLowerCase().includes(q))
    );
  }, [sermons, searchQuery]);

  const selectedSermon = useMemo(() => {
    if (!sermons.length) return null;
    return sermons.find(s => s.id === selectedSermonId) || sermons[0];
  }, [sermons, selectedSermonId]);

  const showLatestYouTubeVideo = featuredSource === 'youtube' && latestYouTubeVideo;
  const featuredVideoUrl = showLatestYouTubeVideo
    ? latestYouTubeVideo.embed_url
    : selectedSermon?.video_url || null;
  const featuredTitle = showLatestYouTubeVideo
    ? latestYouTubeVideo.title
    : selectedSermon?.title;
  const featuredDate = showLatestYouTubeVideo
    ? latestYouTubeVideo.published_at
    : selectedSermon?.date;

  const handleYouTubeVideoSelect = video => {
    setLatestYouTubeVideo(video);
    setFeaturedSource('youtube');
    setIsLatestVideoPlaying(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading || youtubeLoading) {
    return (
      <div className="sermons-page">
        <section className="sermons-hero">
          <div className="sermons-hero-video-wrap">
            <div className="sermons-video-placeholder sermons-video-loading">
              <span>Loading...</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sermons-page">
      <section className="sermons-hero">
        <div className="sermons-hero-video-wrap">
          {showLatestYouTubeVideo && !isLatestVideoPlaying ? (
            <button
              type="button"
              className="sermons-latest-video-preview"
              onClick={() => setIsLatestVideoPlaying(true)}
              aria-label={`${t('playVideo')}: ${latestYouTubeVideo.title}`}
            >
              <img src={latestYouTubeVideo.thumbnail_url} alt="" />
              <span className="sermons-latest-play" aria-hidden="true">
                <Play />
              </span>
            </button>
          ) : featuredVideoUrl ? (
            <div className="sermons-video-window">
              <iframe
                src={showLatestYouTubeVideo ? `${featuredVideoUrl}?autoplay=1&rel=0` : featuredVideoUrl}
                title={featuredTitle || 'Sermon video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="sermons-video-iframe"
              />
            </div>
          ) : (
            <div className="sermons-video-placeholder">
              <span>{t('noSermonsYet')}</span>
            </div>
          )}
        </div>
        {featuredTitle && (
          <div className="sermons-hero-caption">
            <h2 className="sermons-hero-title">{featuredTitle}</h2>
            {featuredDate && (
              <p className="sermons-hero-date">
                {new Date(featuredDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}
      </section>

      <LatestVideos onSelectVideo={handleYouTubeVideoSelect} />

      <section className="sermons-content">
        <div className="sermons-content-inner">
          <h1 className="sermons-page-title">{t('sermonsPageTitle')}</h1>

          <div className="sermons-search-row">
            <div className="sermons-search-wrap">
              <input
                type="search"
                className="sermons-search-input"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label={t('search')}
              />
              <button type="button" className="sermons-search-btn" aria-label={t('search')}>
                <Search className="sermons-search-icon" />
              </button>
            </div>
          </div>

          {error ? (
            <p className="sermons-error">Error: {error}</p>
          ) : sermons.length === 0 ? (
            <p className="sermons-list-empty">{t('noSermonsYet')}</p>
          ) : (
            <ul className="sermons-list">
              {filteredSermons.length === 0 ? (
                <li className="sermons-list-empty">{t('noSermonsMatchSearch')}</li>
              ) : (
                filteredSermons.map(sermon => {
                  const watchUrl = getSermonWatchUrl(sermon);
                  const isSelected = selectedSermon?.id === sermon.id;

                  return (
                    <li
                      key={sermon.id}
                      className={`sermon-list-item${isSelected ? ' sermon-list-item--active' : ''}`}
                    >
                      <button
                        type="button"
                        className="sermon-list-main sermon-list-select"
                        onClick={() => {
                          setSelectedSermonId(sermon.id);
                          setFeaturedSource('sermon');
                          setIsLatestVideoPlaying(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <h3 className="sermon-list-title">{sermon.title}</h3>
                        {sermon.speaker_name && (
                          <p className="sermon-list-speaker">{sermon.speaker_name}</p>
                        )}
                        {sermon.scripture_reference && (
                          <p className="sermon-list-scripture">{sermon.scripture_reference}</p>
                        )}
                        <p className="sermon-list-date">
                          {new Date(sermon.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </button>
                      {watchUrl && (
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sermon-list-watch"
                        >
                          {t('watchNow')} →
                        </a>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default Sermons;
