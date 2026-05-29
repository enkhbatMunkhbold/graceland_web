import { useLanguage } from '../context/LanguageContext';
import MinistryContentField from './MinistryContentField';
import '../styling/ministry-detail.css';

function MinistryPage({ pageId, slug, titleKey }) {
  const { t } = useLanguage();

  return (
    <section id={`${pageId}-ministry`} className={`ministry-detail-section ministry-page--${pageId}`}>
      <div className="ministry-page-container">
        <div className="section-header">
          <h2 className="section-title">{t(titleKey)}</h2>
        </div>
        <div className="ministry-page-canvas">
          <MinistryContentField slug={slug} variant="canvas" />
        </div>
      </div>
    </section>
  );
}

export default MinistryPage;
