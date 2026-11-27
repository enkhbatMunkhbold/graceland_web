import { useLanguage } from '../context/LanguageContext';
import MenMinistryContent from './MenMinistryContent';
import '../styling/ministry-detail.css';

function Men() {
  const { t } = useLanguage();

  return (
    <section id="men-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('menMinistryTitle')}</h2>
        </div>
        <MenMinistryContent />
      </div>
    </section>
  );
}

export default Men;
