import { useLanguage } from '../context/LanguageContext';
import interhighImage from '../assets/Interhigh.jpg';
import ImportedMinistryContent from './ImportedMinistryContent';
import '../styling/ministry-detail.css';

function Youth() {
  const { t } = useLanguage();

  return (
    <section id="youth-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('youthMinistryTitle')}</h2>
        </div>
        <ImportedMinistryContent slug="youth"><div className="ministry-detail-media">
          <img src={interhighImage} alt={t('youthMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('youthMinistryPara1')}</p>
        </div>
        </ImportedMinistryContent>
      </div>
    </section>
  );
}

export default Youth;
