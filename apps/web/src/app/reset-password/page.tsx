"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Plain window.location (not useSearchParams) to keep this page
  // statically prerenderable — mirrors the register page's ?ref= pattern.
  // window is unavailable at SSR time, so reading it into render-affecting
  // state necessarily happens in an effect, not a lazy useState initializer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Set a new password</h1>

        {done ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Password updated. Redirecting to log in...
          </p>
        ) : token === null ? null : !token ? (
          <p className="text-sm text-red-600">This reset link is missing a token.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              New password
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium text-zinc-950 dark:text-zinc-50">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
