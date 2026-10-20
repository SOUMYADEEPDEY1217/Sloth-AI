import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/firebaseService';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProviderConsoleGuide, setShowProviderConsoleGuide] =
    useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setShowProviderConsoleGuide(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const formatAuthError = (err: unknown): string => {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : '';
    const msg = err instanceof Error ? err.message : String(err);

    if (code === 'auth/operation-not-allowed') {
      setShowProviderConsoleGuide(true);
      return 'Email/Password sign-in is not yet enabled in your Firebase project. Use "Continue with Google" below, or enable Email/Password in Firebase Console → Authentication → Sign-in method.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Switch to Sign In or continue with Google.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completing authentication.';
    }
    return msg;
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setShowProviderConsoleGuide(false);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      onSuccess(
        `Signed in as ${user.displayName || user.email || 'SlothAI User'}`
      );
      onClose();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowProviderConsoleGuide(false);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const user = await signUpWithEmail(
          email,
          password,
          displayName.trim() || email.split('@')[0]
        );
        onSuccess(
          `Account created for ${user.displayName || user.email}. Cloud workspace sync is active.`
        );
      } else {
        const user = await signInWithEmail(email, password);
        onSuccess(
          `Welcome back, ${user.displayName || user.email || 'SlothAI User'}.`
        );
      }
      onClose();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slothai-auth-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/12 bg-[#0B0B0C] p-6 sm:p-7 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-[#FF6B1A]/20 blur-3xl"
        />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF9A35]">
              [ SLOTHAI ACCOUNT ]
            </span>
            <h2
              id="slothai-auth-title"
              className="mt-1 text-xl font-display font-bold text-[#F5F5F5]"
            >
              {mode === 'signin'
                ? 'Sign in to your Workspace'
                : 'Create your SlothAI Account'}
            </h2>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Sync your tasks, summaries, daily briefings, staged files, and
              preferences across sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-1 p-1 rounded-full bg-[#060606] border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black'
                : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black'
                : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="relative z-10 mt-4 p-3.5 rounded-xl border border-red-500/30 bg-red-950/25 flex items-start gap-2.5 text-xs text-[#F87171]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p>{error}</p>
              {showProviderConsoleGuide && (
                <p className="text-[11px] text-[#A1A1AA]">
                  To enable Email/Password in Firebase Console: open{' '}
                  <code className="font-mono text-[#FF9A35]">
                    console.firebase.google.com/project/slothai-72950/authentication/providers
                  </code>{' '}
                  and enable <strong>Email/Password</strong>.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Primary Google OAuth Button */}
        <div className="relative z-10 mt-5">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-full border border-white/15 bg-[#121215] hover:bg-white/[0.08] hover:border-[#FF9A35]/50 text-xs font-semibold text-[#F5F5F5] transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
              />
            </svg>
            <span>
              {mode === 'signin'
                ? 'Sign in with Google'
                : 'Sign up with Google'}
            </span>
          </button>
        </div>

        <div className="relative z-10 my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
            OR EMAIL &amp; PASSWORD
          </span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="relative z-10 space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={120}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black text-xs font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {mode === 'signin'
                    ? 'Sign In with Email'
                    : 'Create Account & Sync Data'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
