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
  isSuspended: boolean;
  suspendedReason: string | null;
  referralCode: string | null;
}

export interface RestaurantInput {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  isPublished?: boolean;
  /** The *referrer's* code (from a ?ref= link) — only meaningful on creation. */
  referralCode?: string;
}

export interface ReferredRestaurant {
  id: string;
  name: string;
  isPublished: boolean;
  createdAt: string;
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

export function login(email: string, password: string, options: { keepSignedIn?: boolean } = {}) {
  return apiFetch<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, keepSignedIn: options.keepSignedIn ?? true }),
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

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export function inviteStaff(email: string, password: string, name: string) {
  return apiFetch<{ user: PublicUser }>("/api/auth/staff", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function listStaff() {
  return apiFetch<{ staff: StaffMember[] }>("/api/auth/staff");
}

export function setStaffActive(id: string, isActive: boolean) {
  return apiFetch<{ staff: StaffMember }>(`/api/auth/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
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

export function getRestaurant() {
  return apiFetch<{ restaurant: Restaurant }>("/api/restaurants/me");
}

export function listReferrals() {
  return apiFetch<{ referrals: ReferredRestaurant[] }>("/api/restaurants/me/referrals");
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
