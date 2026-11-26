import { useLanguage } from '../context/LanguageContext';
import ImportedMinistryContent from './ImportedMinistryContent';
import '../styling/ministry-detail.css';

function Children() {
  const { t } = useLanguage();

  return (
    <section id="children-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('childrenMinistryTitle')}</h2>
        </div>
        <ImportedMinistryContent slug="children" />
      </div>
    </section>
  );
}

export default Children;
