import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import type { ImportJob } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { BusinessProfilePreview } from "./business-profile-preview";
import { ReviewEditor } from "./review-editor";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await serverFetch<{ job: ImportJob }>(`/api/imports/${id}`);

  if (!result.ok) notFound();

  const { job } = result.data;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F7F0E5] px-4 pb-28 pt-5 text-[#171512] sm:px-6 lg:p-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <DashboardNav />

        <header className="pt-2 lg:pt-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">MENU REVIEW</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Review your imported menu</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756B5D]">Check names and prices, make quick edits, then approve everything into your menu.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#756B5D] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {job.status.replaceAll("_", " ")}
          </div>
        </header>

        {job.status !== "AWAITING_REVIEW" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This import is not currently awaiting review.</div>
        )}

        {job.extractedData?.businessProfile && <BusinessProfilePreview profile={job.extractedData.businessProfile} />}

        {job.status === "AWAITING_REVIEW" ? (
          <ReviewEditor job={job} />
        ) : (
          <div className="space-y-6">
            {job.extractedData?.categories.map((category) => (
              <section key={category.name}>
                <h2 className="text-xl font-bold">{category.name}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {category.items.map((item) => (
                    <article key={item.name} className="rounded-2xl border border-[#E7DDCF] bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><h3 className="font-bold">{item.name}</h3>{item.description && <p className="mt-1 text-sm leading-5 text-[#756B5D]">{item.description}</p>}</div>
                        <strong className="shrink-0 text-[#9A5F17]">${formatPrice(item.priceCents)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
