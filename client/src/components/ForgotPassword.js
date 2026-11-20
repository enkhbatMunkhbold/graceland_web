import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/login.css';

export default function ForgotPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [username, setUsername] = useState('Boojoo');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestCode = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.requestPasswordReset(username.trim());
      setMessage(result.message);
      setStep('confirm');
    } catch (requestError) {
      setError(requestError.message || t('recoveryUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async event => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError(t('passwordTooShort'));
    if (password !== confirmPassword) return setError(t('passwordsDoNotMatch'));
    setBusy(true);
    try {
      await api.confirmPasswordReset(username.trim(), code.trim(), password);
      navigate('/login', { replace: true });
    } catch (resetError) {
      setError(resetError.message || t('invalidRecoveryCode'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{t('forgotPassword')}</h2>
        <p className="auth-subtitle">{step === 'request' ? t('recoveryIntro') : t('recoveryCodeIntro')}</p>
        {message && <div className="auth-success" role="status">{message}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {step === 'request' ? (
          <form className="auth-form" onSubmit={requestCode}>
            <div className="form-group">
              <label htmlFor="recovery-username">{t('username')}</label>
              <input id="recovery-username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required />
            </div>
            <button className="auth-button" type="submit" disabled={busy}>{busy ? t('sendingCode') : t('sendRecoveryCode')}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={resetPassword}>
            <div className="form-group">
              <label htmlFor="recovery-code">{t('recoveryCode')}</label>
              <input id="recovery-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" required />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">{t('newPassword')}</label>
              <input id="new-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-new-password">{t('confirmPassword')}</label>
              <input id="confirm-new-password" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            </div>
            <button className="auth-button" type="submit" disabled={busy || code.length !== 6}>{busy ? t('resettingPassword') : t('resetPassword')}</button>
          </form>
        )}
        <p className="auth-footer"><Link className="auth-link" to="/login">{t('backToLogin')}</Link></p>
      </div>
    </div>
  );
}
