/**
 * Mirror the code-level plan configuration into the subscription_plans table.
 *
 * `src/lib/subscription/plans.ts` is the source of truth. The database copy is
 * used for joins and display, so it must be refreshed whenever limits, prices,
 * SMS allowances or feature entitlements change.
 *
 * Run with: npm run db:sync-plans
 */

import { loadEnvConfig } from "@next/env";
import { db } from "../src/lib/db";
import { subscriptionPlans } from "../src/lib/db/schema";
import { PLAN_CONFIGS, PLAN_KEYS } from "../src/lib/subscription/plans";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  for (const key of PLAN_KEYS) {
    const plan = PLAN_CONFIGS[key];
    await db
      .insert(subscriptionPlans)
      .values({
        key: plan.key,
        name: plan.name,
        description: plan.description,
        priceMonthly: (plan.priceMonthly / 100).toFixed(2),
        priceYearly: ((plan.priceMonthly * 12) / 100).toFixed(2),
        currency: plan.currency,
        maxEmployees: plan.maxStaff,
        maxBranches: plan.maxBranches,
        maxProducts: plan.maxProducts,
        maxTransactionsPerMonth: plan.maxTransactionsPerMonth,
        smsCredits: plan.smsCredits,
        features: plan.features,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: plan.name,
          description: plan.description,
          priceMonthly: (plan.priceMonthly / 100).toFixed(2),
          priceYearly: ((plan.priceMonthly * 12) / 100).toFixed(2),
          currency: plan.currency,
          maxEmployees: plan.maxStaff,
          maxBranches: plan.maxBranches,
          maxProducts: plan.maxProducts,
          maxTransactionsPerMonth: plan.maxTransactionsPerMonth,
          smsCredits: plan.smsCredits,
          features: plan.features,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        },
      });
    console.log(`✓ ${plan.name}: ${plan.features.length} features, ${plan.smsCredits} SMS credits`);
  }

  const pool = (db as unknown as { $client: { end: () => Promise<void> } }).$client;
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
