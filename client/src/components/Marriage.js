import { useLanguage } from '../context/LanguageContext';
import worshipImage from '../assets/Worship Ministry.jpg';
import '../styling/ministry-detail.css';

function Marriage() {
  const { t } = useLanguage();

  return (
    <section id="marriage-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('marriageMinistryTitle')}</h2>
        </div>
        <div className="ministry-detail-media">
          <img src={worshipImage} alt={t('marriageMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('marriageMinistryPara1')}</p>
        </div>
      </div>
    </section>
  );
}

export default Marriage;
