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
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Logout error:', error);
      }
    } else {
      // Navigate to login
      navigate('/login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const aboutSubItems = [
    { label: t('aboutUs'), href: '/about/us', isRoute: true },
    { label: t('ourStory'), href: '/about/story', isRoute: true },
    { label: t('ourBeliefs'), href: '/about/beliefs', isRoute: true },
  ];

  const navItems = [
    { label: t('home'), href: '/home', isRoute: true },
    { label: t('about'), href: '/about', isRoute: true, subItems: aboutSubItems },
    { label: t('ministries'), href: '/ministries', isRoute: true },
    { label: t('events'), href: '/events', isRoute: true },
    { label: t('sermons'), href: '/sermons', isRoute: true },
    { label: t('give'), href: 'https://gracelandbible.breezechms.com/give/online' },
    { label: t('contact'), href: '#contact' },    
  ];

  const handleNavClick = (href, isRoute) => {
    if (isRoute) {
      navigate(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
              item.subItems ? (
                <div key={item.href} className="nav-item-with-dropdown">
                  <span className="nav-link nav-link-trigger">{item.label}</span>
                  <div className="nav-dropdown">
                    {item.subItems.map(sub => (
                      <a
                        key={sub.href}
                        href={sub.href}
                        className="nav-dropdown-link"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(sub.href, sub.isRoute);
                        }}
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.isRoute) handleNavClick(item.href, true);
                    else window.location.href = item.href;
                  }}
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
                item.subItems ? (
                  <div key={item.href} className="nav-mobile-group">
                    <span className="nav-mobile-label">{item.label}</span>
                    {item.subItems.map(sub => (
                      <a
                        key={sub.href}
                        href={sub.href}
                        className="nav-mobile-link nav-mobile-sublink"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(sub.href);
                          setIsMenuOpen(false);
                        }}
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                ) : item.isRoute ? (
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