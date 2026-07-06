export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "RESTAURANT_OWNER" | "RESTAURANT_STAFF";
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  isPublished: boolean;
}

export interface RestaurantInput {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  isPublished?: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  priceCents: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export type ImportSourceType =
  | "PDF"
  | "IMAGE"
  | "CSV"
  | "WEBSITE"
  | "GOOGLE_MAPS"
  | "DOORDASH"
  | "UBER_EATS"
  | "GRUBHUB";

export type ImportStatus = "PENDING" | "PROCESSING" | "AWAITING_REVIEW" | "APPROVED" | "REJECTED" | "FAILED";

export interface SocialLink {
  platform: string;
  url: string;
}

export interface BusinessProfile {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string[];
  logoUrl?: string;
  socialLinks?: SocialLink[];
}

export interface ExtractedMenuData {
  categories: {
    name: string;
    items: { name: string; description?: string; priceCents: number; confidence?: number }[];
  }[];
  businessProfile?: BusinessProfile;
}

export interface ImportJob {
  id: string;
  sourceType: ImportSourceType;
  status: ImportStatus;
  extractedData: ExtractedMenuData | null;
  errorMessage: string | null;
  createdAt: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? "Request failed");
  }

  return data as T;
}

export function login(email: string, password: string) {
  return apiFetch<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name: string) {
  return apiFetch<{ user: PublicUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function logout() {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function createRestaurant(input: RestaurantInput) {
  return apiFetch<{ restaurant: Restaurant }>("/api/restaurants", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRestaurant(input: RestaurantInput) {
  return apiFetch<{ restaurant: Restaurant }>("/api/restaurants/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export type HoursDayOfWeek = "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

export interface RestaurantHoursRow {
  id: string;
  dayOfWeek: HoursDayOfWeek;
  opensAt: number;
  closesAt: number;
  isClosed: boolean;
}

export interface HoursRowInput {
  dayOfWeek: HoursDayOfWeek;
  opensAt: number;
  closesAt: number;
  isClosed: boolean;
}

export function listRestaurantHours() {
  return apiFetch<{ hours: RestaurantHoursRow[] }>("/api/restaurants/me/hours");
}

export function setRestaurantHours(hours: HoursRowInput[]) {
  return apiFetch<{ hours: RestaurantHoursRow[] }>("/api/restaurants/me/hours", {
    method: "PUT",
    body: JSON.stringify({ hours }),
  });
}

export function createCategory(name: string) {
  return apiFetch<{ category: MenuCategory }>("/api/menu/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/api/menu/categories/${id}`, { method: "DELETE" });
}

export function createItem(input: MenuItemInput) {
  return apiFetch<{ item: MenuItem }>("/api/menu/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateItem(id: string, input: Partial<MenuItemInput>) {
  return apiFetch<{ item: MenuItem }>(`/api/menu/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteItem(id: string) {
  return apiFetch<void>(`/api/menu/items/${id}`, { method: "DELETE" });
}

// --- Variants -----------------------------------------------------------------

export interface MenuItemVariant {
  id: string;
  menuItemId: string;
  name: string;
  priceDeltaCents: number;
  sortOrder: number;
  isDefault: boolean;
}

export interface VariantInput {
  name: string;
  priceDeltaCents?: number;
  sortOrder?: number;
  isDefault?: boolean;
}

export function listVariants(itemId: string) {
  return apiFetch<{ variants: MenuItemVariant[] }>(`/api/restaurants/me/menu-items/${itemId}/variants`);
}

export function createVariant(itemId: string, input: VariantInput) {
  return apiFetch<{ variant: MenuItemVariant }>(`/api/restaurants/me/menu-items/${itemId}/variants`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateVariant(itemId: string, variantId: string, input: Partial<VariantInput>) {
  return apiFetch<{ variant: MenuItemVariant }>(`/api/restaurants/me/menu-items/${itemId}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteVariant(itemId: string, variantId: string) {
  return apiFetch<void>(`/api/restaurants/me/menu-items/${itemId}/variants/${variantId}`, { method: "DELETE" });
}

// --- Modifier groups & options --------------------------------------------------

export type ModifierSelectionType = "SINGLE" | "MULTI";

export interface ModifierOption {
  id: string;
  modifierGroupId: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  selectionType: ModifierSelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  options: ModifierOption[];
}

export interface ModifierGroupInput {
  name: string;
  selectionType: ModifierSelectionType;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface ModifierOptionInput {
  name: string;
  priceDeltaCents?: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export function listModifierGroups() {
  return apiFetch<{ modifierGroups: ModifierGroup[] }>("/api/restaurants/me/modifier-groups");
}

export function createModifierGroup(input: ModifierGroupInput) {
  return apiFetch<{ modifierGroup: ModifierGroup }>("/api/restaurants/me/modifier-groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteModifierGroup(id: string) {
  return apiFetch<void>(`/api/restaurants/me/modifier-groups/${id}`, { method: "DELETE" });
}

export function createModifierOption(groupId: string, input: ModifierOptionInput) {
  return apiFetch<{ modifierOption: ModifierOption }>(`/api/restaurants/me/modifier-groups/${groupId}/options`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteModifierOption(groupId: string, optionId: string) {
  return apiFetch<void>(`/api/restaurants/me/modifier-groups/${groupId}/options/${optionId}`, { method: "DELETE" });
}

export interface MenuItemModifierGroupAttachment {
  id: string;
  menuItemId: string;
  modifierGroupId: string;
  sortOrder: number;
}

export function listItemModifierGroups(itemId: string) {
  return apiFetch<{ attachments: MenuItemModifierGroupAttachment[] }>(
    `/api/restaurants/me/menu-items/${itemId}/modifier-groups`,
  );
}

export function attachModifierGroup(itemId: string, modifierGroupId: string) {
  return apiFetch<{ ok: true }>(`/api/restaurants/me/menu-items/${itemId}/modifier-groups`, {
    method: "POST",
    body: JSON.stringify({ modifierGroupId }),
  });
}

export function detachModifierGroup(itemId: string, modifierGroupId: string) {
  return apiFetch<void>(`/api/restaurants/me/menu-items/${itemId}/modifier-groups/${modifierGroupId}`, {
    method: "DELETE",
  });
}

export async function createImportJob(
  sourceType: ImportSourceType,
  source: { file: File } | { url: string },
): Promise<{ job: ImportJob }> {
  const formData = new FormData();
  formData.append("sourceType", sourceType);
  if ("file" in source) {
    formData.append("file", source.file);
  } else {
    formData.append("sourceUrl", source.url);
  }

  const res = await fetch("/api/imports", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? "Import failed");
  }

  return data as { job: ImportJob };
}

export function approveImportJob(id: string) {
  return apiFetch<{ job: ImportJob }>(`/api/imports/${id}/approve`, { method: "POST" });
}

export function rejectImportJob(id: string) {
  return apiFetch<{ job: ImportJob }>(`/api/imports/${id}/reject`, { method: "POST" });
}

export function rerunImportJob(id: string) {
  return apiFetch<{ job: ImportJob }>(`/api/imports/${id}/rerun`, { method: "POST" });
}

export function updateImportJobData(id: string, data: ExtractedMenuData) {
  return apiFetch<{ job: ImportJob }>(`/api/imports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// AI Website Builder (Sprint 06)
// ---------------------------------------------------------------------------

export type StyleFamily = "LUXURY" | "MODERN" | "MINIMAL";
export type SiteStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
export type SiteVersionStatus = "VARIATION" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type GenerationStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type GenerationStage =
  | "INGEST"
  | "BRAND_ANALYSIS"
  | "THEME_SELECTION"
  | "CONTENT_GENERATION"
  | "ASSEMBLY"
  | "ASSETS"
  | "SCORING"
  | "FINALIZE";

export interface BrandPersonality {
  traditionalContemporary: number;
  casualFormal: number;
  playfulSerious: number;
  understatedBold: number;
  rusticPolished: number;
}

export interface SiteBrandProfile {
  cuisine: string;
  businessType: string;
  priceTier: number;
  personality: BrandPersonality;
  signalsUsed: string[];
  confidence: { cuisine: number; businessType: number; priceTier: number; personality: number };
}

export interface SiteSectionBlock {
  type: string;
  variant?: string;
  props: Record<string, unknown>;
}

export interface SitePage {
  slug: string;
  title: string;
  metaDescription: string;
  sections: SiteSectionBlock[];
}

export interface WebsiteSiteDefinition {
  schemaVersion: number;
  restaurantName: string;
  tagline: string;
  cuisine: string;
  businessType: string;
  styleFamily: StyleFamily;
  themeKey: string;
  themeVersion: number;
  colorSeed: string;
  typography: { display: string; body: string };
  designRationale?: string[];
  facts: {
    restaurantName: string;
    address?: string;
    phone?: string;
    hours?: string;
    hasOnlineOrdering: boolean;
    hasReservations: boolean;
  };
  pages: SitePage[];
}

export interface Suggestion {
  id: string;
  dimension: "seo" | "performance" | "accessibility" | "brandConsistency" | "conversion";
  issue: string;
  impact: "high" | "medium" | "low";
  suggestion: string;
  autoFixKind?: "missingAltText" | "heroContrast" | "missingMetaDescription";
}

export interface WebsiteScore {
  id: string;
  siteVersionId: string;
  overall: number;
  seo: number;
  performance: number;
  accessibility: number;
  brandConsistency: number;
  conversion: number;
  suggestions: Suggestion[];
  measuredAt: string;
  source: "AUTO" | "MANUAL" | "PUBLISH";
}

export interface SiteVersion {
  id: string;
  siteId: string;
  versionNo: number;
  definition: WebsiteSiteDefinition;
  status: SiteVersionStatus;
  styleFamily: StyleFamily | null;
  generationBatchId: string | null;
  publishedAt: string | null;
  createdAt: string;
  scores?: WebsiteScore[];
}

export interface WebsiteSite {
  id: string;
  restaurantId: string;
  slug: string;
  status: SiteStatus;
  themeId: string | null;
  themeVersion: number | null;
  publishedVersionId: string | null;
  brandProfile: SiteBrandProfile | null;
  settings: Record<string, unknown> | null;
}

export interface GenerationJob {
  id: string;
  siteId: string;
  batchId: string;
  stage: GenerationStage;
  status: GenerationStatus;
  error: string | null;
}

export interface SiteDomain {
  id: string;
  hostname: string;
  type: "PLATFORM" | "CUSTOM";
  verificationStatus: "PENDING" | "VERIFIED" | "FAILED";
  tlsStatus: "PENDING" | "ISSUED" | "FAILED";
  isPrimary: boolean;
}

export interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export function getMySite() {
  return apiFetch<{ site: WebsiteSite }>("/api/sites/me");
}

export function createSite() {
  return apiFetch<{ site: WebsiteSite }>("/api/sites", { method: "POST" });
}

export function startGeneration(siteId: string) {
  return apiFetch<{ job: GenerationJob }>(`/api/sites/${siteId}/generate`, { method: "POST" });
}

export function getGenerationStatus(siteId: string) {
  return apiFetch<{ job: GenerationJob | null }>(`/api/sites/${siteId}/generation`);
}

export function listVariations(siteId: string) {
  return apiFetch<{ variations: SiteVersion[] }>(`/api/sites/${siteId}/variations`);
}

export function selectVariation(siteId: string, versionId: string) {
  return apiFetch<{ version: SiteVersion }>(`/api/sites/${siteId}/variations/${versionId}/select`, { method: "POST" });
}

export function regenerateVariations(siteId: string) {
  return apiFetch<{ job: GenerationJob }>(`/api/sites/${siteId}/variations/regenerate`, { method: "POST" });
}

export function listSiteVersions(siteId: string) {
  return apiFetch<{ versions: SiteVersion[] }>(`/api/sites/${siteId}/versions`);
}

export function getSiteVersion(siteId: string, versionId: string) {
  return apiFetch<{ version: SiteVersion }>(`/api/sites/${siteId}/versions/${versionId}`);
}

export function patchDraft(siteId: string, patch: Partial<WebsiteSiteDefinition>) {
  return apiFetch<{ version: SiteVersion }>(`/api/sites/${siteId}/draft`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function getLatestScore(siteId: string, versionId: string) {
  return apiFetch<{ score: WebsiteScore | null }>(`/api/sites/${siteId}/versions/${versionId}/score`);
}

export function runScore(siteId: string, versionId: string) {
  return apiFetch<{ score: WebsiteScore }>(`/api/sites/${siteId}/versions/${versionId}/score`, { method: "POST" });
}

export function applySuggestion(siteId: string, versionId: string, suggestion: Suggestion) {
  return apiFetch<{ score: WebsiteScore }>(`/api/sites/${siteId}/versions/${versionId}/suggestions/apply`, {
    method: "POST",
    body: JSON.stringify(suggestion),
  });
}

export function publishSite(siteId: string) {
  return apiFetch<{ version: SiteVersion; scoreDelta?: number; warning?: string }>(`/api/sites/${siteId}/publish`, {
    method: "POST",
  });
}

export function listReleases(siteId: string) {
  return apiFetch<{ releases: SiteVersion[] }>(`/api/sites/${siteId}/releases`);
}

export function rollbackSite(siteId: string, versionId: string) {
  return apiFetch<{ site: WebsiteSite }>(`/api/sites/${siteId}/rollback/${versionId}`, { method: "POST" });
}

export function unpublishSite(siteId: string) {
  return apiFetch<{ site: WebsiteSite }>(`/api/sites/${siteId}/unpublish`, { method: "POST" });
}

export function listDomains(siteId: string) {
  return apiFetch<{ domains: SiteDomain[] }>(`/api/sites/${siteId}/domains`);
}

export function addDomain(siteId: string, hostname: string) {
  return apiFetch<{ domain: SiteDomain }>(`/api/sites/${siteId}/domains`, {
    method: "POST",
    body: JSON.stringify({ hostname }),
  });
}

export function verifyDomain(siteId: string, domainId: string) {
  return apiFetch<{ domain: SiteDomain }>(`/api/sites/${siteId}/domains/${domainId}/verify`, { method: "POST" });
}

export function setPrimaryDomain(siteId: string, domainId: string) {
  return apiFetch<{ domain: SiteDomain }>(`/api/sites/${siteId}/domains/${domainId}/primary`, { method: "POST" });
}

export function removeDomain(siteId: string, domainId: string) {
  return apiFetch<void>(`/api/sites/${siteId}/domains/${domainId}`, { method: "DELETE" });
}

export function listMessages(siteId: string) {
  return apiFetch<{ messages: ContactMessageRecord[] }>(`/api/sites/${siteId}/messages`);
}

/** §18 Preview System — a short-lived, site-scoped token for building a /preview/:token URL (proxied by next.config.ts). */
export function getPreviewToken(siteId: string) {
  return apiFetch<{ token: string }>(`/api/sites/${siteId}/preview-token`);
}
