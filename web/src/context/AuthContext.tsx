"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  guestName: string | null;
  session: Session | null;
  loading: boolean;
  signInWithOAuth: (provider: "google") => Promise<{ error?: string }>;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  continueAsGuest: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  guestName: null,
  session: null,
  loading: true,
  signInWithOAuth: async () => ({}),
  signInWithOtp: async () => ({}),
  signInWithPassword: async () => ({}),
  signUpWithPassword: async () => ({}),
  resetPasswordForEmail: async () => ({}),
  continueAsGuest: async () => {},
  signOut: async () => {},
  isConfigured: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = !!supabase;

  // Sync user profile to Supabase database so admin can track sign-ins
  const syncUserProfile = async (authUser: User) => {
    if (!supabase) return;
    try {
      const email = authUser.email || "";
      const name =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        (email ? email.split("@")[0] : "User");
      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        "";

      await supabase.from("users").upsert(
        {
          id: authUser.id,
          email: email,
          name: name,
          avatar_url: avatarUrl,
          platform: "web",
          last_sign_in_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("Could not sync user profile:", err);
    }
  };

  useEffect(() => {
    // Check saved guest name
    try {
      const savedGuest = localStorage.getItem("jobnotifier_guest_name");
      if (savedGuest) setGuestName(savedGuest);
    } catch (e) {
      console.warn("Could not load guest name:", e);
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUserProfile(session.user);
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUserProfile(session.user);
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = async (name: string) => {
    const trimmed = name.trim() || "Guest";
    setGuestName(trimmed);
    
    // Generate RFC4122 compliant UUID
    let guestId = "";
    try {
      const stored = localStorage.getItem("jobnotifier_guest_id");
      if (stored && isValidUUID(stored)) {
        guestId = stored;
      } else {
        guestId = generateUUID();
        localStorage.setItem("jobnotifier_guest_id", guestId);
      }
      localStorage.setItem("jobnotifier_guest_name", trimmed);
    } catch (e) {
      guestId = generateUUID();
    }

    // Trace guest user in Supabase
    if (supabase) {
      try {
        await supabase.from("users").upsert(
          {
            id: guestId,
            name: trimmed,
            email: `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_")}@guest.jobnotifier.com`,
            platform: "guest",
            last_sign_in_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("Could not record guest in Supabase:", err);
      }
    }
  };

  const signInWithOAuth = async (provider: "google") => {
    if (!supabase) return { error: "Supabase is not configured." };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to sign in" };
    }
  };

  const signInWithOtp = async (email: string) => {
    if (!supabase) return { error: "Supabase is not configured." };
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to send magic link" };
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!supabase) return { error: "Supabase is not configured." };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to send reset link" };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase is not configured." };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      if (data.user) syncUserProfile(data.user);
      return {};
    } catch (err: any) {
      return { error: err.message || "Invalid email or password" };
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase is not configured." };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) return { error: error.message };
      if (data.user) syncUserProfile(data.user);
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to sign up" };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem("jobnotifier_guest_name");
      localStorage.removeItem("jobnotifier_guest_id");
    } catch (e) {}
    setGuestName(null);

    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        guestName,
        session,
        loading,
        signInWithOAuth,
        signInWithOtp,
        signInWithPassword,
        signUpWithPassword,
        resetPasswordForEmail,
        continueAsGuest,
        signOut,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
