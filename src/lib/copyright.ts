import { cacheLife } from "next/cache";

/**
 * The copyright year changes at most once a year, so it is cached with the
 * longest possible lifetime. Without the cache, `new Date()` cannot be baked
 * into a prerendered page under Cache Components.
 */
export async function getCopyrightYear(): Promise<number> {
  "use cache";
  cacheLife("max");
  return new Date().getFullYear();
}
