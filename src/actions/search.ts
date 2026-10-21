"use server";
import { backendFetch } from "@/lib/api-client";
import { getCurrentUserId } from "@/actions/auth";
export interface SearchResult {
  id: string;
  name: string;
  kind: string;
  href?: string;
}
export async function globalSearch(query: string): Promise<SearchResult[]> {
  return backendFetch(`/api/search?q=${encodeURIComponent(query)}`, {
    userId: await getCurrentUserId(),
  });
}
