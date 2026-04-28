import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../services/api';
import { LogIn, Landmark } from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiLogin(username, password);
      setAuth({
        token: data.token,
        username: data.username,
        userId: data.user_id,
        sessionId: data.session_id,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bank-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 mb-4">
            <Landmark className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">ZHYBank</h1>
          <p className="text-gray-400 mt-2">AI-Managed Banking</p>
        </div>

        <div className="bg-bank-card border border-bank-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-bank-dark border border-bank-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bank-dark border border-bank-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="text-blue-400 hover:text-blue-300 font-medium">
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
