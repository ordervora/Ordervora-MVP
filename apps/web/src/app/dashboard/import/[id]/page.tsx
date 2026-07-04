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

  if (!result.ok) {
    notFound();
  }

  const { job } = result.data;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <DashboardNav />

        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
            Review import — {job.sourceType}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Status: <span className="font-mono">{job.status}</span>
          </p>

          {job.status !== "AWAITING_REVIEW" && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This import is not awaiting review.
            </p>
          )}

          {job.extractedData?.businessProfile && <BusinessProfilePreview profile={job.extractedData.businessProfile} />}

          {job.status === "AWAITING_REVIEW" ? (
            <ReviewEditor job={job} />
          ) : (
            job.extractedData?.categories.map((category) => (
              <div key={category.name} className="flex flex-col gap-1">
                <h2 className="font-medium text-black dark:text-zinc-50">{category.name}</h2>
                <ul className="flex flex-col gap-1 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {category.items.map((item) => (
                    <li key={item.name}>
                      {item.name} — ${formatPrice(item.priceCents)}
                      {item.description && <span className="text-zinc-500"> · {item.description}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
