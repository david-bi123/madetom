"use client";

import { useActionState, useState } from "react";
import { updatePlatformSetting } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type SettingDefinition = {
  key: string;
  label: string;
  description: string;
  type: "boolean" | "number" | "text";
};

const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "platform.maintenance.enabled",
    label: "Maintenance mode",
    description: "When on, staff see a maintenance banner instead of trading screens.",
    type: "boolean",
  },
  {
    key: "platform.maintenance.message",
    label: "Maintenance message",
    description: "Shown in the banner while maintenance mode is on.",
    type: "text",
  },
  {
    key: "platform.support.email",
    label: "Support email",
    description: "Address shown on setup and support screens.",
    type: "text",
  },
  {
    key: "platform.trial_days",
    label: "Trial length (days)",
    description: "Days a new organisation stays in trial before its first renewal.",
    type: "number",
  },
];

type PlatformSettingFormProps = {
  currentValues: Record<string, unknown>;
};

export function PlatformSettingForm({ currentValues }: PlatformSettingFormProps) {
  const [state, formAction] = useActionState(updatePlatformSetting, initialActionState);
  const [selectedKey, setSelectedKey] = useState(SETTING_DEFINITIONS[0].key);

  const definition = SETTING_DEFINITIONS.find((item) => item.key === selectedKey)!;
  const currentValue = currentValues[definition.key];

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Platform setting"
        description="Changes apply across every workspace as soon as they are saved."
      >
        <FormGrid>
          <Field label="Setting" htmlFor="key" required className="sm:col-span-2">
            <NativeSelect
              id="key"
              name="key"
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
            >
              {SETTING_DEFINITIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Value"
            htmlFor="value"
            required
            hint={definition.description}
            className="sm:col-span-2"
          >
            {definition.type === "boolean" ? (
              <NativeSelect
                id="value"
                name="value"
                defaultValue={currentValue === true ? "true" : "false"}
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </NativeSelect>
            ) : (
              <Input
                id="value"
                name="value"
                type={definition.type === "number" ? "number" : "text"}
                required
                defaultValue={
                  currentValue === null || currentValue === undefined
                    ? ""
                    : String(currentValue)
                }
                className="h-9 text-[13px]"
              />
            )}
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Save setting</SubmitButton>
      </div>
    </form>
  );
}
