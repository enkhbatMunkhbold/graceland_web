import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, Gift, HeartHandshake, MapPin, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import heroImage from '../images/484869371_1005337404351491_7788059528405399719_n.jpg';
import childrenImage from '../assets/Children.jpg';
import youthImage from '../assets/Interhigh.jpg';
import youngAdultsImage from '../assets/Young Adults.jpg';
import '../styling/home.css';

const GIVING_URL = 'https://gracelandbible.breezechms.com/give/online';
const YOUTUBE_URL = 'https://www.youtube.com/@gracelandbiblechurch7040';

function formatDate(value, language) {
  return new Date(value).toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function getSermonWatchUrl(sermon) {
  if (!sermon) return null;
  if (sermon.source === 'facebook' && sermon.external_id) {
    return `https://www.facebook.com/watch/?v=${sermon.external_id}`;
  }
  return sermon.video_url || sermon.audio_url || null;
}

function Home() {
  const { t, language } = useLanguage();
  const { user } = useContext(UserContext);
  const [sermons, setSermons] = useState([]);
  const [events, setEvents] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getSermons(), api.getEvents()])
      .then(([sermonResult, eventResult]) => {
        if (!active) return;
        if (sermonResult.status === 'fulfilled') setSermons(sermonResult.value);
        if (eventResult.status === 'fulfilled') setEvents(eventResult.value);
      })
      .finally(() => active && setContentLoading(false));
    return () => { active = false; };
  }, []);

  const latestSermon = useMemo(
    () => [...sermons].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null,
    [sermons]
  );
  const upcomingEvents = useMemo(() => events
    .filter(event => new Date(event.start_datetime) >= new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 3), [events]);
  const sermonWatchUrl = getSermonWatchUrl(latestSermon);
  const ministries = [
    { title: t('childrenMinistryTitle'), image: childrenImage, path: '/ministries/children' },
    { title: t('youthMinistryTitle'), image: youthImage, path: '/ministries/youth' },
    { title: t('youngAdultsMinistryTitle'), image: youngAdultsImage, path: '/ministries/young-adult' },
  ];

  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <img className="home-hero-image" src={heroImage} alt="" fetchPriority="high" />
        <div className="home-hero-overlay" />
        <div className="home-shell home-hero-content">
          {user && <p className="home-user-greeting">{t('welcomeUser')}, {user.username}!</p>}
          <p className="home-eyebrow">{t('churchName')}</p>
          <h1 id="home-hero-title" className="home-hero-title">{t('homeSlogan')}</h1>
          <p className="home-hero-copy">{t('homeSloganSupport')}</p>
          <div className="home-hero-actions">
            <button
              type="button"
              className="home-button home-button--primary"
              onClick={() => document.getElementById('plan-your-visit')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('planYourVisit')} <ArrowRight aria-hidden="true" />
            </button>
            <Link className="home-button home-button--ghost" to="/sermons">
              <Play aria-hidden="true" /> {t('watchLatestSermon')}
            </Link>
          </div>
        </div>
        <div id="plan-your-visit" className="home-hero-visit">
          <div className="home-shell home-hero-visit-grid">
            <div className="home-hero-visit-item">
              <Clock3 aria-hidden="true" />
              <div><strong>{t('mondayMorningPrayer')}</strong><span>{t('morningPrayerTime')}</span></div>
            </div>
            <div className="home-hero-visit-item">
              <Clock3 aria-hidden="true" />
              <div><strong>{t('wednesdayMorningPrayer')}</strong><span>{t('morningPrayerTime')}</span></div>
            </div>
            <div className="home-hero-visit-item">
              <Clock3 aria-hidden="true" />
              <div><strong>{t('fridayPrayer')}</strong><span>{t('fridayPrayerTime')}</span></div>
            </div>
            <div className="home-hero-visit-item">
              <Clock3 aria-hidden="true" />
              <div><strong>{t('sundayWorship')}</strong><span>{t('sundayWorshipTime')}</span></div>
            </div>
            <div className="home-hero-visit-item">
              <MapPin aria-hidden="true" />
              <div><strong>{t('ourLocation')}</strong><span>1955 Geary Rd, Walnut Creek, CA 94597</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-highlights-section">
        <div className="home-shell home-highlights-grid">
          <article className="home-highlight-column home-sermon-column">
            <div className="home-section-heading">
              <p className="home-kicker">{t('growInTheWord')}</p>
              <h2>{t('latestMessage')}</h2>
            </div>
            <div className="home-feature-card">
            <div className="home-feature-media">
              <img src={youngAdultsImage} alt="" loading="lazy" />
              <span className="home-feature-play" aria-hidden="true"><Play /></span>
            </div>
            <div className="home-feature-content">
              {contentLoading ? <p>{t('homeContentLoading')}</p> : latestSermon ? (
                <>
                  <p className="home-meta">{formatDate(latestSermon.date, language)}</p>
                  <h3>{latestSermon.title}</h3>
                  {latestSermon.speaker_name && <p>{latestSermon.speaker_name}</p>}
                  {latestSermon.scripture_reference && <p className="home-scripture">{latestSermon.scripture_reference}</p>}
                  <div className="home-inline-actions">
                    {sermonWatchUrl && (
                      <a className="home-text-link" href={sermonWatchUrl} target="_blank" rel="noopener noreferrer">
                        {t('watchNow')} <ArrowRight aria-hidden="true" />
                      </a>
                    )}
                    <Link className="home-text-link home-text-link--subtle" to="/sermons">{t('viewAllSermons')}</Link>
                  </div>
                </>
              ) : (
                <>
                  <h3>{t('sermonInvitationTitle')}</h3>
                  <p>{t('sermonInvitationCopy')}</p>
                  <div className="home-inline-actions">
                    <a className="home-text-link" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">{t('watchOnYouTube')} <ArrowRight aria-hidden="true" /></a>
                    <Link className="home-text-link home-text-link--subtle" to="/sermons">{t('visitSermonsPage')}</Link>
                  </div>
                </>
              )}
            </div>
            </div>
          </article>

          <article className="home-highlight-column home-events-column">
            <div className="home-section-heading">
              <p className="home-kicker">{t('lifeTogether')}</p>
              <h2>{t('upcomingEvents')}</h2>
            </div>
          <div className="home-event-grid">
            {contentLoading ? <p>{t('homeContentLoading')}</p> : upcomingEvents.length ? upcomingEvents.map(event => {
              const date = new Date(event.start_datetime);
              return (
                <article className="home-event-card" key={event.id}>
                  <div className="home-event-date">
                    <span>{date.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', { month: 'short' })}</span>
                    <strong>{date.getDate()}</strong>
                  </div>
                  <div>
                    <h3>{event.title}</h3>
                    <p>{date.toLocaleTimeString(language === 'mn' ? 'mn-MN' : 'en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                    {event.location && <p>{event.location}</p>}
                  </div>
                </article>
              );
            }) : (
              <div className="home-empty-card">
                <CalendarDays aria-hidden="true" />
                <div><h3>{t('sundayInvitationTitle')}</h3><p>{t('sundayInvitationCopy')}</p></div>
              </div>
            )}
          </div>
          <Link className="home-text-link home-column-link" to="/events">{t('viewAllEvents')} <ArrowRight aria-hidden="true" /></Link>
          </article>

          <article className="home-highlight-column home-ministries-column">
            <div className="home-section-heading">
              <p className="home-kicker">{t('findCommunity')}</p>
              <h2>{t('ministriesForEverySeason')}</h2>
            </div>
          <div className="home-ministry-grid">
            {ministries.map(ministry => (
              <Link className="home-ministry-card" to={ministry.path} key={ministry.path}>
                <img src={ministry.image} alt="" loading="lazy" /><div className="home-ministry-overlay" />
                <div className="home-ministry-content">
                  <h3>{ministry.title}</h3><span>{t('learnMore')} <ArrowRight aria-hidden="true" /></span>
                </div>
              </Link>
            ))}
          </div>
          <Link className="home-text-link home-column-link" to="/ministries">{t('exploreMinistries')} <ArrowRight aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <section className="home-section home-care-section">
        <div className="home-shell home-care-grid">
          <article className="home-care-card home-care-card--prayer">
            <HeartHandshake aria-hidden="true" />
            <p className="home-kicker">{t('weAreHereForYou')}</p>
            <h2>{t('needPrayer')}</h2><p>{t('prayerIntro')}</p>
            <a className="home-button home-button--light" href="#contact">{t('sharePrayerRequest')} <ArrowRight aria-hidden="true" /></a>
          </article>
          <article className="home-care-card home-care-card--giving">
            <Gift aria-hidden="true" />
            <p className="home-kicker">{t('generosity')}</p>
            <h2>{t('onlineGiving')}</h2><p>{t('givingIntro')}</p>
            <a className="home-button home-button--outline-dark" href={GIVING_URL} target="_blank" rel="noopener noreferrer">
              {t('giveOnline')} <ArrowRight aria-hidden="true" />
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;
