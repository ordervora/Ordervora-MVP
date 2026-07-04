import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 px-6 py-24 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            OrderVora
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            The ordering platform for your restaurant — menu, checkout, kitchen, and delivery, all in one place.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] sm:w-[180px]"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-6 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] sm:w-[180px]"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
