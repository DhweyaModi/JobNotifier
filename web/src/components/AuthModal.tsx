"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight, UserCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const {
    signInWithOAuth,
    signInWithOtp,
    signInWithPassword,
    signUpWithPassword,
    continueAsGuest,
    isConfigured,
  } = useAuth();

  const [mode, setMode] = useState<"oauth" | "magic_link" | "password" | "guest">("oauth");
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [guestNameInput, setGuestNameInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleGuestEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNameInput.trim()) {
      setMessage({ type: "error", text: "Please enter your name to continue as guest." });
      return;
    }
    setLoading(true);
    try {
      await continueAsGuest(guestNameInput.trim());
      if (onClose) onClose();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to continue as guest." });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        if (error.toLowerCase().includes("not enabled") || error.toLowerCase().includes("unsupported provider")) {
          setMessage({
            type: "error",
            text: `${provider === "google" ? "Google" : "GitHub"} OAuth is not enabled in your Supabase dashboard yet. Use Email sign-in or Continue as Guest below.`,
          });
        } else {
          setMessage({ type: "error", text: error });
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to initiate sign-in." });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        setMessage({ type: "error", text: error });
      } else {
        setMessage({
          type: "success",
          text: `Check your inbox! We've sent a magic sign-in link to ${email}.`,
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to send magic link." });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: "error", text: "Please provide both email and password." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await signUpWithPassword(email, password);
        if (error) {
          setMessage({ type: "error", text: error });
        } else {
          setMessage({
            type: "success",
            text: "Account created! You can now sign in with your email and password.",
          });
        }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setMessage({ type: "error", text: error });
        } else {
          if (onClose) onClose();
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Authentication error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10">
        {!isMandatory && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30 text-white">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Dhweya&apos;s Job Notifier
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Sign in or enter your name to explore live tech & AI internships, save preferences, and track applications.
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium mb-5 flex items-start gap-2 border ${
              message.type === "success"
                ? "bg-emerald-950/70 border-emerald-800/80 text-emerald-300"
                : "bg-red-950/70 border-red-800/80 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Mode Selector / Main Form */}
        {mode === "guest" ? (
          /* Guest Name Entry Form */
          <form onSubmit={handleGuestEntry} className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1">
              <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Continue as Guest</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Enter your name so we can personalize your dashboard experience.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={guestNameInput}
                onChange={(e) => setGuestNameInput(e.target.value)}
                placeholder="e.g. Alex, Sam, Dhweya"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !guestNameInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Enter Dashboard as Guest &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("oauth")}
              className="w-full text-center text-xs text-slate-400 hover:text-indigo-300 pt-1 cursor-pointer"
            >
              &larr; Back to sign-in options
            </button>
          </form>
        ) : mode === "magic_link" ? (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Send Magic Sign-In Link</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("password")}
              className="w-full text-center text-xs text-slate-400 hover:text-indigo-300 pt-1"
            >
              Use password instead
            </button>
          </form>
        ) : mode === "password" ? (
          <form onSubmit={handlePasswordAuth} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{isSignUp ? "Create Account" : "Sign In"}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => setMode("magic_link")}
                className="hover:text-indigo-300"
              >
                Send magic link
              </button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>
          </form>
        ) : (
          /* Default OAuth + Guest View */
          <div className="space-y-3">
            {/* Continue with Google */}
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
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

            {/* Continue with GitHub */}
            <button
              onClick={() => handleOAuth("github")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
            </button>

            {/* Continue as Guest Button */}
            <button
              onClick={() => setMode("guest")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-sm border border-indigo-500/40 transition shadow-md cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Continue as Guest (Enter Name)</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Or with email
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              onClick={() => setMode("password")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/60 transition cursor-pointer"
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
