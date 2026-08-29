"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      console.log("Password reset response:", data);

      if (error) {
        console.error("Password reset error:", error);

        setErrorMessage(
          typeof error.message === "string" && error.message.length > 0
            ? error.message
            : "Unable to send the password reset email. Please try again later."
        );

        return;
      }

      setMessage(
        "Password reset link sent successfully! Please check your inbox and spam folder."
      );
    } catch (err: unknown) {
      console.error("Unexpected password reset error:", err);

      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "Something went wrong. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wide text-white">
            Forgot Password
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Enter your email address and we'll send you a password reset link.
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-5">

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

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {errorMessage}
            </div>
          )}

          {message && (
            <div
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

        </form>

        <div className="mt-6 border-t border-slate-800 pt-6">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            ← Back to Login
          </Link>
        </div>

      </div>
    </main>
  );
}