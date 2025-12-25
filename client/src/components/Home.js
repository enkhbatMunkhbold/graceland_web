import React from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styling/home.css';

function Home() {
  const { t } = useLanguage();

  return (
    <section id="home" className="home-section">
      <div className="home-container">
        <div className="home-content">
          <h1 className="home-title">{t('welcome')}</h1>
          <p className="home-subtitle">{t('welcomeSubtext')}</p>
          
          {/* Service Times */}
          <div className="service-times">
            <div className="service-card">
              <Clock className="service-icon" />
              <h3 className="service-title">{t('sundayMorning')}</h3>
              <p className="service-time">3:00 PM</p>
            </div>
            <div className="service-card">
              <Clock className="service-icon" />
              <h3 className="service-title">{t('sundayEvening')}</h3>
              <p className="service-time">7:00 PM</p>
            </div>
            <div className="service-card">
              <Clock className="service-icon" />
              <h3 className="service-title">{t('wednesdayPrayer')}</h3>
              <p className="service-time">9:30 PM</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Home;