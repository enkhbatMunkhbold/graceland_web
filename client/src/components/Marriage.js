import { useLanguage } from '../context/LanguageContext';
import '../styling/ministry-detail.css';

function Marriage() {
  const { t } = useLanguage();

  return (
    <section id="marriage-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('marriageMinistryTitle')}</h2>
        </div>
      </div>
    </section>
  );
}

export default Marriage;
