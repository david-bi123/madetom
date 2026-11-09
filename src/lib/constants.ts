/** Shared, client-safe constants. */

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Transport",
  "Salaries",
  "Marketing",
  "Supplies",
  "Maintenance",
  "Bank charges",
  "Mobile money fees",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "Mobile Money" },
  { value: "bank", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "credit", label: "Credit (not yet paid)" },
  { value: "other", label: "Other" },
] as const;

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Bono",
  "Ahafo",
  "Upper East",
  "Upper West",
  "Oti",
  "Savannah",
  "North East",
  "Western North",
] as const;

export const PRODUCT_UNITS = [
  "piece",
  "pack",
  "crate",
  "bag",
  "box",
  "bottle",
  "kg",
  "litre",
  "metre",
  "roll",
  "carton",
  "sack",
] as const;
