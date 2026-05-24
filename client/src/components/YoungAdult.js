import { useLanguage } from '../context/LanguageContext';
import youngAdultsImage from '../assets/Young Adults.jpg';
import '../styling/ministry-detail.css';

function YoungAdult() {
  const { t } = useLanguage();

  return (
    <section id="young-adult-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('youngAdultsMinistryTitle')}</h2>
        </div>
        <div className="ministry-detail-media">
          <img src={youngAdultsImage} alt={t('youngAdultsMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('youngAdultsMinistryPara1')}</p>
        </div>
      </div>
    </section>
  );
}

export default YoungAdult;
