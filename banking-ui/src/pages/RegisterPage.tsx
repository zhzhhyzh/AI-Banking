import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { register as apiRegister } from '../services/api';
import { UserPlus, Landmark, Loader2 } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRegister(username, email, password, phone || undefined);
      setAuth({
        token: data.token,
        username: data.username,
        userId: data.user_id,
        sessionId: data.session_id,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
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
          <h1 className="text-3xl font-bold text-white">JavaBank</h1>
          <p className="text-gray-400 mt-2">Create Your Account</p>
        </div>

        <div className="bg-bank-card border border-bank-border rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Sign Up
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-bank-dark border border-bank-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Choose a username" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-bank-dark border border-bank-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bank-dark border border-bank-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Min 6 characters" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone (optional)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-bank-dark border border-bank-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="+1 (555) 000-0000" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
