import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('access_token', res.data.access_token);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '450px', margin: '0 auto' }}>
      <div className="logo">BuddyAI</div>
      <div className="welcome-header">
        <h2>Welcome back</h2>
        <p>Sign in to continue chatting with AI</p>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          className="input-field"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: '1rem' }}
        />
        <input
          type="password"
          className="input-field"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: '1.5rem' }}
        />
        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280' }}>
        Don't have an account?{' '}
        <a href="/register" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 500 }}>
          Create account
        </a>
      </p>
    </div>
  );
}

export default Login;