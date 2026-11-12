"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { signupAction } from "@/app/signup/actions";
import { initialActionState } from "@/lib/action-state";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  formatLimit,
  formatPlanPrice,
  type PlanConfig,
} from "@/lib/subscription/plans";

const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Western",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
  "Ahafo",
  "Bono East",
  "Oti",
  "Savannah",
  "North East",
  "Western North",
];

const BUSINESS_TYPES = [
  "Provision shop",
  "Supermarket",
  "Pharmacy",
  "Electronics shop",
  "Hardware store",
  "Cosmetics shop",
  "Restaurant or food service",
  "Distributor or wholesaler",
  "Fashion and apparel",
  "Other retail",
];

export function SignupForm({
  plans,
  defaultPlan,
}: {
  plans: PlanConfig[];
  defaultPlan: string;
}) {
  const [state, formAction] = useActionState(signupAction, initialActionState);
  const [selectedPlan, setSelectedPlan] = useState(
    plans.find((plan) => plan.key === defaultPlan)?.key ?? plans[0]?.key ?? "starter",
  );
  const plan = plans.find((item) => item.key === selectedPlan) ?? plans[0];
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={state.error} />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5 flex items-start gap-3 border-b border-border/70 pb-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-heading text-[13px] font-semibold text-primary">
            1
          </span>
          <div>
            <h2 className="font-heading text-[16px] font-semibold tracking-[-0.015em]">
              Your owner account
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              This person becomes the owner of the workspace and can invite the rest of the team.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" required error={errors.name?.[0]} className="sm:col-span-2">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              aria-invalid={Boolean(errors.name)}
              placeholder="Ama Mensah"
            />
          </Field>
          <Field label="Email address" htmlFor="email" required error={errors.email?.[0]}>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(errors.email)}
              placeholder="ama@adomprovisions.com"
            />
          </Field>
          <Field
            label="Phone number"
            htmlFor="phone"
            required
            hint="Used for sign-in and SMS alerts."
            error={errors.phone?.[0]}
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-invalid={Boolean(errors.phone)}
              placeholder="024 123 4567"
            />
          </Field>
          <Field label="Password" htmlFor="password" required error={errors.password?.[0]}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.password)}
              placeholder="At least 10 characters"
            />
          </Field>
          <Field label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.[0]}>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.confirmPassword)}
              placeholder="Repeat your password"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5 flex items-start gap-3 border-b border-border/70 pb-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-heading text-[13px] font-semibold text-primary">
            2
          </span>
          <div>
            <h2 className="font-heading text-[16px] font-semibold tracking-[-0.015em]">
              Your business
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              We use this to set up your first branch, receipts and reports.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Business name"
            htmlFor="businessName"
            required
            error={errors.businessName?.[0]}
            className="sm:col-span-2"
          >
            <Input
              id="businessName"
              name="businessName"
              autoComplete="organization"
              required
              aria-invalid={Boolean(errors.businessName)}
              placeholder="Adom Provisions"
            />
          </Field>
          <Field label="Business type" htmlFor="businessType" required error={errors.businessType?.[0]}>
            <select
              id="businessType"
              name="businessType"
              required
              defaultValue=""
              aria-invalid={Boolean(errors.businessType)}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12"
            >
              <option value="" disabled>
                Select a business type
              </option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region" htmlFor="region" required error={errors.region?.[0]}>
            <select
              id="region"
              name="region"
              required
              defaultValue="Greater Accra"
              aria-invalid={Boolean(errors.region)}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12"
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Business location"
            htmlFor="location"
            required
            hint="Town, area or street."
            error={errors.location?.[0]}
          >
            <Input
              id="location"
              name="location"
              required
              aria-invalid={Boolean(errors.location)}
              placeholder="Adabraka, Accra"
            />
          </Field>
          <Field
            label="Main branch name"
            htmlFor="branchName"
            required
            error={errors.branchName?.[0]}
          >
            <Input
              id="branchName"
              name="branchName"
              required
              aria-invalid={Boolean(errors.branchName)}
              placeholder="Main shop"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5 flex items-start gap-3 border-b border-border/70 pb-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-heading text-[13px] font-semibold text-primary">
            3
          </span>
          <div>
            <h2 className="font-heading text-[16px] font-semibold tracking-[-0.015em]">
              Choose your plan
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Billed monthly in Ghana cedis. Change or cancel at any time.
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="sr-only">Subscription plan</legend>
          <div className="grid gap-3">
            {plans.map((item) => {
              const active = selectedPlan === item.key;
              return (
                <label
                  key={item.key}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                    active
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="planKey"
                    value={item.key}
                    checked={active}
                    onChange={() => setSelectedPlan(item.key)}
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-[14px] font-semibold text-ink">
                        {item.name}
                      </span>
                      {item.key === "growth" ? (
                        <Badge variant="gold" className="h-5 px-1.5 text-[10px]">
                          Most popular
                        </Badge>
                      ) : null}
                      <span className="ml-auto font-mono text-[14px] font-semibold text-primary tabular">
                        {formatPlanPrice(item.priceMonthly)}
                        <span className="ml-0.5 font-sans text-[11px] font-normal text-muted-foreground">
                          /mo
                        </span>
                      </span>
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-foreground">
                      {formatLimit(item.maxProducts)} products · {item.maxStaff} staff ·{" "}
                      {item.maxBranches} branch{item.maxBranches === 1 ? "" : "es"} ·{" "}
                      {item.smsCredits} SMS credits
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4 rounded-xl border border-[#e8ddc1] bg-[#fffaf0] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-[#8a641a]" aria-hidden />
            <p className="text-[12px] leading-relaxed text-[#6f551c]">
              You will pay <strong className="font-semibold">{plan ? formatPlanPrice(plan.priceMonthly) : ""}</strong>{" "}
              securely with Paystack. Your workspace activates as soon as the payment is verified.
              We never store your card details.
            </p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            name="acceptTerms"
            value="true"
            required
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              terms of service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms?.[0] ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {errors.acceptTerms[0]}
          </p>
        ) : null}
      </section>

      <SubmitButton
        pendingLabel="Creating workspace…"
        size="lg"
        className="h-11 w-full text-[14px]"
      >
        Continue to secure payment
        <ArrowRight className="size-4" aria-hidden />
      </SubmitButton>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole className="size-3.5 text-primary" aria-hidden /> Paystack-secured checkout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden /> Your data stays private
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleCheck className="size-3.5 text-primary" aria-hidden /> Cancel any time
        </span>
      </div>

      <p className="text-center text-[12px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
