import { useLanguage } from '../context/LanguageContext';
import tamirImage from '../assets/leadership/tamir-lkhamsuren.webp';
import munkhErdeneImage from '../assets/leadership/munkh-erdene-baldandorj.webp';
import dejidsurenImage from '../assets/leadership/dejidsuren-gonchigbal.webp';
import enkhbatBoardImage from '../assets/leadership/enkhbat-munkhbold-board.webp';
import temuujinImage from '../assets/leadership/temuujin-ganbaatar.webp';
import boldbayarImage from '../assets/leadership/boldbayar-purevdorj.webp';
import goyotsetsegImage from '../assets/leadership/goyotsetseg-davgadorj.webp';
import bolorImage from '../assets/leadership/bolor-ganbold.webp';
import munkhchuluunImage from '../assets/leadership/munkhchuluun-chuluunkhuu.webp';
import zunbilegImage from '../assets/leadership/zunbileg-purevdorj.png';
import '../styling/about-us.css';

const boardMembers = [
  { name: 'Tamir Lkhamsuren', role: 'Chairman of Board', image: tamirImage },
  { name: 'Munkh-Erdene Baldandorj', role: 'Board Member', image: munkhErdeneImage, photoClass: 'leadership-photo--munkh-erdene' },
  { name: 'Dejidsuren Gonchigbal', role: 'Board Member', image: dejidsurenImage, photoClass: 'leadership-photo--dejidsuren' },
  { name: 'Enkhbat Munkhbold', role: 'Board Member', image: enkhbatBoardImage },
  { name: 'Temuujin Ganbaatar', role: 'Board Member', image: temuujinImage },
];

const administration = [
  { name: 'Munkh-Erdene Baldandorj', role: 'Pastor', image: munkhErdeneImage, photoClass: 'leadership-photo--munkh-erdene' },
  { name: 'Zunbileg Purevdorj', role: 'Secretary', image: zunbilegImage, splitName: true },
];

const ministryLeaders = [
  { name: 'Temuujin Ganbaatar', role: 'Worship Team', image: temuujinImage },
  { name: 'Enkhbat Munkhbold', role: "Men's Fellowship", image: enkhbatBoardImage },
  { name: 'Boldbayar Purevdorj', role: 'Youth Fellowship', image: boldbayarImage, photoClass: 'leadership-photo--boldbayar' },
  { name: 'Goyotsetseg Davgadorj', role: 'Women Fellowship', image: goyotsetsegImage },
  { name: 'Bolor Ganbold', role: "Children's Ministry", image: bolorImage, splitName: true },
  { name: 'Munkhchuluun Chuluunkhuu', role: 'Choir Ministry', image: munkhchuluunImage, photoClass: 'leadership-photo--munkhchuluun' },
];

function LeadershipCard({ person }) {
  return (
    <article className="leadership-card">
      <div className="leadership-photo-frame">
        <img
          className={`leadership-photo ${person.photoClass || ''}`.trim()}
          src={person.image}
          alt={person.name}
          loading="lazy"
          decoding="async"
        />
      </div>
      <h3>
        {person.splitName
          ? person.name.split(' ').map(namePart => <span className="leadership-name-line" key={namePart}>{namePart}</span>)
          : person.name}
      </h3>
      <p>{person.role}</p>
    </article>
  );
}

function LeadershipSection({ title, people }) {
  const sectionSlug = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <section className={`leadership-group leadership-group--${sectionSlug}`} aria-labelledby={`leadership-${sectionSlug}`}>
      <header className="leadership-group-heading">
        <span aria-hidden="true" />
        <h2 id={`leadership-${sectionSlug}`}>{title}</h2>
      </header>
      <div className="leadership-grid">
        {people.map(person => <LeadershipCard key={`${title}-${person.name}`} person={person} />)}
      </div>
    </section>
  );
}

function AboutUs() {
  const { t } = useLanguage();

  return (
    <main id="about-us" className="leadership-page">
      <section className="leadership-hero" aria-labelledby="about-us-title">
        <div className="leadership-shell leadership-hero-content">
          <p className="leadership-eyebrow">Graceland Bible Church</p>
          <h1 id="about-us-title">{t('aboutUs')}</h1>
          <p className="leadership-intro">{t('aboutUsContent')}</p>
        </div>
      </section>

      <div className="leadership-shell leadership-content">
        <LeadershipSection title="Board" people={boardMembers} />
        <LeadershipSection title="Administration" people={administration} />
        <LeadershipSection title="Ministry Leaders" people={ministryLeaders} />
      </div>
    </main>
  );
}

export default AboutUs;
