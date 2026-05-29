import { useLanguage } from '../context/LanguageContext';
import { getStatementOfFaith } from '../content/statementOfFaith';
import '../styling/about.css';

function OurBeliefs() {
  const { language } = useLanguage();
  const statement = getStatementOfFaith(language);

  return (
    <section id="our-beliefs" className="beliefs-section">
      <div className="beliefs-container">
        <article className="beliefs-document-sheet" aria-label="Statement of Faith">
          <h1 className="beliefs-document-title">Statement of Faith</h1>

          <p className="beliefs-document-intro">
            As members of the{' '}
            <a
              href="https://www.sbc.net"
              className="beliefs-document-intro-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Southern Baptist Convention
            </a>
            , we believe
          </p>

          <div className="beliefs-document-body">
            {statement.sections.map((section) => (
              <section key={section.title} className="beliefs-document-section">
                <h2 className="beliefs-document-section-title">{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export default OurBeliefs;
