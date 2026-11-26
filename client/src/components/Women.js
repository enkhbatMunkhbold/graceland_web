import { useLanguage } from '../context/LanguageContext';
import womenImage from '../assets/Women.jpg';
import '../styling/ministry-detail.css';

function Women() {
  const { t } = useLanguage();

  return (
    <section id="women-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('womenMinistryTitle')}</h2>
        </div>
        <div className="ministry-detail-media">
          <img src={womenImage} alt={t('womenMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('womenMinistryPara1')}</p>
        </div>
      </div>
    </section>
  );
}

export default Women;
