import { useState } from 'react';
import { Book, Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MN, US } from 'country-flag-icons/react/3x2';
import '../styling/header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  const navItems = [
    { label: t('home'), href: '#home' },
    { label: t('about'), href: '#about' },
    { label: t('ministries'), href: '#ministries' },
    { label: t('events'), href: '#events' },
    { label: t('sermons'), href: '#sermons' },
    { label: t('contact'), href: '#contact' },
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">
              <Book className="logo-icon-svg" />
            </div>
            <span className="logo-text">
              {language === 'en' ? 'Graceland Bible Church' : 'Ивээлт Нутаг Цуглаан'}
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="nav-link"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Language Toggle & Actions */}
          <div className="header-actions">
            <button
              onClick={toggleLanguage}
              className="language-toggle"
            >
              {language === 'en' ? (
                <MN className="flag-icon" />
              ) : (
                <US className="flag-icon" />
              )}
              <span className="language-text">{language === 'en' ? 'MN' : 'EN'}</span>
            </button>
            
            <button className="give-button">
              {t('give')}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="mobile-menu-button"
            >
              {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="nav-mobile">
            <nav className="nav-mobile-content">
              {navItems.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="nav-mobile-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <button className="give-button-mobile">
                {t('give')}
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;