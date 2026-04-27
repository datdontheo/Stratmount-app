import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@stratmount.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAutoSignIn = async () => {
      setLoading(true);
      try {
        const data = await api.post('/auth/login', { email, password });
        login(data.user, data.token);
        if (data.user.mustChangePassword) {
          navigate('/change-password');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        setLoading(false);
        console.log('Auto sign-in skipped (likely first load or connection issue)');
      }
    };
    handleAutoSignIn();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      login(data.user, data.token);
      if (data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-xl mb-4">
            <span className="text-black font-heading font-bold text-xl">SM</span>
          </div>
          <h1 className="font-heading font-bold text-3xl text-white tracking-tight">STRAT MOUNT</h1>
          <p className="text-text-secondary text-sm mt-1">Business Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="you@stratmount.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-text-tertiary text-xs mt-6">
          Ghana · UAE · UK — Strat Mount &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
