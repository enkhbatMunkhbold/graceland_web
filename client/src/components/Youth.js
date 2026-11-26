import { useLanguage } from '../context/LanguageContext';
import interhighImage from '../assets/Interhigh.jpg';
import '../styling/ministry-detail.css';

function Youth() {
  const { t } = useLanguage();

  return (
    <section id="youth-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('youthMinistryTitle')}</h2>
        </div>
        <div className="ministry-detail-media">
          <img src={interhighImage} alt={t('youthMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('youthMinistryPara1')}</p>
        </div>
      </div>
    </section>
  );
}

export default Youth;
