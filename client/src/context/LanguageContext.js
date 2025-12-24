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
    welcome: 'Welcome to Our Church!',
    welcomeSubtext: 'Join us in worship and fellowship',
    upcomingEvents: 'Upcoming Events',
    latestSermons: 'Latest Sermons',
    ourMinistries: 'Our Ministries',
    viewAll: 'View All',
    register: 'Register',
    watchNow: 'Watch Now',
    learnMore: 'Learn More',
    serviceTimes: 'Service Times',
    sundayMorning: 'Sunday Morning Worship',
    sundayEvening: 'Sunday Evening Service',
    wednesdayPrayer: 'Wednesday Prayer Meeting',
    getInTouch: 'Get In Touch',
    address: 'Address',
    phoneNumber: 'Phone',
    emailAddress: 'Email',
    sendMessage: 'Send Message',
    yourName: 'Your Name',
    yourEmail: 'Your Email',
    subject: 'Subject',
    message: 'Message',
    noEvents: 'No upcoming events',
    location: 'Location',
    noMinistries: 'No ministries available',
    quickLinks: 'Quick Links',
    copyright: '© 2024 Our Church. All rights reserved.',
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
    welcome: 'Манай сүмд тавтай морилно уу!',
    welcomeSubtext: 'Бидэнтэй хамт мөргөл, нөхөрлөлд оролцоорой',
    upcomingEvents: 'Удахгүй болох арга хэмжээ',
    latestSermons: 'Сүүлийн номлолууд',
    ourMinistries: 'Манай үйлчлэлүүд',
    viewAll: 'Бүгдийг үзэх',
    register: 'Бүртгүүлэх',
    watchNow: 'Үзэх',
    learnMore: 'Дэлгэрэнгүй',
    serviceTimes: 'Үйлчлэлийн цаг',
    sundayMorning: 'Ням гаригийн өглөөний мөргөл',
    sundayEvening: 'Ням гаригийн оройн үйлчлэл',
    wednesdayPrayer: 'Лхагва гаригийн залбирлын цаг',
    getInTouch: 'Холбогдох',
    address: 'Хаяг',
    phoneNumber: 'Утас',
    emailAddress: 'Имэйл',
    sendMessage: 'Мессеж илгээх',
    yourName: 'Таны нэр',
    yourEmail: 'Таны имэйл',
    subject: 'Сэдэв',
    message: 'Мессеж',
    noEvents: 'Удахгүй болох арга хэмжээ байхгүй',
    location: 'Байршил',
    noMinistries: 'Үйлчлэл байхгүй байна',
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