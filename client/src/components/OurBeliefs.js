import { useLanguage } from '../context/LanguageContext';
import '../styling/about.css';

function OurBeliefs() {
  const { t } = useLanguage();

  return (
    <section id="our-beliefs" className="about-section">
      <div className="about-container">
        <div className="section-header">
          <h2 className="section-title">
            {t('ourBeliefs').split(' ').map((word, index) => (
              <span key={index} className="word">{word}</span>
            ))}
          </h2>
        </div>
        <div className="about-content">
          <p className="about-text">{t('ourBeliefsContent')}</p>
        </div>
      </div>
    </section>
  );
}

export default OurBeliefs;
