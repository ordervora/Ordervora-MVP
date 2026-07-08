"use client";

import Link from "next/link";
import { useEffect } from "react";

const businessTypes = ["Restaurant", "Cafe", "Deli", "Vape Shop", "Convenience", "Retail"];
const plans = [
  { name: "Basic", price: "$99", note: "Start direct", featured: false },
  { name: "Pro", price: "$179", note: "Grow faster", featured: true },
  { name: "Premium", price: "$299", note: "Run everything", featured: false },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function PhoneShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`cinema-phone ${className}`}>
      <div className="cinema-phone-screen">
        <div className="cinema-island" />
        {children}
      </div>
    </div>
  );
}

function MiniOrderCard({ title, meta, accent = false }: { title: string; meta: string; accent?: boolean }) {
  return (
    <div className={`cinema-order-card ${accent ? "accent" : ""}`}>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b>→</b>
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-cinematic-scene]"));
    const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting)),
      { threshold: 0.18 },
    );
    reveals.forEach((el) => observer.observe(el));

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        scenes.forEach((scene) => {
          const rect = scene.getBoundingClientRect();
          const total = rect.height + vh;
          const progress = Math.min(1, Math.max(0, (vh - rect.top) / total));
          scene.style.setProperty("--scene-progress", progress.toFixed(4));
        });
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="cinema-site">
      <header className="cinema-nav">
        <Link href="/" className="cinema-brand">
          <span>O</span>
          <b>OrderVora</b>
        </Link>
        <div className="cinema-nav-actions">
          <Link href="/login">Log in</Link>
          <Link href="/register" className="cinema-pill cinema-pill-dark">Start free <Arrow /></Link>
        </div>
      </header>

      <main>
        <section className="cinema-scene cinema-hero" data-cinematic-scene>
          <div className="cinema-ambient cinema-ambient-a" />
          <div className="cinema-ambient cinema-ambient-b" />
          <div className="cinema-hero-copy">
            <div className="cinema-kicker" data-reveal>YOUR BUSINESS. YOUR CUSTOMERS. YOUR FUTURE.</div>
            <h1 data-reveal>
              Stop renting your customers.
              <em>Own the relationship.</em>
            </h1>
            <p data-reveal>
              From one menu photo or link to a complete branded storefront, online ordering system, operations hub, and growth engine.
            </p>
            <div className="cinema-hero-actions" data-reveal>
              <Link href="/register" className="cinema-pill cinema-pill-dark">Build my business <Arrow /></Link>
              <a href="#transformation" className="cinema-pill cinema-pill-light">Watch the transformation</a>
            </div>
          </div>

          <div className="cinema-hero-stage">
            <PhoneShell className="phone-left">
              <div className="phone-storefront">
                <span className="eyebrow">LIVE STOREFRONT</span>
                <h3>Noma House</h3>
                <p>Order direct. Earn rewards.</p>
                <MiniOrderCard title="Signature Burger" meta="$16 · Popular" />
                <MiniOrderCard title="Truffle Fries" meta="$8 · Add-on" />
              </div>
            </PhoneShell>

            <PhoneShell className="phone-center">
              <div className="phone-ai">
                <span className="ai-orbit">✦</span>
                <small>ORDERVORA AI</small>
                <h3>Your business is ready.</h3>
                {["Menu understood", "Brand created", "Website built", "Ordering connected"].map((item) => (
                  <div className="ai-check" key={item}><b>✓</b><span>{item}</span></div>
                ))}
              </div>
            </PhoneShell>

            <PhoneShell className="phone-right">
              <div className="phone-ops">
                <span className="eyebrow">TODAY</span>
                <h3>$4,820</h3>
                <p>+18.4% this week</p>
                <div className="mini-grid">
                  <MiniOrderCard title="184 orders" meta="All channels" accent />
                  <MiniOrderCard title="42% repeat" meta="Owned customers" />
                </div>
              </div>
            </PhoneShell>
          </div>
        </section>

        <section id="transformation" className="cinema-scene cinema-transform" data-cinematic-scene>
          <div className="cinema-sticky">
            <div className="cinema-section-copy" data-reveal>
              <span className="cinema-kicker">01 — BUILD TO STOREFRONT</span>
              <h2>Give us a source.<br /><em>Watch a business appear.</em></h2>
              <p>Upload a menu photo, PDF, website, or Google Maps listing. OrderVora turns scattered information into a working customer experience.</p>
            </div>
            <div className="cinema-transform-stage">
              <div className="source-card source-photo">MENU<br /><small>photo · pdf · url</small></div>
              <div className="source-line"><span>AI reading</span><b>→</b></div>
              <PhoneShell className="source-phone">
                <div className="phone-storefront">
                  <span className="eyebrow">YOUR BRAND</span>
                  <h3>Open for orders.</h3>
                  <p>Menu, story, checkout, loyalty.</p>
                  <MiniOrderCard title="Best sellers" meta="Ready to order" accent />
                  <MiniOrderCard title="Pickup & delivery" meta="Connected" />
                </div>
              </PhoneShell>
            </div>
          </div>
        </section>

        <section className="cinema-scene cinema-control" data-cinematic-scene>
          <div className="cinema-control-copy" data-reveal>
            <span className="cinema-kicker">02 — OPERATIONS CONTROL ROOM</span>
            <h2>Every moving part.<br /><em>One place.</em></h2>
            <p>Orders, kitchen, delivery, customers, campaigns, analytics, and your website move together instead of living in separate tools.</p>
          </div>
          <div className="control-grid" data-reveal>
            <div className="control-card control-card-wide"><span>LIVE ORDERS</span><strong>27 active</strong><div className="pulse-line" /></div>
            <div className="control-card"><span>KITCHEN</span><strong>08:42 avg</strong><i>On pace</i></div>
            <div className="control-card"><span>DELIVERY</span><strong>12 out</strong><i>4 arriving</i></div>
            <div className="control-card"><span>CUSTOMERS</span><strong>2,841</strong><i>+126 this month</i></div>
            <div className="control-card"><span>REVENUE</span><strong>$48.2K</strong><i>+18.4%</i></div>
          </div>
        </section>

        <section className="cinema-scene cinema-growth" data-cinematic-scene>
          <div className="growth-copy" data-reveal>
            <span className="cinema-kicker">03 — CUSTOMER GROWTH LOOP</span>
            <h2>Turn one order into<br /><em>the next ten.</em></h2>
            <p>Own the journey after checkout. Rewards, campaigns, offers, reviews, referrals, and smart re-engagement keep the relationship with you.</p>
          </div>
          <div className="growth-loop" aria-hidden="true">
            <div className="growth-core">OrderVora<br /><small>Customer OS</small></div>
            {["Order", "Reward", "Review", "Return", "Refer"].map((item, index) => (
              <div key={item} className={`growth-node node-${index + 1}`}>{item}</div>
            ))}
          </div>
        </section>

        <section className="cinema-scene cinema-business" data-cinematic-scene>
          <div className="cinema-business-copy" data-reveal>
            <span className="cinema-kicker">04 — CHOOSE YOUR BUSINESS</span>
            <h2>Not just restaurants.<br /><em>A business operating system.</em></h2>
          </div>
          <div className="business-rail" data-reveal>
            {businessTypes.map((type, index) => (
              <div className={`business-card business-${index + 1}`} key={type}>
                <span>0{index + 1}</span>
                <h3>{type}</h3>
                <p>Storefront · Orders · Operations · Growth</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cinema-scene cinema-pricing" data-cinematic-scene>
          <div className="cinema-pricing-copy" data-reveal>
            <span className="cinema-kicker">05 — SIMPLE PRICING</span>
            <h2>Replace commission with<br /><em>predictable growth.</em></h2>
          </div>
          <div className="pricing-grid" data-reveal>
            {plans.map((plan) => (
              <article key={plan.name} className={`pricing-card ${plan.featured ? "featured" : ""}`}>
                {plan.featured && <span className="plan-badge">MOST POPULAR</span>}
                <h3>{plan.name}</h3>
                <strong>{plan.price}<small>/mo</small></strong>
                <p>{plan.note}</p>
                <ul>
                  <li>Branded website</li>
                  <li>Direct online ordering</li>
                  <li>Customer ownership</li>
                  <li>AI setup tools</li>
                </ul>
                <Link href="/register" className={`cinema-pill ${plan.featured ? "cinema-pill-gold" : "cinema-pill-light"}`}>Choose {plan.name}</Link>
              </article>
            ))}
          </div>

          <div className="cinema-final" data-reveal>
            <span className="cinema-kicker">THE NEXT ORDER</span>
            <h2>Your next direct order<br /><em>should belong to you.</em></h2>
            <p>Build the customer experience, operations system, and growth engine that your business actually owns.</p>
            <Link href="/register" className="cinema-pill cinema-pill-gold">Build OrderVora now <Arrow /></Link>
          </div>
        </section>
      </main>

      <footer className="cinema-footer">
        <div className="cinema-brand"><span>O</span><b>OrderVora</b></div>
        <p>Business Operating System</p>
        <div><Link href="/login">Log in</Link><Link href="/register">Get started</Link></div>
      </footer>
    </div>
  );
}
