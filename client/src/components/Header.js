import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MN, US } from 'country-flag-icons/react/3x2';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import logoImage from '../assets/logo_with_name.png';
import '../styling/header.css';

function Header() {
  const { user, setUser } = useContext(UserContext)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate()

  const handleAuthClick = async () => {
    if (user) {
      // Logout
      try {
        await api.logout();
        setUser(null);
        navigate('/home');
      } catch (error) {
        console.error('Logout error:', error);
      }
    } else {
      // Navigate to login
      navigate('/login');
    }
  };

  const navItems = [
    { label: t('home'), href: '/home', isRoute: true },
    { label: t('about'), href: '#about' },
    { label: t('ministries'), href: '#ministries' },
    { label: t('events'), href: '#events' },
    { label: t('sermons'), href: '#sermons' },
    { label: t('profile'), href: '/profile', isRoute: true },
    { label: t('give'), href: '#give' },
    { label: t('contact'), href: '#contact' },    
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">
              <img src={logoImage} alt={t('churchName')} className="logo-image" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            {navItems.map(item => (
              item.isRoute ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                >
                  {item.label}
                </a>
              )
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
            
            <button 
              className={user ? "logout-button" : "login-button"}
              onClick={handleAuthClick}
            >
              {user ? t('logout') : t('login')}
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
                item.isRoute ? (
                  <a
                    key={item.href}
                    href={item.href}
                    className="nav-mobile-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.href);
                      setIsMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className="nav-mobile-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              ))}
              <button 
                className={user ? "logout-button-mobile" : "login-button-mobile"}
                onClick={() => {
                  handleAuthClick();
                  setIsMenuOpen(false);
                }}
              >
                {user ? t('logout') : t('login')}
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;