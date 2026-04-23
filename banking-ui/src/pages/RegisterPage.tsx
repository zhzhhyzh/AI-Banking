import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { register as apiRegister, sendVerification, verifyEmail } from '../services/api';
import { UserPlus, Landmark, Mail, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

type Step = 'details' | 'verify' | 'complete';

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { setAuth } = useAuth();
  const [step, setStep] = useState<Step>('details');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendVerification(email);
      setStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await sendVerification(email);
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newCode = [...code];
    newCode[index] = value.slice(-1); // only last digit
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeInputs.current[5]?.focus();
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Step 1: Verify the email code
      await verifyEmail(email, fullCode);

      // Step 2: Complete registration
      const data = await apiRegister(username, email, password, phone || undefined);
      setAuth({
        token: data.token,
        username: data.username,
        userId: data.user_id,
        sessionId: data.session_id,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Please try again.');
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

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-1.5 text-sm ${step === 'details' ? 'text-blue-400' : 'text-green-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              step === 'details' ? 'border-blue-400 bg-blue-400/10' : 'border-green-400 bg-green-400/10'
            }`}>1</div>
            <span className="hidden sm:inline">Details</span>
          </div>
          <div className={`w-8 h-0.5 ${step !== 'details' ? 'bg-green-400' : 'bg-gray-600'}`} />
          <div className={`flex items-center gap-1.5 text-sm ${
            step === 'verify' ? 'text-blue-400' : step === 'details' ? 'text-gray-500' : 'text-green-400'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              step === 'verify' ? 'border-blue-400 bg-blue-400/10' : step === 'details' ? 'border-gray-600 bg-transparent' : 'border-green-400 bg-green-400/10'
            }`}>2</div>
            <span className="hidden sm:inline">Verify</span>
          </div>
        </div>

        <div className="bg-bank-card border border-bank-border rounded-2xl p-8">

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 'details' && (
            <>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                Sign Up
              </h2>

              <form onSubmit={handleSendCode} className="space-y-4">
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending code...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Continue &amp; Verify Email</>
                  )}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: Verify Email Code */}
          {step === 'verify' && (
            <>
              <button onClick={() => { setStep('details'); setError(''); }}
                className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Verify Your Email
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                We sent a 6-digit code to <span className="text-blue-400 font-medium">{email}</span>
              </p>

              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
                    Enter verification code
                  </label>
                  <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { codeInputs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold bg-bank-dark border border-bank-border rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || code.join('').length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Verify &amp; Create Account</>
                  )}
                </button>

                <p className="text-center text-gray-400 text-sm">
                  Didn't receive the code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-500">Resend in {resendCooldown}s</span>
                  ) : (
                    <button onClick={handleResendCode} disabled={loading}
                      className="text-blue-400 hover:text-blue-300 font-medium">
                      Resend Code
                    </button>
                  )}
                </p>
              </form>
            </>
          )}

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
