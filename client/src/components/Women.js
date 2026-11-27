import { useLanguage } from '../context/LanguageContext';
import '../styling/ministry-detail.css';

function Women() {
  const { t } = useLanguage();

  return (
    <section id="women-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('womenMinistryTitle')}</h2>
        </div>
      </div>
    </section>
  );
}

export default Women;
