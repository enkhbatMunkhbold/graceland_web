import { useLanguage } from '../context/LanguageContext';
import '../styling/home.css';
import image1 from '../images/481156816_599771773215075_9010741751255276992_n.jpg';
import image2 from '../images/481982600_1020936049892073_9048145883288638001_n.jpg';
import image3 from '../images/482750300_647361807785040_2310056299074543752_n.jpg';
import image4 from '../images/484869371_1005337404351491_7788059528405399719_n.jpg';
import image5 from '../images/488968301_1222460666165944_6640087254781339492_n.jpg';
import image6 from '../images/489596619_1559717181373149_5182006190405696916_n.jpg';
import image7 from '../images/511217431_618463534056956_4498130896623869463_n.jpg';
import image8 from '../images/530394955_763353719763817_3371425162899772331_n.jpg';
import image9 from '../images/529477432_1296518745533815_540512601034851597_n.jpg';

function Home() {
  const { t, language } = useLanguage();

  const carouselImages = [image1, image2, image3, image4, image5, image6, image7, image8, image9];

  return (
    <section id="home" className="home-section">
      <div className="home-container">
        <div className="home-content">
          {language === 'mn' ? (
            <>
              <h1 className="home-title church-name">
                {t('churchName').split(' ').map((word, index) => (
                  word === "Цуглаан" ? 
                    <span key={index} className="church-name-word">{word + "Д"}</span> : 
                    <span key={index} className="church-name-word">{word}</span>
                ))}
              </h1>
              <div className="welcome-to mong">{t('welcome')}</div>
              <div className="church-name-line"></div>
            </>
          ) : (
            <>
              <div className="welcome-to eng">{t('welcome')}</div>
              <h1 className="home-title church-name">
                {t('churchName').split(' ').map((word, index) => (
                  <span key={index} className="church-name-word">{word}</span>
                ))}
              </h1>
              <div className="church-name-line"></div>
            </>
          )}
          <p className="home-description">{t('welcomeSubtext')}</p>
          
          {/* Image Carousel */}
          <div className="carousel-container">
            <div className="carousel-track">
              {[...carouselImages, ...carouselImages].map((img, index) => (
                <div key={index} className="carousel-card">
                  <img src={img} alt={`Carousel ${index + 1}`} className="carousel-image" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Home;