import { useState, useContext, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import '../styling/login.css';

const Login = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();
  const { setUser, refreshUser } = useContext(UserContext);
  const navigate = useNavigate();

  const validationSchema = useMemo(() => Yup.object({
    username: Yup.string()
      .trim()
      .required(t('fillAllFields')),
    password: Yup.string()
      .required(t('fillAllFields')),
  }), [t]);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setIsLoading(true);

      try {
        const userData = await api.login(values.username.trim(), values.password);
        setUser(userData);
        await refreshUser();
        navigate('/profile');
      } catch (err) {
        setError(err.message || t('loginError'));
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{t('login')}</h2>
        <p className="auth-subtitle">{t('loginSubtitle')}</p>
        
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
                autoComplete="current-password"
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

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || !formik.isValid}
          >
            {isLoading ? t('loggingIn') : t('login')}
          </button>
        </form>

        <p className="auth-footer">
          {t('noAccount')}{' '}
          <Link to="/SignUp" className="auth-link">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
