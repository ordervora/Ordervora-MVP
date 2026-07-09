"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { verifyEmail } from "@/lib/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  // window is unavailable at SSR time, so reading the token into
  // render-affecting state necessarily happens in an effect.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      setError("This verification link is missing a token.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Email verification</h1>

        {status === "pending" && <p className="text-sm text-zinc-700 dark:text-zinc-300">Verifying...</p>}
        {status === "success" && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">Your email has been verified.</p>
        )}
        {status === "error" && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/dashboard" className="font-medium text-zinc-950 dark:text-zinc-50">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
