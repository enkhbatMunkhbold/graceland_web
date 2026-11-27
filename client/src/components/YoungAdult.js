import { useLanguage } from '../context/LanguageContext';
import '../styling/ministry-detail.css';

function YoungAdult() {
  const { t } = useLanguage();

  return (
    <section id="young-adult-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('youngAdultsMinistryTitle')}</h2>
        </div>
      </div>
    </section>
  );
}

export default YoungAdult;
