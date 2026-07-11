import { Sparkles } from "lucide-react";
import { Badge, Card } from "@/components/ui";

export function WebsiteStatusCard({ restaurantName }: { restaurantName: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#F7EBDD]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#171512] text-[#E1B56F] shadow-lg shadow-black/10">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-[#171512] sm:text-xl">AI Website Studio</h2>
              <Badge tone="warning">Setting up</Badge>
            </div>
            <p className="mt-1 max-w-md text-sm leading-6 text-[#756B5D]">
              {restaurantName}&apos;s AI-designed website foundation is ready. Brand concepts and live generation launch soon.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
