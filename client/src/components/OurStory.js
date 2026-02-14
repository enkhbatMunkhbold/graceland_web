import { useLanguage } from '../context/LanguageContext';
import '../styling/about.css';

function OurStory() {
  const { t } = useLanguage();

  return (
    <section id="our-story" className="about-section">
      <div className="about-container">
        <div className="section-header">
          <h2 className="section-title">
            {t('ourStory').split(' ').map((word, index) => (
              <span key={index} className="word">{word}</span>
            ))}
          </h2>
        </div>
        <div className="about-content">
          <p className="about-text">{t('ourStoryContent')}</p>
        </div>
      </div>
    </section>
  );
}

export default OurStory;
