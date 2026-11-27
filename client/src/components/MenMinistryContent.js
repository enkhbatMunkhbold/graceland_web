import { useLanguage } from '../context/LanguageContext';

const content = {
  mn: [
    'Манай чуулган 2006 онд First Mongolian Christian Church (FMCC) нэрээр байгуулагдахад гэр бүлтэй эрчүүд Аав нарын Нөхөрлөлд, харин залуу эрэгтэй, эмэгтэйчүүд Залуучуудын Нөхөрлөлд хамтдаа хамрагддаг байв. Аав нарын Нөхөрлөлийг Отгонбаяр пастор (Оогий пастор) анх удирдаж байлаа. 2018–2019 онд Энхтөр хэсэг хугацаанд нөхөрлөлийн ахлагчаар үйлчилж, дараа нь Оогий пастор үргэлжлүүлэн удирдсан.',
    'Оогий пасторын үед манай чуулган Аризона мужид Навахо ард түмний дунд үйлчилдэг христийн пасторууд болон илгээлтийн эзэдтэй холбоо тогтоож, хамтран ажиллаж эхэлсэн.',
    '2020 онд Оогий пастор Монгол руу явж, Мөөжиг пастор ирсний дараа Аав нарын Нөхөрлөл өргөжин, чуулганы насанд хүрсэн бүх эрчүүдийг хамарсан Эрчүүдийн Үйлчлэл гэдэг болсон. 2020 оноос эхлэн үйлчлэлийн ахлагч нар цуглааны бүх гишүүдийн хурлаар сонгогддог болсон. Энэ үеэс Эрхэмбат, дараа нь Отгонбаяр (Отгоо) үйлчлэлийн ахлагчаар үйлчилсэн.',
    '2020 болон 2021 онд манай чуулганы эрчүүдийн төлөөлөл Аризона муж дахь Навахо үндэстний нутагт зочилсон. Эдгээр айлчлалын үеэр тэд чуулганыхаа нэрийн өмнөөс монгол гэр бэлэглэж байлаа.',
    'Зун боломж гарвал хэд хоногоор хамтдаа аялах нь манай үйлчлэлийн нэг сайхан уламжлал байв. Бид Нью-Йорк хот, Вашингтон Ди Си, Аризона муж дахь Навахо үндэстний нутаг зэрэг газруудаар аялж байлаа. Хамгийн сүүлд 2022 оны зун Айдахо муж руу аялж, Йеллоустоун үндэсний цэцэрлэгт хүрээлэнгээр зочилсон.',
    '2025 оноос Энхбат Graceland Bible Church (хуучнаар FMCC)-ийн Эрчүүдийн Үйлчлэлийн ахлагчаар үйлчилж байна. Бид сар бүр нэг удаа цуглаж, хоол, цай, кофегоо хуваалцангаа Библиэс хамтдаа суралцдаг. Гэр бүлдээ, ажил дээрээ, чуулгандаа Христийг дагадаг эр хүн байх нь өдөр тутмын амьдралд хэрхэн илэрдэг талаар ярилцаж, туршлагаасаа хуваалцан, итгэлээрээ өсөхөд нэгнээ урамшуулдаг.',
    'Бид 2027 оны зун хамтын аяллын уламжлалаа сэргээхээр төлөвлөж байна. Чуулганыхаа насанд хүрсэн бүх эрчүүдийг сар бүрийн уулзалтад урьж байна.',
  ],
  en: [
    'Our church was founded in 2006 as First Mongolian Christian Church (FMCC). In those early years, married men gathered in the Fathers’ Fellowship, while young men and women met together in the Youth Fellowship. Pastor Otgonbayar, known as Pastor Oogii, first led the Fathers’ Fellowship. Enkhtur served as its leader for a time during 2018–2019, after which Pastor Oogii resumed leading the group.',
    'During Pastor Oogii’s time at the church, we began working with Christian pastors and missionaries serving the Navajo people in Arizona.',
    'In 2020, after Pastor Oogii left for Mongolia and Pastor Mooji arrived, the Fathers’ Fellowship expanded to include all adult men in the church and became the Men’s Ministry. Since 2020, ministry leaders have been elected at meetings of the full church membership. Erkhembat served as ministry leader during this period, followed by Otgonbayar, known as Otgoo.',
    'In 2020 and 2021, men from our church traveled to the Navajo Nation in Arizona. During those visits, they presented a traditional Mongolian ger as a gift on behalf of the congregation.',
    'Whenever possible, we made time each summer to spend a few days traveling together. Over the years, our trips have taken us to New York City, Washington, D.C., and the Navajo Nation in Arizona. On our most recent trip, in the summer of 2022, we traveled to Idaho and visited Yellowstone National Park.',
    'Since 2025, Enkhbat has led the Men’s Ministry at Graceland Bible Church (formerly FMCC). We gather once a month to share food, coffee, and tea and study Scripture together. We talk about what it means to follow Christ as men at home, at work, and in the church. We share our experiences and encourage one another as we grow in our faith.',
    'We’re planning to resume our summer trips in 2027. All adult men in our church are welcome to join us at our monthly gatherings.',
  ],
};

const images = [
  { after: 0, src: '/images/ministries/men/navajo-partnership.jpg' },
  { after: 2, src: '/images/ministries/men/navajo-visit.jpg' },
  { after: 4, src: '/images/ministries/men/mens-ministry-gathering.jpg' },
];

function MenMinistryContent() {
  const { language } = useLanguage();
  const paragraphs = content[language] || content.en;
  const alt = language === 'mn' ? 'Эрчүүдийн үйлчлэлийн зураг' : "Men’s Ministry";

  return (
    <div className="ministry-imported-content ministry-static-content">
      {paragraphs.map((paragraph, index) => {
        const image = images.find(item => item.after === index);
        return (
          <p key={paragraph}>
            {image && (
              <img
                className="ministry-image-wrap-left"
                src={image.src}
                alt={alt}
                loading="lazy"
                decoding="async"
              />
            )}
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}

export default MenMinistryContent;
