"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Login error
      if (loginError) {
        console.error("Login error:", loginError);
        setError(loginError.message);
        setLoading(false);
        return;
      }

      // Check that a session was actually created
      if (!data.session) {
        console.error("No session returned after login");
        setError("Login succeeded but no session was created.");
        setLoading(false);
        return;
      }

      console.log("Login successful:", data.user?.email);
      console.log("Session created:", data.session);

      // Full page navigation so middleware can read the auth cookie
      window.location.href = "/";
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError("Failed to connect. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-[0.2em] text-white">
            EDGE X PRO
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Sign in to your trading workspace
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email Address
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-400 transition hover:text-blue-300 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Create Account */}
        <div className="mt-6 border-t border-slate-800 pt-6">
          <Link
            href="/signup"
            className="flex w-full items-center justify-center rounded-lg border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            Create Account
          </Link>
        </div>

      </div>
    </main>
  );
}