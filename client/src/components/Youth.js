import { useLanguage } from '../context/LanguageContext';
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
        <ImportedMinistryContent slug="youth" />
      </div>
    </section>
  );
}

export default Youth;
