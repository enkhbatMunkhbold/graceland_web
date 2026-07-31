import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CloudSun, Clock3, Gift, HeartHandshake, MapPin, MessageCircle, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import heroImage from '../assets/Worship God.jpg';
import heroVideo from '../assets/home-worship.mp4';
import childrenImage from '../assets/Children.jpg';
import youthImage from '../assets/Interhigh.jpg';
import youngAdultsImage from '../assets/Young Adults.jpg';
import preacherImage from '../assets/preacher.jpg';
import '../styling/home.css';

const GIVING_URL = 'https://gracelandbible.breezechms.com/give/online';
const YOUTUBE_URL = 'https://www.youtube.com/@gracelandbiblechurch7040';
const ADDRESS = '1955 Geary Rd, Walnut Creek, CA 94597';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const WEATHER_URL = 'https://weather.com/en-MH/weather/today/l/Walnut%2BCreek%2BCA%2BUnited%2BStates?canonicalCityId=68b6dc922062f6664354084b9d9807b0f335a2a92ddb85ba01b164546cdd2068';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=37.92626&longitude=-122.07590&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&forecast_days=1';

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

function getWeatherCondition(code, t) {
  if (code === 0) return t('weatherSunny');
  if (code === 1) return t('weatherMostlySunny');
  if (code === 2) return t('weatherPartlyCloudy');
  if (code === 3) return t('weatherCloudy');
  if ([45, 48].includes(code)) return t('weatherFoggy');
  if ([51, 53, 55, 56, 57].includes(code)) return t('weatherDrizzle');
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return t('weatherRainy');
  if ([71, 73, 75, 77, 85, 86].includes(code)) return t('weatherSnowy');
  if ([95, 96, 99].includes(code)) return t('weatherStormy');
  return t('weatherConditions');
}

function Home() {
  const { t, language } = useLanguage();
  const { user } = useContext(UserContext);
  const [sermons, setSermons] = useState([]);
  const [events, setEvents] = useState([]);
  const [weather, setWeather] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const calendarRequests = [0, 1, 2].map(monthOffset => {
      const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      return api.getGoogleCalendarEvents(month.getFullYear(), month.getMonth() + 1);
    });

    Promise.allSettled([api.getSermons(), api.getEvents(), ...calendarRequests])
      .then(([sermonResult, localEventResult, ...calendarResults]) => {
        if (!active) return;
        if (sermonResult.status === 'fulfilled') setSermons(sermonResult.value);
        const localEvents = localEventResult.status === 'fulfilled'
          ? localEventResult.value
          : [];
        const calendarEvents = calendarResults.flatMap(result =>
          result.status === 'fulfilled' ? result.value : []
        );
        const uniqueEvents = [...localEvents, ...calendarEvents].filter(
          (event, index, allEvents) =>
            allEvents.findIndex(candidate =>
              candidate.id === event.id &&
              candidate.start_datetime === event.start_datetime
            ) === index
        );
        setEvents(uniqueEvents);
      })
      .finally(() => active && setContentLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(WEATHER_API_URL)
      .then(response => {
        if (!response.ok) throw new Error('Weather is temporarily unavailable.');
        return response.json();
      })
      .then(data => {
        if (active && Number.isFinite(data.current?.temperature_2m)) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            condition: getWeatherCondition(data.current.weather_code, t),
            high: Math.round(data.daily.temperature_2m_max[0]),
            low: Math.round(data.daily.temperature_2m_min[0]),
          });
        }
      })
      .catch(error => console.error('Unable to load current weather:', error));
    return () => { active = false; };
  }, [t]);

  const latestSermon = useMemo(
    () => [...sermons].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null,
    [sermons]
  );
  const upcomingEvents = useMemo(() => events
    .filter(event => new Date(event.start_datetime) >= new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 5), [events]);
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
        <video
          className="home-hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster={heroImage}
          aria-hidden="true"
          onLoadedMetadata={event => { event.currentTarget.playbackRate = 0.5; }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="home-hero-overlay" />
        <div className="home-shell home-hero-content">
          {user && <p className="home-user-greeting">{t('welcomeUser')}, {user.username}!</p>}
          <p className="home-eyebrow">{t('churchName')}</p>
          <h1 id="home-hero-title" className="home-hero-title">{t('homeSlogan')}</h1>
          <p className="home-hero-copy">{t('homeSloganSupport')}</p>
          <div className="home-hero-actions">
            <Link className="home-button home-button--primary" to="/events">
              {t('planYourVisit')} <ArrowRight aria-hidden="true" />
            </Link>
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
            <a
              className="home-hero-visit-item home-location-item"
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin aria-hidden="true" />
              <div><strong>{t('ourLocation')}</strong><span>{ADDRESS}</span></div>
            </a>
            <a
              className="home-hero-visit-item home-weather-item"
              href={WEATHER_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t('todaysWeather')}: ${weather === null ? t('weatherLoading') : `${weather.condition}, ${weather.temperature}°F, ${t('weatherHigh')} ${weather.high}°, ${t('weatherLow')} ${weather.low}°`}`}
            >
              <CloudSun aria-hidden="true" />
              <div>
                <strong>{t('todaysWeather')}</strong>
                {weather === null ? (
                  <span>{t('weatherLoading')}</span>
                ) : (
                  <>
                    <span className="home-weather-current">{weather.condition} · {weather.temperature}°F</span>
                    <span className="home-weather-range">
                      {t('weatherHigh')} {weather.high}° / {t('weatherLow')} {weather.low}°
                    </span>
                  </>
                )}
              </div>
            </a>
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
              <img src={preacherImage} alt="" loading="lazy" />
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
          <article className="home-care-card home-care-card--contact">
            <MessageCircle aria-hidden="true" />
            <p className="home-kicker">{t('feedbackKicker')}</p>
            <h2>{t('feedbackTitle')}</h2>
            <p>{t('feedbackIntro')}</p>
            <a className="home-button home-button--care" href="#feedback">{t('leaveFeedback')} <ArrowRight aria-hidden="true" /></a>
          </article>
          <article className="home-care-card home-care-card--prayer">
            <HeartHandshake aria-hidden="true" />
            <p className="home-kicker">{t('weAreHereForYou')}</p>
            <h2>{t('needPrayer')}</h2><p>{t('carePrayerIntro')}</p>
            <Link className="home-button home-button--care" to="/prayer">{t('submitPrayerRequest')} <ArrowRight aria-hidden="true" /></Link>
          </article>
          <article className="home-care-card home-care-card--giving">
            <Gift aria-hidden="true" />
            <p className="home-kicker">{t('generosity')}</p>
            <h2>{t('onlineGiving')}</h2><p>{t('careGivingIntro')}</p>
            <a className="home-button home-button--care" href={GIVING_URL} target="_blank" rel="noopener noreferrer">
              {t('giveOnline')} <ArrowRight aria-hidden="true" />
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;
