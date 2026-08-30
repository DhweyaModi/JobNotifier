"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error?: string }>;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithOAuth: async () => ({}),
  signInWithOtp: async () => ({}),
  signInWithPassword: async () => ({}),
  signUpWithPassword: async () => ({}),
  signOut: async () => {},
  isConfigured: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = !!supabase;

  // Sync user profile to Supabase database so admin can track sign-ins
  const syncUserProfile = async (authUser: User) => {
    if (!supabase) return;
    try {
      const email = authUser.email || "";

      // Upsert into users table
      await supabase.from("users").upsert(
        {
          id: authUser.id,
          email: email,
          platform: "web",
          webhook_url: "", // Default empty webhook for web users
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("Could not sync user profile:", err);
    }
  };

  useEffect(() => {
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
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOAuth = async (provider: "google" | "github") => {
    if (!supabase) return { error: "Supabase is not configured." };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to send magic link" };
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
        session,
        loading,
        signInWithOAuth,
        signInWithOtp,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
