import Link from "next/link";

const FEATURES = [
  {
    title: "AI menu import",
    description:
      "Upload a PDF, a photo of your printed menu, a spreadsheet, or just paste your website or Google Maps link — OrderVora reads it and builds your digital menu for you, ready to review before it goes live.",
  },
  {
    title: "AI-built website",
    description:
      "Answer a few questions and OrderVora generates a real, published restaurant website — copy, layout, and branding — in minutes, not weeks.",
  },
  {
    title: "Online ordering & checkout",
    description:
      "A fast, guest-or-account checkout for pickup, delivery, or dine-in QR ordering, with secure card payment built in.",
  },
  {
    title: "Kitchen & delivery, connected",
    description:
      "Orders flow straight to your kitchen queue and your delivery drivers in real time, from the same order the customer placed.",
  },
  {
    title: "Built on a secure foundation",
    description:
      "Encrypted credentials, rate-limited APIs, and tenant-isolated data from day one — the same infrastructure discipline you'd expect from a payments company.",
  },
  {
    title: "One dashboard for everything",
    description:
      "Menu, orders, coupons, tables, delivery zones, and your website — managed from a single owner dashboard.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Bring what you already have",
    description: "A PDF menu, a few photos, your Google Maps listing, or your existing website — OrderVora starts from there.",
  },
  {
    step: "2",
    title: "Review what the AI built",
    description: "Nothing goes live automatically. You review and approve your menu and your generated website before customers ever see them.",
  },
  {
    step: "3",
    title: "Start taking real orders",
    description: "Publish your site, share your ordering link or QR code, and orders start flowing into your dashboard and kitchen.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">OrderVora</span>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-foreground px-4 py-2 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
            The ordering platform for your restaurant
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Menu, website, checkout, kitchen, and delivery — all in one place, with AI doing the setup work most
            platforms leave to you.
          </p>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <Link
              href="/register"
              className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-8 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] sm:w-auto"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-8 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] sm:w-auto"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="border-t border-black/[.08] bg-white px-6 py-20 dark:border-white/[.145] dark:bg-zinc-950 sm:px-12">
          <div className="mx-auto flex max-w-5xl flex-col gap-12">
            <div className="flex flex-col gap-3 text-center">
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 sm:text-3xl">
                Everything a restaurant needs to sell online
              </h2>
              <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
                Most platforms give you a checkout form and leave the rest to you. OrderVora also builds your menu
                and your website.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-6 dark:border-white/[.145]">
                  <h3 className="text-base font-semibold text-black dark:text-zinc-50">{feature.title}</h3>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 sm:px-12">
          <div className="mx-auto flex max-w-4xl flex-col gap-12">
            <div className="flex flex-col gap-3 text-center">
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 sm:text-3xl">How it works</h2>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="flex flex-col gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    {s.step}
                  </span>
                  <h3 className="text-base font-semibold text-black dark:text-zinc-50">{s.title}</h3>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-black/[.08] bg-white px-6 py-20 text-center dark:border-white/[.145] dark:bg-zinc-950 sm:px-12">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 sm:text-3xl">
              We&apos;re onboarding our first restaurants now
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              OrderVora is in early access. Reach out and we&apos;ll set your restaurant up personally — no
              self-serve pricing page yet, just a direct conversation about what you need.
            </p>
            <div className="mx-auto mt-2">
              <Link
                href="/register"
                className="flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-2 px-6 py-10 text-sm text-zinc-500 dark:text-zinc-400">
        <span>OrderVora</span>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-black dark:hover:text-white">
            Log in
          </Link>
          <Link href="/register" className="hover:text-black dark:hover:text-white">
            Get started
          </Link>
        </div>
      </footer>
    </div>
  );
}
