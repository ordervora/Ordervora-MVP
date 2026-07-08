import Link from "next/link";

const FEATURES = [
  {
    icon: "✦",
    title: "AI business setup",
    description:
      "Upload a menu, paste a website, or share a Google Maps listing. OrderVora turns what you already have into a launch-ready digital business.",
  },
  {
    icon: "↗",
    title: "Your brand. Your customers.",
    description:
      "Own the website, customer relationship, offers, and ordering experience instead of renting them from a marketplace.",
  },
  {
    icon: "◎",
    title: "Orders without commission",
    description:
      "Accept pickup, delivery, and QR orders from one branded storefront without surrendering a percentage of every sale.",
  },
  {
    icon: "⌁",
    title: "Operations in one place",
    description:
      "Menu, orders, kitchen, delivery, payments, coupons, tables, and your website stay connected in a single operating system.",
  },
  {
    icon: "◇",
    title: "Built to convert",
    description:
      "Fast mobile checkout, focused calls to action, smart upsells, loyalty, and campaigns designed to turn visitors into repeat customers.",
  },
  {
    icon: "◈",
    title: "AI that keeps working",
    description:
      "Use AI to generate copy, structure menus, build pages, surface opportunities, and help operate the business after launch.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Bring one source",
    copy: "A menu photo, PDF, website, or Google Maps listing is enough to begin.",
  },
  {
    number: "02",
    title: "OrderVora builds",
    copy: "AI structures your menu, prepares your brand, and assembles the storefront and operating setup.",
  },
  {
    number: "03",
    title: "Review and launch",
    copy: "Approve the result, publish your branded ordering site, and start sending every customer to something you own.",
  },
];

const PROOF = [
  { value: "0%", label: "marketplace commission" },
  { value: "10 min", label: "from source to first draft" },
  { value: "1 OS", label: "website, orders and operations" },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneMockup({ variant }: { variant: "store" | "ops" | "ai" }) {
  const content = {
    store: {
      eyebrow: "LIVE STOREFRONT",
      title: "Noma House",
      body: "Order direct. Earn rewards.",
    },
    ops: {
      eyebrow: "TODAY",
      title: "$4,820",
      body: "+18.4% this week",
    },
    ai: {
      eyebrow: "ORDERVORA AI",
      title: "Store ready",
      body: "Menu · Brand · Website",
    },
  }[variant];

  return (
    <div className="relative mx-auto w-[220px] rounded-[2.6rem] border border-black/10 bg-[#11100f] p-2.5 shadow-[0_30px_80px_rgba(48,36,18,0.18)] sm:w-[250px]">
      <div className="relative min-h-[470px] overflow-hidden rounded-[2.1rem] bg-[#f7f1e8] p-5 sm:min-h-[520px]">
        <div className="mx-auto mb-8 h-5 w-20 rounded-full bg-[#11100f]" />
        <div className="rounded-3xl bg-[#1d1b18] p-5 text-white">
          <div className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b980]">
            {content.eyebrow}
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {content.title}
          </div>
          <div className="mt-2 text-sm text-white/60">{content.body}</div>
        </div>

        {variant === "store" && (
          <div className="mt-4 space-y-3">
            {["Signature Burger", "Truffle Fries", "Citrus Fizz"].map(
              (item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/75 p-3"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#e2caa3] to-[#a6743e]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#1d1b18]">
                      {item}
                    </div>
                    <div className="mt-1 text-xs text-black/45">
                      ${[16, 8, 6][index]}.00
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1b18] text-white">
                    +
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {variant === "ops" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-xs text-black/45">Orders</div>
              <div className="mt-2 text-2xl font-semibold text-[#1d1b18]">
                184
              </div>
            </div>
            <div className="rounded-2xl bg-[#d8b980] p-4">
              <div className="text-xs text-black/45">Repeat</div>
              <div className="mt-2 text-2xl font-semibold text-[#1d1b18]">
                42%
              </div>
            </div>
            <div className="col-span-2 rounded-2xl bg-white/80 p-4">
              <div className="flex items-end gap-2 pt-6">
                {[34, 56, 42, 68, 52, 82, 74].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-md bg-[#1d1b18]"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {variant === "ai" && (
          <div className="mt-4 space-y-3">
            {[
              "Menu structured",
              "Brand direction created",
              "Website generated",
              "Ordering connected",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-white/80 p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d8b980] text-xs font-bold text-[#1d1b18]">
                  ✓
                </span>
                <div>
                  <div className="text-sm font-semibold text-[#1d1b18]">
                    {item}
                  </div>
                  <div className="mt-0.5 text-xs text-black/40">
                    Step {index + 1} complete
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f4eee5] text-[#1b1916]">
      <header className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b1916] text-lg font-semibold text-[#e3c58d]">
            O
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em]">
            OrderVora
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-black/60 md:flex">
          <a href="#platform" className="transition hover:text-black">
            Platform
          </a>
          <a href="#how-it-works" className="transition hover:text-black">
            How it works
          </a>
          <a href="#why" className="transition hover:text-black">
            Why OrderVora
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2.5 text-sm font-medium sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#1b1916] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            Start building <ArrowIcon />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pb-28 lg:pt-20">
          <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#e6cfa8]/40 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-5xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/55 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b08243]" />
                The business operating system for local commerce
              </div>

              <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-7xl lg:text-[92px]">
                Turn your customers into{" "}
                <span className="font-serif italic text-[#9b7040]">your</span>{" "}
                customers.
              </h1>

              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-black/58 sm:text-xl">
                OrderVora turns a menu photo, website, or Google Maps listing
                into a branded storefront and a complete operating system for
                orders, kitchen, delivery, marketing, and growth.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1b1916] px-7 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(27,25,22,0.16)] transition hover:-translate-y-0.5 sm:w-auto"
                >
                  Build your business <ArrowIcon />
                </Link>
                <a
                  href="#how-it-works"
                  className="flex h-14 w-full items-center justify-center rounded-full border border-black/10 bg-white/55 px-7 text-sm font-semibold backdrop-blur transition hover:bg-white sm:w-auto"
                >
                  See how it works
                </a>
              </div>

              <p className="mt-4 text-xs text-black/38">
                No marketplace commission. No generic template. No lost customer
                relationship.
              </p>
            </div>

            <div className="relative mt-16 sm:mt-20 lg:mt-24">
              <div className="absolute inset-x-0 bottom-0 h-48 rounded-[3rem] bg-[#d9c2a0]/35 blur-2xl" />
              <div className="relative grid items-end gap-6 md:grid-cols-3 lg:gap-10">
                <div className="hidden -rotate-3 md:block">
                  <PhoneMockup variant="store" />
                </div>
                <div className="relative z-10 md:-translate-y-8">
                  <PhoneMockup variant="ai" />
                </div>
                <div className="hidden rotate-3 md:block">
                  <PhoneMockup variant="ops" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-black/8 bg-[#1b1916] px-5 py-8 text-white sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-3 sm:gap-0">
            {PROOF.map((item, index) => (
              <div
                key={item.label}
                className={`text-center ${
                  index > 0 ? "sm:border-l sm:border-white/12" : ""
                }`}
              >
                <div className="text-3xl font-semibold tracking-[-0.04em] text-[#e3c58d]">
                  {item.value}
                </div>
                <div className="mt-1 text-sm text-white/50">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="platform"
          className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7040]">
                  One platform, not six tools
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
                  Everything you need to run and grow direct business.
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-8 text-black/55 lg:justify-self-end">
                Stop stitching together a website builder, ordering link,
                kitchen screen, delivery dashboard, coupons tool, and analytics.
                OrderVora connects the whole customer journey.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="group min-h-[250px] rounded-[2rem] border border-black/8 bg-white/50 p-7 transition duration-300 hover:-translate-y-1 hover:bg-white/75 hover:shadow-[0_20px_60px_rgba(72,54,30,0.08)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1b1916] text-lg text-[#e3c58d]">
                    {feature.icon}
                  </div>
                  <h3 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-black/52">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10"
        >
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#1b1916] px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="lg:sticky lg:top-8 lg:self-start">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e3c58d]">
                  From source to storefront
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-6xl">
                  Launch from what you already have.
                </h2>
                <p className="mt-5 max-w-lg text-base leading-7 text-white/50">
                  You do not need to rebuild your business from scratch to
                  modernize it. Give OrderVora the source. Keep control of the
                  result.
                </p>
              </div>

              <div className="space-y-4">
                {STEPS.map((step) => (
                  <article
                    key={step.number}
                    className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 sm:p-8"
                  >
                    <div className="text-sm font-semibold text-[#e3c58d]">
                      {step.number}
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-xl leading-7 text-white/50">
                      {step.copy}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2.5rem] border border-black/8 bg-[#ede2d2] p-6 sm:p-10 lg:p-14">
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7040]">
                    The direct relationship matters
                  </p>
                  <h2 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-6xl">
                    Marketplaces can bring an order. They should not own the
                    relationship.
                  </h2>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-black/55">
                    OrderVora helps local businesses move repeat customers into
                    a branded experience they control—without giving away
                    margin every time the same customer comes back.
                  </p>
                  <Link
                    href="/register"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1b1916] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    Build your direct channel <ArrowIcon />
                  </Link>
                </div>

                <div className="rounded-[2rem] bg-[#f7f1e8] p-5 shadow-[0_24px_70px_rgba(72,54,30,0.10)] sm:p-7">
                  <div className="flex items-center justify-between border-b border-black/8 pb-5">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
                        Customer journey
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        From discovery to loyalty
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1b1916] text-[#e3c58d]">
                      ↗
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "Discover your brand",
                      "Order on your website",
                      "Receive directly",
                      "Earn rewards",
                      "Come back to you",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white/70 p-4"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3c58d] text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold">{item}</div>
                        <div className="ml-auto text-black/25">→</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 pt-8 sm:px-8 sm:pb-28 lg:px-10">
          <div className="mx-auto max-w-7xl rounded-[2.75rem] bg-[#1b1916] px-6 py-14 text-center text-white sm:px-10 sm:py-20 lg:px-16 lg:py-24">
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e3c58d]">
                Build what belongs to you
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl">
                Your website. Your orders. Your customer relationship.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/50">
                Start with the menu, link, or listing you already have.
                OrderVora helps turn it into a business system built for direct
                growth.
              </p>
              <div className="mt-9 flex justify-center">
                <Link
                  href="/register"
                  className="flex h-14 items-center gap-2 rounded-full bg-[#e3c58d] px-7 text-sm font-semibold text-[#1b1916] transition hover:-translate-y-0.5"
                >
                  Start building now <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/8 px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b1916] text-sm font-semibold text-[#e3c58d]">
              O
            </span>
            <div>
              <div className="font-semibold tracking-[-0.02em]">OrderVora</div>
              <div className="mt-0.5 text-xs text-black/40">
                The operating system for direct business.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 text-sm text-black/50">
            <Link href="/login" className="transition hover:text-black">
              Log in
            </Link>
            <Link href="/register" className="transition hover:text-black">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
