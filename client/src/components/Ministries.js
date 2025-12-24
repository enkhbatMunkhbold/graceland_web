import React, { useState, useEffect } from 'react';
import { Users, Heart, Book, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/ministries.css';

function Ministries() {
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    api.getMinistries()
      .then(data => {
        setMinistries(data.slice(0, 4));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ministries:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const icons = [Users, Heart, Book, Calendar];

  if (loading) {
    return (
      <section id="ministries" className="ministries-section">
        <div className="ministries-container">
          <h2 className="section-title">{t('ourMinistries')}</h2>
          <div className="loading">Loading...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="ministries" className="ministries-section">
        <div className="ministries-container">
          <h2 className="section-title">{t('ourMinistries')}</h2>
          <div className="error">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="ministries" className="ministries-section">
      <div className="ministries-container">
        <div className="section-header">
          <h2 className="section-title">{t('ourMinistries')}</h2>
        </div>

        {ministries.length === 0 ? (
          <p className="no-ministries">{t('noMinistries')}</p>
        ) : (
          <div className="ministries-grid">
            {ministries.map((ministry, index) => {
              const Icon = icons[index % icons.length];
              return (
                <div key={ministry.id} className="ministry-card">
                  <div className="ministry-icon-wrapper">
                    <Icon className="ministry-icon" />
                  </div>
                  <h3 className="ministry-title">{ministry.name}</h3>
                  <p className="ministry-description">{ministry.description}</p>
                  <button className="ministry-button">
                    {t('learnMore')} →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Ministries;