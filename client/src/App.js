import { useContext } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import UserContext, { UserProvider} from './context/UserContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import About from './components/About';
import Events from './components/Events';
import Ministries from './components/Ministries';
import Sermons from './components/Sermons';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Profile from './components/Profile';
import './styling/global.css';

function AppContent() {
  const { user, isLoading } = useContext(UserContext)

  if(isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Router>
      <Header />
      <div className="App">
        {user ? (
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/sermons" element={<Sermons />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>          
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/SignUp" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        )}       
      </div>
      <Contact />
      <Footer />
    </Router>
  )
}

function App() {
  return (
    <LanguageProvider>
      <UserProvider>
        <AppContent/>
      </UserProvider>      
    </LanguageProvider>
  );
}

export default App;
