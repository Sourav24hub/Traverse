import { useState } from 'react';
import { login as loginApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

export default function Login({ onSignupClick }) {
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setLoading(true);
    setError(null);
    const res = await loginApi({ email: email.trim(), password });
    setLoading(false);
    
    if (res.ok) {
      login(res.data); // AuthContext will redirect via App state
    } else {
      setError(res.data?.error?.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Log in to continue your journey.</p>
        
        {error && (
          <div className="auth-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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
          <div className="auth-field">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading || !email.trim() || !password.trim()}>
            {loading ? 'Logging in...' : 'Log In →'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <button type="button" onClick={onSignupClick} className="auth-link">Sign up</button>
        </div>
      </div>
    </div>
  );
}
