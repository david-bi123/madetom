import type { ZodError } from "zod";

export type FieldErrors = Record<string, string[]>;

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  data?: Record<string, unknown>;
};

export const initialActionState: ActionState = {};

export function zodState(error: ZodError): ActionState {
  const flattened = error.flatten();
  return {
    error: "Please correct the highlighted fields and try again.",
    fieldErrors: flattened.fieldErrors as FieldErrors,
  };
}

export function messageState(error: string): ActionState {
  return { error };
}

export function successState(success: string, data?: Record<string, unknown>): ActionState {
  return { success, data };
}

export function formString(formData: FormData, key: string, trim = true): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return trim ? value.trim() : value;
}
