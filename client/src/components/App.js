import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import Home from './components/Home';
import Events from './components/Events';
import Ministries from './components/Ministries';
import Sermons from './components/Sermons';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './styling/global.css';

function App() {
  return (
    <LanguageProvider>
      <div className="App">
        <Header />
        <Home />
        <Events />
        <Ministries />
        <Sermons />
        <Contact />
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;
