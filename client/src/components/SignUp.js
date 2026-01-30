import { useState, useContext, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/signup.css';

const SignUp = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useLanguage();
  const { setUser, refreshUser } = useContext(UserContext);
  const navigate = useNavigate();

  const validationSchema = useMemo(() => Yup.object({
    username: Yup.string()
      .trim()
      .min(3, t('usernameTooShort'))
      .required(t('fillAllFields')),
    email: Yup.string()
      .trim()
      .email(t('invalidEmail'))
      .required(t('fillAllFields')),
    password: Yup.string()
      .min(6, t('passwordTooShort'))
      .required(t('fillAllFields')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('passwordsDoNotMatch'))
      .required(t('fillAllFields')),
  }), [t]);

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setIsLoading(true);

      try {
        const userData = await api.signup(values.username.trim(), values.email.trim(), values.password);
        setUser(userData);
        await refreshUser();
        navigate('/profile');
      } catch (err) {
        setError(err.message || t('signupError'));
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{t('signUp')}</h2>
        <p className="auth-subtitle">{t('signUpSubtitle')}</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={formik.handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">{t('username')}</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder={t('usernamePlaceholder')}
              disabled={isLoading}
              autoComplete="username"
            />
            {formik.touched.username && formik.errors.username && (
              <div className="form-error">{formik.errors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder={t('emailPlaceholder')}
              disabled={isLoading}
              autoComplete="email"
            />
            {formik.touched.email && formik.errors.email && (
              <div className="form-error">{formik.errors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder={t('passwordPlaceholder')}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formik.touched.password && formik.errors.password && (
              <div className="form-error">{formik.errors.password}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('confirmPassword')}</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder={t('confirmPasswordPlaceholder')}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
              <div className="form-error">{formik.errors.confirmPassword}</div>
            )}
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || !formik.isValid}
          >
            {isLoading ? t('signingUp') : t('signUp')}
          </button>
        </form>

        <p className="auth-footer">
          {t('haveAccount')}{' '}
          <Link to="/login" className="auth-link">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
