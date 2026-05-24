import { useLanguage } from '../context/LanguageContext';
import menImage from '../assets/Men.jpg';
import '../styling/ministry-detail.css';

function Men() {
  const { t } = useLanguage();

  return (
    <section id="men-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('menMinistryTitle')}</h2>
        </div>
        <div className="ministry-detail-media">
          <img src={menImage} alt={t('menMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('menMinistryPara1')}</p>
        </div>
      </div>
    </section>
  );
}

export default Men;
