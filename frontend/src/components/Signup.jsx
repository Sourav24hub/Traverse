import { useState } from 'react';
import { signupStart, signupVerify } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

export default function Signup({ onLoginClick }) {
  const { login } = useAuth();
  
  const [step, setStep] = useState(1); // 1: email, 2: otp + username + password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError(null);
    const res = await signupStart(email.trim());
    setLoading(false);
    
    if (res.ok) {
      setStep(2);
    } else {
      setError(res.data?.error?.message || 'Failed to send OTP.');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !username.trim() || !password.trim()) return;
    
    setLoading(true);
    setError(null);
    const res = await signupVerify({ 
      email: email.trim(), 
      otp: otp.trim(), 
      username: username.trim(), 
      password 
    });
    setLoading(false);
    
    if (res.ok) {
      login(res.data); // AuthContext will redirect via App state
    } else {
      setError(res.data?.error?.message || 'Failed to verify OTP or create account.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create an Account</h1>
        <p className="auth-subtitle">Join Traverse to start planning your next journey.</p>
        
        {error && (
          <div className="auth-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="auth-field">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading || !email.trim()}>
              {loading ? 'Sending...' : 'Send OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="auth-form">
            <div className="auth-field">
              <label>OTP Code</label>
              <input 
                type="text" 
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                placeholder="6-digit code"
                required
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label>Choose a Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="e.g. TravelNinja"
                required
              />
            </div>
            <div className="auth-field">
              <label>Create a Password</label>
              <div className="auth-password-wrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                  minLength="6"
                />
                <button 
                  type="button" 
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="auth-btn" disabled={loading || !otp.trim() || !username.trim() || !password.trim()}>
              {loading ? 'Creating...' : 'Create Account →'}
            </button>
            <button type="button" className="auth-link-btn" onClick={() => setStep(1)}>
              ← Back to Email
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account? <button type="button" onClick={onLoginClick} className="auth-link">Log in</button>
        </div>
      </div>
    </div>
  );
}
