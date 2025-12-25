import { Book } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styling/footer.css';

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-column">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <Book className="footer-icon" />
              </div>
              <span className="footer-logo-text">Our Church</span>
            </div>
            <p className="footer-description">
              {t('welcomeSubtext')}
            </p>
          </div>

          <div className="footer-column">
            <h3 className="footer-heading">{t('quickLinks')}</h3>
            <ul className="footer-links">
              <li><a href="#home" className="footer-link">{t('home')}</a></li>
              <li><a href="#about" className="footer-link">{t('about')}</a></li>
              <li><a href="#ministries" className="footer-link">{t('ministries')}</a></li>
              <li><a href="#events" className="footer-link">{t('events')}</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-heading">{t('serviceTimes')}</h3>
            <ul className="footer-services">
              <li>{t('sundayMorning')}: 9:00 AM</li>
              <li>{t('sundayEvening')}: 6:00 PM</li>
              <li>{t('wednesdayPrayer')}: 7:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;