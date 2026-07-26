import { Link } from 'react-router-dom';
import { Clock3, Facebook, MapPin, Youtube } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import logoImage from '../assets/logo_with_name.png';
import '../styling/footer.css';

const ADDRESS = '1955 Geary Rd, Walnut Creek, CA 94597';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;
const FACEBOOK_URL = 'https://www.facebook.com/gracelandoakland';
const YOUTUBE_URL = 'https://www.youtube.com/@gracelandbiblechurch7040';

function Footer() {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();
  const copy = language === 'mn' ? {
    welcome: 'Есүс Христ, Бурханы үг болон хамтын амьдралд төвлөрсөн Монгол чуулганы халуун дулаан гэр бүл.',
    followUs: 'Биднийг дагах',
    visitUs: 'Манай хаяг',
    directions: 'Чиглэл авах',
    maps: 'Google Maps',
    mapTitle: 'Graceland Bible Church-ийн байршил',
    rights: 'Бүх эрх хуулиар хамгаалагдсан.',
  } : {
    welcome: 'A welcoming Mongolian church community centered on Jesus, Scripture, and life together.',
    followUs: 'Follow us',
    visitUs: 'Visit us',
    directions: 'Get directions',
    maps: 'Google Maps',
    mapTitle: 'Graceland Bible Church location',
    rights: 'All rights reserved.',
  };

  const quickLinks = [
    { label: t('home'), to: '/home' },
    { label: t('about'), to: '/about' },
    { label: t('ministries'), to: '/ministries' },
    { label: t('events'), to: '/events' },
    { label: t('sermons'), to: '/sermons' },
  ];

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="footer">
      <div className="footer-accent" aria-hidden="true" />
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/home" className="footer-logo-link" onClick={scrollToTop}>
              <img src={logoImage} alt={t('churchName')} className="footer-logo-image" loading="lazy" />
            </Link>
            <p className="footer-description">{copy.welcome}</p>
            <div className="footer-socials" aria-label={copy.followUs}>
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook aria-hidden="true" />
              </a>
              <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube aria-hidden="true" />
              </a>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" aria-label={copy.maps}>
                <MapPin aria-hidden="true" />
              </a>
            </div>
          </div>

          <nav className="footer-column" aria-label={t('quickLinks')}>
            <h2 className="footer-heading">{t('quickLinks')}</h2>
            <ul className="footer-links">
              {quickLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="footer-link" onClick={scrollToTop}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-column">
            <h2 className="footer-heading">{copy.visitUs}</h2>
            <a className="footer-address" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <MapPin aria-hidden="true" />
              <span>{ADDRESS}</span>
            </a>
            <a className="footer-direction-link" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              {copy.directions}
            </a>
            <div className="footer-map">
              <iframe
                src={MAPS_EMBED_URL}
                title={copy.mapTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          <div className="footer-column">
            <h2 className="footer-heading">{t('serviceTimes')}</h2>
            <ul className="footer-services">
              <li>
                <Clock3 aria-hidden="true" />
                <span><strong>{t('mondayMorningPrayer')}</strong>{t('morningPrayerTime')}</span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span><strong>{t('wednesdayMorningPrayer')}</strong>{t('morningPrayerTime')}</span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span><strong>{t('fridayPrayer')}</strong>{t('fridayPrayerTime')}</span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span><strong>{t('sundayWorship')}</strong>{t('sundayWorshipTime')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {year} {t('churchName')}. {copy.rights}</p>
          <div className="footer-bottom-links">
            <Link to="/login" className="footer-staff-link" onClick={scrollToTop}>{t('staffLogin')}</Link>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">{copy.maps}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
