import { useLanguage } from '../context/LanguageContext';
import childrenImage from '../assets/Children.jpg';
import '../styling/ministry-detail.css';

function Children() {
  const { t } = useLanguage();

  return (
    <section id="children-ministry" className="ministry-detail-section">
      <div className="ministry-detail-container">
        <div className="section-header">
          <h2 className="section-title">{t('childrenMinistryTitle')}</h2>
        </div>
        <div className="ministry-detail-media">
          <img src={childrenImage} alt={t('childrenMinistryTitle')} />
        </div>
        <div className="ministry-detail-content">
          <p>{t('childrenMinistryPara1')}</p>
          <p>{t('childrenMinistryPara2')}</p>
        </div>
      </div>
    </section>
  );
}

export default Children;
