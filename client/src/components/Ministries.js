import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/ministries.css';

import childrenImage from '../assets/Children.jpg';
import interhighImage from '../assets/Interhigh.jpg';

function Ministries() {
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

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
        <section className="ministries-hero">
          <div className="ministries-hero-overlay" />
          <h1 className="ministries-hero-title">
            <span className="ministries-hero-line">{t('ourMinistries').split(' ')[0]}</span>
            <span className="ministries-hero-line">{t('ourMinistries').split(' ').slice(1).join(' ')}</span>
          </h1>
        </section>
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
        <section className="ministries-hero">
          <div className="ministries-hero-overlay" />
          <h1 className="ministries-hero-title">
            <span className="ministries-hero-line">{t('ourMinistries').split(' ')[0]}</span>
            <span className="ministries-hero-line">{t('ourMinistries').split(' ').slice(1).join(' ')}</span>
          </h1>
        </section>
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
      <section className="ministries-hero">
        <div className="ministries-hero-overlay" />
        <h1 className="ministries-hero-title">
          <span className="ministries-hero-line">{t('ourMinistries').split(' ')[0]}</span>
          <span className="ministries-hero-line">{t('ourMinistries').split(' ').slice(1).join(' ')}</span>
        </h1>
      </section>

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
                <a href="#contact" className="ministry-block-cta">
                  {t('learnMore').toUpperCase()}
                </a>
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
                <a href="#contact" className="ministry-block-cta">
                  {t('learnMore').toUpperCase()}
                </a>
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
