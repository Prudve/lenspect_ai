import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import './LoginPage.css';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      const target = location.state?.from?.pathname || '/overview';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!identifier.trim() || !password) {
      setFormError('Please enter both your officer identifier and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier, password);
      const target = location.state?.from?.pathname || '/overview';
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(
        err.message || 'Authentication failed. Please verify your officer credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setIdentifier('admin@legalmetrology.gov.in');
    setPassword('Admin@123');
    setFormError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Government Header */}
        <header className="login-header">
          <div className="login-emblem-badge">
            <ShieldCheck size={32} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div className="login-org-tag">Dept. of Consumer Affairs &bull; Govt. of India</div>
          <h1 className="login-title">Legal Metrology Portal</h1>
          <p className="login-subtitle">
            Senior Administrator & Enforcement Officer Authentication
          </p>
        </header>

        {/* Form Body */}
        <div className="login-body">
          {formError && (
            <div className="login-alert login-alert-error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{formError}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Username or Email Input */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Officer Identifier / Official Email
              </label>
              <div className="input-wrapper">
                <span className="input-icon-prefix">
                  <User size={18} />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. admin@legalmetrology.gov.in"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Security Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon-prefix">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your confidential password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
              id="login-submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Sign In to Enforcement Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="demo-credentials-box">
            <div className="demo-credentials-header">
              <span>Demo Administrator Account</span>
              <button
                type="button"
                className="demo-fill-btn"
                onClick={handleFillDemo}
              >
                Quick Fill
              </button>
            </div>
            <div className="demo-item">
              <span>Username:</span>
              <code>admin@legalmetrology.gov.in</code>
            </div>
            <div className="demo-item">
              <span>Password:</span>
              <code>Admin@123</code>
            </div>
          </div>
        </div>

        {/* Portal Footer */}
        <footer className="login-footer">
          <ShieldAlert size={14} color="#64748b" />
          <span>Restricted to Authorized Legal Metrology Officers under PC Rules, 2011</span>
        </footer>
      </div>
    </div>
  );
}

export default LoginPage;
