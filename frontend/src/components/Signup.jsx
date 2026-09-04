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
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
                minLength="6"
              />
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
