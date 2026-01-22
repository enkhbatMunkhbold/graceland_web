import { useLanguage } from '../context/LanguageContext';
import '../styling/about.css';

function About() {
  const { t } = useLanguage();

  return (
    <section id="about" className="about-section">
      <div className="about-container">
        <div className="section-header">
          <h2 className="section-title">
            {t('about').split(' ').map((word, index) => (
              <span key={index} className="word">{word}</span>
            ))}
          </h2>
        </div>
        <div className="about-content">
          <p className="about-text">
            {t('about') === 'About' 
              ? 'We are a community of believers dedicated to serving God and spreading His word. Join us in worship and fellowship as we grow together in faith.'
              : 'Бид Бурханы үгийг түгээх, Бурханд үйлчлэхэд зориулсан итгэлтнүүдийн нийгэмлэг юм. Итгэлдээ хамтдаа өсөж, үйлчлэл, нөхөрлөлд оролцоорой.'}
          </p>
        </div>
      </div>
    </section>
  );
}

export default About;

