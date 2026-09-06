"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const { signInWithOAuth, signInWithOtp, signInWithPassword, signUpWithPassword, resetPasswordForEmail, continueAsGuest } =
    useAuth();
  const [mode, setMode] = useState<"oauth" | "magic_link" | "password" | "guest" | "forgot_password">("oauth");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestInputName, setGuestInputName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async (provider: "google") => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) throw new Error(error);
    } catch (err: any) {
      setError(err?.message || "Failed to sign in with OAuth provider.");
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await signInWithOtp(email);
      if (error) throw error;
      setMessage("A magic sign-in link has been dispatched to your email!");
    } catch (err: any) {
      setError(err?.message || "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await resetPasswordForEmail(email);
      if (error) throw error;
      setMessage("Password reset instructions have been dispatched to your email!");
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await signUpWithPassword(email, password);
        if (error) throw error;
        setMessage("Account created! Please check your email to verify your address.");
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInputName.trim()) return;
    await continueAsGuest(guestInputName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-[#0B1120]/95 rounded-3xl p-6 sm:p-7 border border-white/15 shadow-2xl shadow-black/80 space-y-5 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss Button */}
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="flex justify-center mb-1">
            <AppLogo size="lg" className="mx-auto" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight">
            {mode === "guest"
              ? "Continue as Guest"
              : mode === "forgot_password"
              ? "Reset Password"
              : isSignUp
              ? "Create Your Account"
              : "Welcome to JobNotifier"}
          </h2>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {mode === "guest"
              ? "Enter your name to track applications during your visit."
              : mode === "forgot_password"
              ? "Enter your email address to receive password reset instructions."
              : "Track tech & AI internships across Canada and USA in real-time."}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Modes */}
        {mode === "guest" ? (
          <form onSubmit={handleGuestSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Your Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={guestInputName}
                onChange={(e) => setGuestInputName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full bg-[#050814]/80 border border-white/10 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/40 text-slate-100 placeholder:text-slate-500 px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={!guestInputName.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full btn-purple-pill text-sm disabled:opacity-50 cursor-pointer"
            >
              <span>Enter as Guest</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMode("oauth")}
              className="w-full text-center text-xs text-slate-400 hover:text-indigo-400 pt-1 cursor-pointer font-medium transition"
            >
              &larr; Back to sign-in options
            </button>
          </form>
        ) : mode === "forgot_password" ? (
          <form onSubmit={handleForgotPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#050814]/80 border border-white/10 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/40 text-slate-100 placeholder:text-slate-500 pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full btn-purple-pill text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Send Reset Instructions</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("password")}
              className="w-full text-center text-xs text-slate-400 hover:text-indigo-400 pt-1 cursor-pointer font-medium transition"
            >
              &larr; Back to password sign-in
            </button>
          </form>
        ) : mode === "magic_link" ? (
          <form onSubmit={handleMagicLink} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#050814]/80 border border-white/10 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/40 text-slate-100 placeholder:text-slate-500 pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full btn-purple-pill text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Send Magic Sign-In Link</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("password")}
              className="w-full text-center text-xs text-slate-400 hover:text-indigo-400 pt-1 cursor-pointer font-medium transition"
            >
              Use password instead
            </button>
          </form>
        ) : mode === "password" ? (
          <form onSubmit={handlePasswordAuth} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#050814]/80 border border-white/10 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/40 text-slate-100 placeholder:text-slate-500 pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot_password")}
                    className="text-xs text-slate-400 hover:text-indigo-400 cursor-pointer transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#050814]/80 border border-white/10 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/40 text-slate-100 placeholder:text-slate-500 pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full btn-purple-pill text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{isSignUp ? "Create Account" : "Sign In"}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => setMode("magic_link")}
                className="hover:text-indigo-400 cursor-pointer font-medium transition"
              >
                Send magic link
              </button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold cursor-pointer transition"
              >
                {isSignUp ? "Have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>
          </form>
        ) : (
          /* Default OAuth View */
          <div className="space-y-3.5">
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-full bg-white hover:bg-slate-100 text-[#050814] font-bold text-sm transition shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => setMode("guest")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm border border-white/10 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Continue as Guest</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Or with email
              </span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              onClick={() => setMode("password")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-transparent hover:bg-white/5 text-slate-300 hover:text-white font-semibold text-sm border border-white/10 transition cursor-pointer"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Sign In with Email & Password</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
