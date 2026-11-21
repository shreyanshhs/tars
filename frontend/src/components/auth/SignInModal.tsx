import React, { useState } from 'react';
import { useTars } from '../../context/TarsContext';
import { Lock, User, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const { login, isMockMode } = useTars();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginId.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose?.();
      }, 500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (presetId: string) => {
    setLoginId(presetId);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-6 text-white relative">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-tight text-xl">TARS</span>
            <span className="text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded text-indigo-200">
              SECURE AUTH v0.4
            </span>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Sign in with your University Serial Number (USN) or Staff ID.
          </p>
          {isMockMode && (
            <div className="mt-3 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-[11px] border border-amber-400/30">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Offline Mock Mode is Active (Demo Accounts Enabled)</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Sign in failed: </span>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Session verified. Loading workspace...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              USN or Staff ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. 1AB25CS001 or H01"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Students: 1AB25CS001, 1AB25CS002, 1AB25CS003 • Faculty: F01..F08 • HOD: H01
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Quick presets (Mock Mode only) */}
          {isMockMode && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Demo Test Presets (Mock Mode Only)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('1AB25CS001')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-md border border-slate-200 transition-colors"
                >
                  Student (S001)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('F01')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-md border border-slate-200 transition-colors"
                >
                  Faculty (F01)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('H01')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 rounded-md border border-slate-200 transition-colors"
                >
                  HOD (H01)
                </button>
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || success}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : success ? (
                <span>Success!</span>
              ) : (
                <span>Sign In Securely</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
