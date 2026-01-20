import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    home: 'Home',
    about: 'About',
    ministries: 'Ministries',
    events: 'Events',
    sermons: 'Sermons',
    groups: 'Groups',
    contact: 'Contact',
    give: 'Give',
    login: 'Login',
    churchName: 'Graceland Bible Church',
    welcome: 'Welcome to',
    welcomeSubtext: 'Join us in worship and fellowship!',
    upcomingEvents: 'Upcoming Events',
    latestSermons: 'Latest Sermons',
    ourMinistries: 'Our Ministries',
    viewAll: 'View All',
    register: 'Register',
    watchNow: 'Watch Now',
    learnMore: 'Learn More',
    serviceTimes: 'Service Times',
    sundayMorning: 'Sunday Worship Service',
    sundayEvening: 'Wednesday Young Adults Service',
    wednesdayPrayer: 'Friday Evening Prayer',
    getInTouch: 'Get In Touch',
    address: 'Address',
    phoneNumber: 'Phone',
    emailAddress: 'Email',
    sendMessage: 'Send Message',
    yourName: 'Your Name',
    yourEmail: 'Your Email',
    subject: 'Subject',
    message: 'Message',
    noEvents: 'There is no upcoming events right now.',
    location: 'Location',
    noMinistries: 'No ministries available right now.',
    quickLinks: 'Quick Links',
    copyright: '© 2024 GBC. All rights reserved.',
  },
  mn: {
    home: 'Нүүр',
    about: 'Бидний тухай',
    ministries: 'Үйлчлэлүүд',
    events: 'Арга хэмжээ',
    sermons: 'Номлол',
    groups: 'Бүлгүүд',
    contact: 'Холбоо барих',
    give: 'Өргөх',
    login: 'Нэвтрэх',
    churchName: 'Ивээлт Нутаг Цуглаан',
    welcome: 'тавтай морилно уу!',
    welcomeSubtext: 'Бидэнтэй хамт үйлчлэл, нөхөрлөлд оролцоорой!',
    upcomingEvents: 'Удахгүй болох арга хэмжээ',
    latestSermons: 'Сүүлийн номлолууд',
    ourMinistries: 'Манай үйлчлэлүүд',
    viewAll: 'Бүгдийг үзэх',
    register: 'Бүртгүүлэх',
    watchNow: 'Үзэх',
    learnMore: 'Дэлгэрэнгүй',
    serviceTimes: 'Үйлчлэлийн цаг',
    sundayMorning: 'Ням гаригийн цуглаан',
    sundayEvening: 'Лхагва гаригийн залуучуудын цуглаан',
    wednesdayPrayer: 'Баасан гаригийн оройн залбирал',
    getInTouch: 'Бидэнтэй холбогдох',
    address: 'Хаяг',
    phoneNumber: 'Утас',
    emailAddress: 'Имэйл',
    sendMessage: 'Мессеж илгээх',
    yourName: 'Таны нэр',
    yourEmail: 'Таны имэйл',
    subject: 'Сэдэв',
    message: 'Мессеж',
    noEvents: 'Одоогоор арга хэмжээ байхгүй байна.',
    location: 'Байршил',
    noMinistries: 'Одоогоор үйлчлэл байхгүй байна.',
    quickLinks: 'Холбоосууд',
    copyright: '© 2024 Манай сүм. Бүх эрх хуулиар хамгаалагдсан.',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'mn' : 'en');
  };

  const t = (key) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}