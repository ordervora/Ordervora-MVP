import Link from "next/link";
import { BarChart3, Eye, Globe2, Palette, Rocket, Search } from "lucide-react";
import { Card } from "@/components/ui";

interface QuickAction {
  label: string;
  href: string;
  icon: typeof Eye;
}

function buildActions(domain: string): QuickAction[] {
  return [
    { label: "Preview Website", href: domain, icon: Eye },
    { label: "Customize Website", href: "/dashboard/website/editor", icon: Palette },
    { label: "Publish Website", href: "/dashboard/website/publish", icon: Rocket },
    { label: "Connect Domain", href: "/dashboard/website/publish", icon: Globe2 },
    { label: "Analytics", href: "#website-analytics", icon: BarChart3 },
    { label: "SEO", href: "/dashboard/website/score", icon: Search },
  ];
}

export function QuickActions({ domain }: { domain: string }) {
  const actions = buildActions(domain);

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">QUICK ACTIONS</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map(({ label, href, icon: ActionIcon }) => {
          const external = href.startsWith("http");
          return (
            <Link
              key={label}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="flex flex-col items-start gap-3 rounded-2xl border border-[#E7DDCF] bg-[#FBF7F1] p-4 transition hover:-translate-y-0.5 hover:border-[#B97824] hover:bg-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#A9681F] shadow-sm">
                <ActionIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-[#171512]">{label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
