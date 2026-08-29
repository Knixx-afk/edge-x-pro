"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleResetPassword(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setMessage(
        "Password updated successfully! Redirecting to login..."
      );

      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, 2000);

    } catch (err) {
      console.error(err);

      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wide text-white">
            Reset Password
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Enter your new password below.
          </p>
        </div>

        <form
          onSubmit={handleResetPassword}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              New Password
            </label>

            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Confirm New Password
            </label>

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-6">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            Back to Login
          </Link>
        </div>

      </div>
    </main>
  );
}