import { useState } from 'react';
import { MapPin, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/contact.css';

function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitMessage('');
    const payload = {
      ...formData,
      name: formData.name.trim() || 'Зочин'
    };
    try {
      await api.submitContact(payload);
      setSubmitMessage('Message sent successfully!');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setSubmitMessage('Error sending message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">
        <div className="section-header">
          <h2 className="section-title">{t('getInTouch')}</h2>
        </div>

        <div className="contact-grid">
          {/* Contact Info */}
          <div className="contact-info">
            <div className="info-item">
              <MapPin className="info-icon" />
              <div>
                <h3 className="info-title">{t('address')}</h3>
                <p className="info-text">1955 Geary Rd.<br />Walnut Creek,<br />CA 94597</p>
              </div>
            </div>
            
            <div className="info-item">
              <Mail className="info-icon" />
              <div>
                <h3 className="info-title">{t('emailAddress')}</h3>
                <p className="info-text">graceland@bible.church</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form">
            <input
              type="text"
              placeholder={t('yourName')}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="form-input"
            />
            {/* <input
              type="email"
              placeholder={t('yourEmail')}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="form-input"
            /> */}
            {/* <input
              type="text"
              placeholder={t('subject')}
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="form-input"
            /> */}
            <textarea
              placeholder={t('message')}
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              rows="5"
              className="form-textarea"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="form-button"
            >
              {submitting ? 'Sending...' : t('sendMessage')}
            </button>
            {submitMessage && (
              <p className={`submit-message ${submitMessage.includes('Error') ? 'error' : 'success'}`}>
                {submitMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;