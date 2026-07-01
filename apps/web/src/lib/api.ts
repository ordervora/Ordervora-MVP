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
  | "WEBSITE"
  | "GOOGLE_MAPS"
  | "DOORDASH"
  | "UBER_EATS"
  | "GRUBHUB";

export type ImportStatus = "PENDING" | "PROCESSING" | "AWAITING_REVIEW" | "APPROVED" | "REJECTED" | "FAILED";

export interface BusinessProfile {
  name?: string;
  address?: string;
  phone?: string;
}

export interface ExtractedMenuData {
  categories: {
    name: string;
    items: { name: string; description?: string; priceCents: number }[];
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
