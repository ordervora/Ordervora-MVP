import type { BusinessProfile } from "@/lib/api";

/**
 * Read-only preview of the business-profile fields a source (Website,
 * Google Maps) surfaced — shown above the menu categories so the
 * reviewer sees everything a single Approve click will apply, not just
 * the menu items. A plain <img> is used for the logo since its host is
 * whatever the import's storage backend serves from, not known ahead of
 * time for next/image's remote-pattern allowlist.
 */
export function BusinessProfilePreview({ profile }: { profile: BusinessProfile }) {
  const hasAnyField =
    profile.name ?? profile.address ?? profile.phone ?? profile.website ?? profile.hours?.length ?? profile.logoUrl ?? profile.socialLinks?.length;
  if (!hasAnyField) return null;

  return (
    <div className="flex flex-col gap-2 rounded border border-black/[.08] p-3 text-sm dark:border-white/[.145]">
      <h2 className="font-medium text-black dark:text-zinc-50">Restaurant profile update (applied on approve)</h2>
      <div className="flex gap-3">
        {profile.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.logoUrl} alt="Restaurant logo" className="h-16 w-16 rounded object-cover" />
        )}
        <div className="flex flex-col gap-1">
          {profile.name && <p>Name: {profile.name}</p>}
          {profile.address && <p>Address: {profile.address}</p>}
          {profile.phone && <p>Phone: {profile.phone}</p>}
          {profile.website && (
            <p>
              Website:{" "}
              <a href={profile.website} target="_blank" rel="noreferrer" className="underline">
                {profile.website}
              </a>
            </p>
          )}
        </div>
      </div>
      {profile.hours && profile.hours.length > 0 && (
        <ul className="pl-4 text-xs text-zinc-600 dark:text-zinc-400">
          {profile.hours.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {profile.socialLinks && profile.socialLinks.length > 0 && (
        <div className="flex gap-2">
          {profile.socialLinks.map((link) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-black/[.08] px-2 py-0.5 text-xs capitalize dark:border-white/[.145]"
            >
              {link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
