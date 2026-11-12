/**
 * Public base URL of the deployment.
 *
 * Every link that leaves the platform (invitation SMS, setup links, Paystack
 * callbacks) must point at the real website, never at `localhost`. The
 * resolution order is:
 *
 * 1. `APP_URL` — the explicit production URL (set in the environment).
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — set automatically by Vercel.
 * 3. `VERCEL_URL` — the deployment URL, also provided by Vercel.
 * 4. The incoming request host — the last resort for local development.
 */

import { headers } from "next/headers";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function fromEnvironment(): string | null {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionDomain) return `https://${stripTrailingSlash(productionDomain)}`;

  const deploymentDomain = process.env.VERCEL_URL?.trim();
  if (deploymentDomain) return `https://${stripTrailingSlash(deploymentDomain)}`;

  return null;
}

/** The deployed website URL, safe to call outside a request scope. */
export function getConfiguredAppUrl(): string | null {
  return fromEnvironment();
}

/** The deployed website URL, falling back to the current request host. */
export async function getAppUrl(): Promise<string> {
  const configured = fromEnvironment();
  if (configured) return configured;

  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "localhost:3000";
    const forwardedProto = requestHeaders.get("x-forwarded-proto");
    const protocol = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  } catch {
    // No request scope (scripts, webhooks). Fall back to the deployment.
    return process.env.APP_URL?.trim() ?? "http://localhost:3000";
  }
}
