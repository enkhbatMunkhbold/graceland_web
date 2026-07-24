import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, Gift, HeartHandshake, MapPin, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import heroImage from '../images/481156816_599771773215075_9010741751255276992_n.jpg';
import childrenImage from '../assets/Children.jpg';
import youthImage from '../assets/Interhigh.jpg';
import youngAdultsImage from '../assets/Young Adults.jpg';
import '../styling/home.css';

const GIVING_URL = 'https://gracelandbible.breezechms.com/give/online';

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
        <img className="home-hero-image" src={heroImage} alt="" />
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
      </section>

      <section id="plan-your-visit" className="home-section home-visit-section">
        <div className="home-shell">
          <div className="home-section-heading home-section-heading--center">
            <p className="home-kicker">{t('youAreWelcome')}</p>
            <h2>{t('joinUsThisWeek')}</h2>
            <p>{t('visitIntro')}</p>
          </div>
          <div className="home-service-grid">
            <article className="home-service-card">
              <CalendarDays aria-hidden="true" />
              <div><h3>{t('sundayWorship')}</h3><p>{t('sundayWorshipTime')}</p></div>
            </article>
            <article className="home-service-card">
              <Clock3 aria-hidden="true" />
              <div><h3>{t('fridayPrayer')}</h3><p>{t('fridayPrayerTime')}</p></div>
            </article>
            <article className="home-service-card">
              <MapPin aria-hidden="true" />
              <div><h3>{t('ourLocation')}</h3><p>1955 Geary Rd., Walnut Creek, CA 94597</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section home-sermon-section">
        <div className="home-shell">
          <div className="home-section-heading">
            <p className="home-kicker">{t('growInTheWord')}</p>
            <h2>{t('latestMessage')}</h2>
          </div>
          <article className="home-feature-card">
            <div className="home-feature-media">
              <img src={youngAdultsImage} alt="" />
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
                  <h3>{t('noSermonsYet')}</h3>
                  <Link className="home-text-link" to="/sermons">{t('visitSermonsPage')} <ArrowRight aria-hidden="true" /></Link>
                </>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="home-section home-events-section">
        <div className="home-shell">
          <div className="home-heading-row">
            <div className="home-section-heading">
              <p className="home-kicker">{t('lifeTogether')}</p>
              <h2>{t('upcomingEvents')}</h2>
            </div>
            <Link className="home-text-link" to="/events">{t('viewAllEvents')} <ArrowRight aria-hidden="true" /></Link>
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
              <div className="home-empty-card"><CalendarDays aria-hidden="true" /><p>{t('noUpcomingEvents')}</p></div>
            )}
          </div>
        </div>
      </section>

      <section className="home-section home-ministries-section">
        <div className="home-shell">
          <div className="home-heading-row">
            <div className="home-section-heading">
              <p className="home-kicker">{t('findCommunity')}</p>
              <h2>{t('ministriesForEverySeason')}</h2>
            </div>
            <Link className="home-text-link" to="/ministries">{t('exploreMinistries')} <ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="home-ministry-grid">
            {ministries.map(ministry => (
              <Link className="home-ministry-card" to={ministry.path} key={ministry.path}>
                <img src={ministry.image} alt="" /><div className="home-ministry-overlay" />
                <div className="home-ministry-content">
                  <h3>{ministry.title}</h3><span>{t('learnMore')} <ArrowRight aria-hidden="true" /></span>
                </div>
              </Link>
            ))}
          </div>
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
