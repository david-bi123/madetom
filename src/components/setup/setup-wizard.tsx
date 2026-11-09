"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { completeSetup } from "@/app/(onboarding)/setup/actions";
import {
  ownerSetupFormSchema,
  staffSetupFormSchema,
} from "@/lib/validation/auth";
import { Field, FormError } from "@/components/forms/field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type SetupContext = {
  token: string;
  type: "owner" | "staff";
  invitationName: string;
  email: string;
  phone: string;
  roleName: string;
  tenantName: string;
  businessType: string;
  region: string;
  location: string;
  branchName: string;
  branchAddress: string;
  taxRate: string;
  pricesIncludeTax: boolean;
  allowPartialPayments: boolean;
  expiresAtLabel: string;
};

type OwnerValues = z.infer<typeof ownerSetupFormSchema>;
type StaffValues = z.infer<typeof staffSetupFormSchema>;

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Western",
  "Western North",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
];

const ownerStepFields: (keyof OwnerValues)[][] = [
  ["name", "email", "phone", "password", "confirmPassword"],
  [
    "businessName",
    "businessType",
    "region",
    "location",
    "branchName",
    "branchAddress",
    "taxRate",
  ],
  [],
];

const staffStepFields: (keyof StaffValues)[][] = [
  ["name", "email", "password", "confirmPassword"],
  [],
];

function Stepper({
  steps,
  current,
  onBack,
}: {
  steps: string[];
  current: number;
  onBack: (step: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto no-scrollbar" aria-label="Setup progress">
      {steps.map((label, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <li key={label} className={cn("flex items-center gap-2", index < steps.length - 1 && "flex-1")}>
            <button
              type="button"
              onClick={() => complete && onBack(index)}
              disabled={!complete}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-colors sm:pr-3",
                active && "border-primary/25 bg-primary/8 text-primary",
                complete && "border-transparent bg-transparent text-muted-foreground hover:text-foreground",
                !active && !complete && "border-transparent text-muted-foreground/70",
              )}
            >
              <span
                className={cn(
                  "flex size-5.5 items-center justify-center rounded-full text-[10.5px] font-semibold",
                  active && "bg-primary text-primary-foreground",
                  complete && "bg-success-soft text-[#12623c]",
                  !active && !complete && "bg-muted text-muted-foreground",
                )}
              >
                {complete ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <span className="text-[12px] font-medium whitespace-nowrap">{label}</span>
            </button>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn("h-px min-w-5 flex-1", complete ? "bg-success/40" : "bg-border")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="w-28 shrink-0 text-[12px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-[13px] font-medium break-words text-foreground">{value}</dd>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded text-[12px] font-medium text-primary underline-offset-4 hover:underline"
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-[#fbfcf9] px-4 py-3.5">
      <div>
        <p id={`${id}-label`} className="text-[13px] font-medium text-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={`${id}-label`}
        className="mt-0.5"
      />
    </div>
  );
}

function Terms({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor="acceptTerms"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white px-4 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground"
      >
        <input
          id="acceptTerms"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={Boolean(error)}
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-[#0f5c47]"
        />
        <span>
          I accept the Madetom terms of service and privacy notice, and I confirm that the
          information above is accurate. I understand that Madetom will send service messages to
          the phone numbers used by this workspace.
        </span>
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#cfe7d8] bg-success-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-[#12623c]">
      <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function OwnerSetupWizard({ context }: { context: SetupContext }) {
  const [step, setStep] = useState(0);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string>();
  const [serverError, setServerError] = useState<string>();

  const form = useForm<OwnerValues>({
    resolver: zodResolver(ownerSetupFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: context.invitationName,
      email: context.email,
      phone: context.phone,
      password: "",
      confirmPassword: "",
      businessName: context.tenantName,
      businessType: context.businessType || "",
      region: context.region || "Greater Accra",
      location: context.location,
      branchName: context.branchName || "Main Shop",
      branchAddress: context.branchAddress || context.location,
      taxRate: context.taxRate || "0",
      pricesIncludeTax: context.pricesIncludeTax,
      allowPartialPayments: context.allowPartialPayments,
    },
  });

  // `useWatch` is the compiler-safe equivalent of `form.watch()`; the form
  // always has default values for every field, so the shape is complete.
  const values = useWatch({ control: form.control }) as OwnerValues;

  useEffect(() => {
    if (step > 0) document.getElementById("setup-wizard")?.scrollIntoView({ block: "start" });
  }, [step]);

  async function next() {
    const fields = ownerStepFields[step];
    if (!fields?.length) {
      setStep((value) => Math.min(value + 1, 2));
      return;
    }
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (valid) setStep((value) => Math.min(value + 1, 2));
  }

  async function submit(values: OwnerValues) {
    setServerError(undefined);
    if (!terms) {
      setTermsError("You must accept the terms to continue.");
      return;
    }
    setTermsError(undefined);

    const formData = new FormData();
    formData.set("token", context.token);
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("phone", values.phone);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    formData.set("businessName", values.businessName);
    formData.set("businessType", values.businessType);
    formData.set("region", values.region);
    formData.set("location", values.location);
    formData.set("branchName", values.branchName);
    formData.set("branchAddress", values.branchAddress);
    formData.set("taxRate", values.taxRate);
    formData.set("pricesIncludeTax", String(values.pricesIncludeTax));
    formData.set("allowPartialPayments", String(values.allowPartialPayments));
    formData.set("acceptTerms", String(terms));

    const result = await completeSetup(formData);
    if (!result) return;

    if (result.fieldErrors) {
      const stepOne = new Set([
        "name",
        "email",
        "phone",
        "password",
        "confirmPassword",
      ]);
      const stepTwo = new Set([
        "businessName",
        "businessType",
        "region",
        "location",
        "branchName",
        "branchAddress",
        "taxRate",
      ]);
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (key in values) {
          form.setError(key as keyof OwnerValues, { type: "server", message: messages[0] });
        }
      }
      if (Object.keys(result.fieldErrors).some((key) => stepOne.has(key))) setStep(0);
      else if (Object.keys(result.fieldErrors).some((key) => stepTwo.has(key))) setStep(1);
    }
    if (result.error) setServerError(result.error);
  }

  return (
    <div id="setup-wizard" className="scroll-mt-6">
      <Stepper steps={["Your account", "Your business", "Review & finish"]} current={step} onBack={setStep} />

      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="mt-5 rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
      >
        <div className="border-b border-border/80 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {step === 0 ? <UserRound className="size-3.5" /> : step === 1 ? <Store className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
            Step {step + 1} of 3
          </div>
          <h2 className="mt-1.5 font-heading text-[19px] font-semibold tracking-[-0.02em]">
            {step === 0 ? "Create the owner account" : step === 1 ? "Tell us about the business" : "Check everything and finish"}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {step === 0
              ? "This is the account you will use to run the workspace. Use a phone number that can receive SMS."
              : step === 1
                ? "These details appear on receipts and reports. You can refine them later in settings."
                : "Your workspace will be activated as soon as you finish. Your setup link will stop working."}
          </p>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {serverError ? <FormError message={serverError} /> : null}

          {step === 0 ? (
            <>
              <SuccessNote>
                You were invited as the <strong>{context.roleName}</strong> of{" "}
                <strong>{context.tenantName}</strong>. Confirm your details below.
              </SuccessNote>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="name" error={form.formState.errors.name?.message} required className="sm:col-span-2">
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="e.g. Ama Mensah"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("name")}
                  />
                </Field>
                <Field label="Email address" htmlFor="email" error={form.formState.errors.email?.message} required>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@business.com"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("email")}
                  />
                </Field>
                <Field label="Phone number" htmlFor="phone" hint="Used for SMS alerts and account recovery." error={form.formState.errors.phone?.message} required>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="024 123 4567"
                    aria-invalid={Boolean(form.formState.errors.phone)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("phone")}
                  />
                </Field>
                <Field label="Password" htmlFor="password" hint="At least 10 characters, with a letter and a number." error={form.formState.errors.password?.message} required>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    {...form.register("password")}
                  />
                </Field>
                <Field label="Confirm password" htmlFor="confirmPassword" error={form.formState.errors.confirmPassword?.message} required>
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Repeat the password"
                    aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                    {...form.register("confirmPassword")}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name" htmlFor="businessName" error={form.formState.errors.businessName?.message} required className="sm:col-span-2">
                  <Input
                    id="businessName"
                    autoComplete="organization"
                    placeholder="e.g. Adom Provisions"
                    aria-invalid={Boolean(form.formState.errors.businessName)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("businessName")}
                  />
                </Field>
                <Field label="What do you sell?" htmlFor="businessType" error={form.formState.errors.businessType?.message} required>
                  <Input
                    id="businessType"
                    placeholder="e.g. Grocery & provisions"
                    aria-invalid={Boolean(form.formState.errors.businessType)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("businessType")}
                  />
                </Field>
                <Field label="Region" htmlFor="region" error={form.formState.errors.region?.message} required>
                  <NativeSelect
                    id="region"
                    aria-invalid={Boolean(form.formState.errors.region)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("region")}
                  >
                    {GHANA_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Business location" htmlFor="location" error={form.formState.errors.location?.message} hint="Town, area or street landmark." required className="sm:col-span-2">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="location"
                      autoComplete="street-address"
                      placeholder="e.g. Adabraka, Accra"
                      aria-invalid={Boolean(form.formState.errors.location)}
                      className="h-11 rounded-xl pl-10 text-[15px]"
                      {...form.register("location")}
                    />
                  </div>
                </Field>
              </div>

              <div className="rounded-xl border border-border bg-[#fbfcf9] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="size-4 text-primary" aria-hidden />
                  <p className="text-[13px] font-semibold">Main branch</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Branch name" htmlFor="branchName" error={form.formState.errors.branchName?.message} required>
                    <Input
                      id="branchName"
                      placeholder="e.g. Adabraka Shop"
                      aria-invalid={Boolean(form.formState.errors.branchName)}
                      className="h-11 rounded-xl text-[15px]"
                      {...form.register("branchName")}
                    />
                  </Field>
                  <Field label="Branch address" htmlFor="branchAddress" error={form.formState.errors.branchAddress?.message} required>
                    <Input
                      id="branchAddress"
                      placeholder="Street, area, city"
                      aria-invalid={Boolean(form.formState.errors.branchAddress)}
                      className="h-11 rounded-xl text-[15px]"
                      {...form.register("branchAddress")}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <Field label="Tax rate" htmlFor="taxRate" error={form.formState.errors.taxRate?.message} hint="Use 0 if not registered for VAT.">
                  <div className="relative">
                    <Input
                      id="taxRate"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.001"
                      placeholder="0"
                      aria-invalid={Boolean(form.formState.errors.taxRate)}
                      className="h-11 rounded-xl pr-8 text-[15px]"
                      {...form.register("taxRate")}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] text-muted-foreground">%</span>
                  </div>
                </Field>
                <div className="space-y-2.5 self-end">
                  <Controller
                    control={form.control}
                    name="pricesIncludeTax"
                    render={({ field }) => (
                      <ToggleRow
                        id="pricesIncludeTax"
                        title="Selling prices include tax"
                        description="Receipts show the tax portion inside the shelf price."
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="allowPartialPayments"
                    render={({ field }) => (
                      <ToggleRow
                        id="allowPartialPayments"
                        title="Allow partial payments"
                        description="Take a deposit now and record the balance against the customer."
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="rounded-xl border border-border bg-[#fbfcf9] p-4">
                <dl className="divide-y divide-border/80">
                  <ReviewRow label="Owner account" value={`${values.name} · ${values.email}`} onEdit={() => setStep(0)} />
                  <ReviewRow label="Phone" value={values.phone} onEdit={() => setStep(0)} />
                  <ReviewRow label="Business" value={values.businessName} onEdit={() => setStep(1)} />
                  <ReviewRow label="Type" value={values.businessType} onEdit={() => setStep(1)} />
                  <ReviewRow label="Location" value={`${values.location}, ${values.region}`} onEdit={() => setStep(1)} />
                  <ReviewRow label="Main branch" value={`${values.branchName} · ${values.branchAddress}`} onEdit={() => setStep(1)} />
                  <ReviewRow
                    label="Tax & payments"
                    value={`${Number(values.taxRate) || 0}% tax · prices ${values.pricesIncludeTax ? "include" : "exclude"} tax · partial payments ${values.allowPartialPayments ? "allowed" : "off"}`}
                    onEdit={() => setStep(1)}
                  />
                </dl>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
                  <Check className="size-4 text-success" aria-hidden />
                  What happens when you finish
                </p>
                <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  <li>• Your workspace and main branch are activated immediately.</li>
                  <li>• You land in the dashboard with a short setup checklist.</li>
                  <li>• You can invite staff, add products and start selling right away.</li>
                </ul>
              </div>

              <Terms checked={terms} onChange={(checked) => { setTerms(checked); setTermsError(undefined); }} error={termsError} />
            </>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)} className="h-10">
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          ) : (
            <span className="hidden text-[12px] text-muted-foreground sm:block">
              Invitation expires {context.expiresAtLabel}
            </span>
          )}
          {step < 2 ? (
            <Button type="button" onClick={next} className="h-10 sm:ml-auto">
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" loading={form.formState.isSubmitting} className="h-10 sm:ml-auto">
              Create workspace
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function StaffSetupWizard({ context }: { context: SetupContext }) {
  const [step, setStep] = useState(0);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string>();
  const [serverError, setServerError] = useState<string>();

  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSetupFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: context.invitationName,
      email: context.email,
      password: "",
      confirmPassword: "",
    },
  });

  // `useWatch` is the compiler-safe equivalent of `form.watch()`; the form
  // always has default values for every field, so the shape is complete.
  const values = useWatch({ control: form.control }) as StaffValues;

  useEffect(() => {
    if (step > 0) document.getElementById("setup-wizard")?.scrollIntoView({ block: "start" });
  }, [step]);

  async function next() {
    const valid = await form.trigger(staffStepFields[step], { shouldFocus: true });
    if (valid) setStep(1);
  }

  async function submit(values: StaffValues) {
    setServerError(undefined);
    if (!terms) {
      setTermsError("You must accept the terms to continue.");
      return;
    }
    setTermsError(undefined);

    const formData = new FormData();
    formData.set("token", context.token);
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    formData.set("acceptTerms", String(terms));

    const result = await completeSetup(formData);
    if (!result) return;

    if (result.fieldErrors) {
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (key in values) {
          form.setError(key as keyof StaffValues, { type: "server", message: messages[0] });
        }
      }
      if (Object.keys(result.fieldErrors).some((key) => ["name", "email", "password", "confirmPassword"].includes(key))) {
        setStep(0);
      }
    }
    if (result.error) setServerError(result.error);
  }

  return (
    <div id="setup-wizard" className="scroll-mt-6">
      <Stepper steps={["Your account", "Review & finish"]} current={step} onBack={setStep} />

      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="mt-5 rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
      >
        <div className="border-b border-border/80 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <UserRound className="size-3.5" />
            Step {step + 1} of 2
          </div>
          <h2 className="mt-1.5 font-heading text-[19px] font-semibold tracking-[-0.02em]">
            {step === 0 ? "Set up your staff account" : "Review and join the workspace"}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {step === 0
              ? `You have been invited to ${context.tenantName} as a ${context.roleName}.`
              : "Confirm your details and accept the terms to enter the workspace."}
          </p>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {serverError ? <FormError message={serverError} /> : null}

          {step === 0 ? (
            <>
              <SuccessNote>
                <strong>{context.tenantName}</strong> invited you to join as a{" "}
                <strong>{context.roleName}</strong>. Your branch is{" "}
                <strong>{context.branchName || "assigned by the owner"}</strong>.
              </SuccessNote>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="staff-name" error={form.formState.errors.name?.message} required className="sm:col-span-2">
                  <Input
                    id="staff-name"
                    autoComplete="name"
                    placeholder="Your full name"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("name")}
                  />
                </Field>
                <Field label="Email address" htmlFor="staff-email" error={form.formState.errors.email?.message} required className="sm:col-span-2">
                  <Input
                    id="staff-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@business.com"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    className="h-11 rounded-xl text-[15px]"
                    {...form.register("email")}
                  />
                </Field>
                <Field label="Password" htmlFor="staff-password" hint="At least 10 characters, with a letter and a number." error={form.formState.errors.password?.message} required>
                  <PasswordInput
                    id="staff-password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    {...form.register("password")}
                  />
                </Field>
                <Field label="Confirm password" htmlFor="staff-confirm" error={form.formState.errors.confirmPassword?.message} required>
                  <PasswordInput
                    id="staff-confirm"
                    autoComplete="new-password"
                    placeholder="Repeat the password"
                    aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                    {...form.register("confirmPassword")}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="rounded-xl border border-border bg-[#fbfcf9] p-4">
                <dl className="divide-y divide-border/80">
                  <ReviewRow label="Name" value={values.name} onEdit={() => setStep(0)} />
                  <ReviewRow label="Email" value={values.email} onEdit={() => setStep(0)} />
                  <ReviewRow label="Workspace" value={context.tenantName} />
                  <ReviewRow label="Role" value={context.roleName} />
                  <ReviewRow label="Branch" value={context.branchName || "Assigned by the owner"} />
                </dl>
              </div>
              <Terms checked={terms} onChange={(checked) => { setTerms(checked); setTermsError(undefined); }} error={termsError} />
            </>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep(0)} className="h-10">
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          ) : (
            <span className="hidden text-[12px] text-muted-foreground sm:block">
              Invitation expires {context.expiresAtLabel}
            </span>
          )}
          {step === 0 ? (
            <Button type="button" onClick={next} className="h-10 sm:ml-auto">
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" loading={form.formState.isSubmitting} className="h-10 sm:ml-auto">
              Join workspace
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
