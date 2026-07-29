import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/ministries.css';

import childrenImage from '../assets/Children.jpg';
import interhighImage from '../assets/Interhigh.jpg';
import youngAdultsImage from '../assets/Young Adults.jpg';
import womenImage from '../assets/Women.jpg';
import menImage from '../assets/Men.jpg';
import marriageImage from '../assets/Marriage.jpg';
import khuushuurImage from '../assets/ministries-khuushuur.jpg';
import storageImage from '../assets/ministries-storage.jpg';
import praiseImage from '../assets/ministries-praise.jpg';
import exhibitionImage from '../assets/ministries-exhibition.jpg';
import choirImage from '../assets/ministries-choir.jpg';
import internationalImage from '../assets/ministries-international.jpg';
import jordanBaptismImage from '../assets/ministries-jordan-baptism.jpg';
import jennessParkImage from '../assets/ministries-jenness-park.jpg';
import goldenGateImage from '../assets/ministries-golden-gate.jpg';
import sfImmigrationImage from '../assets/ministries-sf-immigration.jpg';
import chicagoChurchImage from '../assets/ministries-chicago-church.jpg';
import gatewayGraduationImage from '../assets/ministries-gateway-graduation.jpg';
import fireFestivalImage from '../assets/ministries-fire-festival.jpg';

const heroSlides = [
  { image: khuushuurImage, label: 'Хуушуур' },
  { image: praiseImage, label: 'Магтаал' },
  { image: exhibitionImage, label: 'Үзэсгэлэн' },
  { image: choirImage, label: 'Хоор дуу' },
  { image: internationalImage, label: 'International' },
  { image: jordanBaptismImage, label: 'Jordan Baptism' },
  { image: jennessParkImage, label: 'Jenness Park' },
  { image: goldenGateImage, label: 'Golden Gate' },
  { image: sfImmigrationImage, label: 'SF Immigration' },
  { image: chicagoChurchImage, label: 'Чикаго Цуглаан' },
  { image: gatewayGraduationImage, label: 'Gateway Graduation' },
  { image: storageImage, label: 'Агуулахад' },
  { image: fireFestivalImage, label: 'Галын наадам' },
];

function MinistriesHero({ title }) {
  const titleWords = title.split(' ');

  return (
    <section className="ministries-hero">
      <div className="ministries-hero-collage" aria-hidden="true">
        <div className="ministries-hero-track">
          {[...heroSlides, ...heroSlides].map((slide, index) => (
            <img
              src={slide.image}
              alt=""
              key={`${slide.label}-${index}`}
              className="ministries-hero-photo"
            />
          ))}
        </div>
      </div>
      <div className="ministries-hero-overlay" />
      <h1 className="ministries-hero-title">
        <span className="ministries-hero-line">{titleWords[0]}</span>
        <span className="ministries-hero-line">{titleWords.slice(1).join(' ')}</span>
      </h1>
    </section>
  );
}

function Ministries() {
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const childrenMinistry = useMemo(() => ({
    id: 'children',
    name: t('childrenMinistryTitle'),
    description: `${t('childrenMinistryPara1')}\n${t('childrenMinistryPara2')}`,
    staticImage: childrenImage,
  }), [t]);

  const youthMinistry = useMemo(() => ({
    id: 'youth',
    name: t('youthMinistryTitle'),
    description: t('youthMinistryPara1'),
    staticImage: interhighImage,
  }), [t]);

  const youngAdultsMinistry = useMemo(() => ({
    id: 'youngAdults',
    name: t('youngAdultsMinistryTitle'),
    description: t('youngAdultsMinistryPara1'),
    staticImage: youngAdultsImage,
  }), [t]);

  const womenMinistry = useMemo(() => ({
    id: 'women',
    name: t('womenMinistryTitle'),
    description: t('womenMinistryPara1'),
    staticImage: womenImage,
  }), [t]);

  const menMinistry = useMemo(() => ({
    id: 'men',
    name: t('menMinistryTitle'),
    description: t('menMinistryPara1'),
    staticImage: menImage,
  }), [t]);

  const marriageMinistry = useMemo(() => ({
    id: 'marriage',
    name: t('marriageMinistryTitle'),
    description: t('marriageMinistryPara1'),
    staticImage: marriageImage,
  }), [t]);

  useEffect(() => {
    api.getMinistries()
      .then(data => {
        const rest = data
          .filter(m => {
            const n = m.name || '';
            return n !== "Children's Ministry" && n !== "Youth Ministry (InterHigh)" && !n.toLowerCase().includes('interhigh');
          })
          .slice(0, 5);
        setMinistries(rest);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ministries:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="ministries-page">
        <MinistriesHero title={t('ourMinistries')} />
        <section className="ministries-content">
          <div className="ministries-intro">
            <p>{t('ministriesIntro1')}</p>
            <p>{t('ministriesIntro2')}</p>
          </div>
          <div className="ministries-loading">Loading...</div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ministries-page">
        <MinistriesHero title={t('ourMinistries')} />
        <section className="ministries-content">
          <div className="ministries-intro">
            <p>{t('ministriesIntro1')}</p>
            <p>{t('ministriesIntro2')}</p>
          </div>
          <div className="ministries-error">Error: {error}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="ministries-page">
      <MinistriesHero title={t('ourMinistries')} />

      <section className="ministries-content">
        <div className="ministries-intro">
          <p>{t('ministriesIntro1')}</p>
          <p>{t('ministriesIntro2')}</p>
        </div>

        {ministries.length === 0 && !childrenMinistry ? (
          <p className="ministries-none">{t('noMinistries')}</p>
        ) : (
          <div className="ministries-list">
            <article
              key={childrenMinistry.id}
              className="ministry-block ministry-block--image-left"
            >
              <div className="ministry-block-media">
                <img src={childrenMinistry.staticImage} alt={childrenMinistry.name} className="ministry-block-img" />
              </div>
              <div className="ministry-block-body">
                <h2 className="ministry-block-title">{childrenMinistry.name}</h2>
                <div className="ministry-block-description">
                  <p>{t('childrenMinistryPara1')}</p>
                  <p>{t('childrenMinistryPara2')}</p>
                </div>
                <Link to="/ministries/children" className="ministry-block-cta" onClick={scrollToTop}>
                  {t('learnMore').toUpperCase()}
                </Link>
              </div>
            </article>
            <article
              key={youthMinistry.id}
              className="ministry-block ministry-block--image-right"
            >
              <div className="ministry-block-media">
                <img src={youthMinistry.staticImage} alt={youthMinistry.name} className="ministry-block-img" />
              </div>
              <div className="ministry-block-body">
                <h2 className="ministry-block-title">{youthMinistry.name}</h2>
                <div className="ministry-block-description">
                  <p>{t('youthMinistryPara1')}</p>
                </div>
                <Link to="/ministries/youth" className="ministry-block-cta" onClick={scrollToTop}>
                  {t('learnMore').toUpperCase()}
                </Link>
              </div>
            </article>
            <article
              key={youngAdultsMinistry.id}
              className="ministry-block ministry-block--image-left"
            >
              <div className="ministry-block-media">
                <img src={youngAdultsMinistry.staticImage} alt={youngAdultsMinistry.name} className="ministry-block-img" />
              </div>
              <div className="ministry-block-body">
                <h2 className="ministry-block-title">{youngAdultsMinistry.name}</h2>
                <div className="ministry-block-description">
                  <p>{t('youngAdultsMinistryPara1')}</p>
                </div>
                <Link to="/ministries/young-adult" className="ministry-block-cta" onClick={scrollToTop}>
                  {t('learnMore').toUpperCase()}
                </Link>
              </div>
            </article>
            <article
              key={womenMinistry.id}
              className="ministry-block ministry-block--image-right"
            >
              <div className="ministry-block-media">
                <img src={womenMinistry.staticImage} alt={womenMinistry.name} className="ministry-block-img" />
              </div>
              <div className="ministry-block-body">
                <h2 className="ministry-block-title">{womenMinistry.name}</h2>
                <div className="ministry-block-description">
                  <p>{t('womenMinistryPara1')}</p>
                </div>
                <Link to="/ministries/women" className="ministry-block-cta" onClick={scrollToTop}>
                  {t('learnMore').toUpperCase()}
                </Link>
              </div>
            </article>
            <article
              key={menMinistry.id}
              className="ministry-block ministry-block--image-left"
            >
              <div className="ministry-block-media">
                <img src={menMinistry.staticImage} alt={menMinistry.name} className="ministry-block-img" />
              </div>
              <div className="ministry-block-body">
                <h2 className="ministry-block-title">{menMinistry.name}</h2>
                <div className="ministry-block-description">
                  <p>{t('menMinistryPara1')}</p>
                </div>
                <Link to="/ministries/men" className="ministry-block-cta" onClick={scrollToTop}>
                  {t('learnMore').toUpperCase()}
                </Link>
              </div>
            </article>
            <article
              key={marriageMinistry.id}
              className="ministry-block ministry-block--image-right"
            >
              <div className="ministry-block-media">
                <img src={marriageMinistry.staticImage} alt={marriageMinistry.name} className="ministry-block-img" />
              </div>
              <div className="ministry-block-body">
                <h2 className="ministry-block-title">{marriageMinistry.name}</h2>
                <div className="ministry-block-description">
                  <p>{t('marriageMinistryPara1')}</p>
                </div>
                <Link to="/ministries/marriage" className="ministry-block-cta" onClick={scrollToTop}>
                  {t('learnMore').toUpperCase()}
                </Link>
              </div>
            </article>
            {ministries.map((ministry, index) => (
              <article
                key={ministry.id}
                className={`ministry-block ministry-block--${index % 2 === 0 ? 'image-right' : 'image-left'}`}
              >
                <div className="ministry-block-media">
                  {ministry.image_url ? (
                    <img src={ministry.image_url} alt={ministry.name} className="ministry-block-img" />
                  ) : (
                    <div className="ministry-block-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="ministry-block-body">
                  <h2 className="ministry-block-title">{ministry.name}</h2>
                  {ministry.description && (
                    <div className="ministry-block-description">
                      {ministry.description.includes('\n')
                        ? ministry.description.split('\n').map((para, i) => (
                            <p key={i}>{para}</p>
                          ))
                        : <p>{ministry.description}</p>}
                    </div>
                  )}
                  <a href="#contact" className="ministry-block-cta">
                    {t('learnMore').toUpperCase()}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Ministries;
