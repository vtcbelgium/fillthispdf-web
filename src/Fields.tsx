import type { FormField, Values } from "./pdf";
import type { Messages } from "./i18n";
export function FieldControl({
  field,
  value,
  onChange,
  t,
  option,
}: {
  field: FormField;
  value: Values[string];
  onChange: (value: Values[string]) => void;
  t: Messages;
  option?: string;
}) {
  const shared = {
    "aria-label": field.name,
    disabled: field.readOnly,
    title: field.readOnly ? t.readOnly : field.name,
  };
  if (field.kind === "check")
    return (
      <input
        {...shared}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  if (field.kind === "radio" && option)
    return (
      <input
        {...shared}
        type="radio"
        checked={value === option}
        onChange={() => onChange(option)}
      />
    );
  if (field.kind === "choice" && field.editable)
    return (
      <input
        {...shared}
        value={Array.isArray(value) ? value[0] || "" : String(value)}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      />
    );
  if (field.kind === "choice" && field.multiple)
    return (
      <select
        {...shared}
        multiple
        value={Array.isArray(value) ? value : []}
        onChange={(e) =>
          onChange(Array.from(e.target.selectedOptions, (o) => o.value))
        }
      >
        {field.options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  if (field.kind === "choice" || field.kind === "radio")
    return (
      <select
        {...shared}
        value={Array.isArray(value) ? value[0] || "" : String(value)}
        onChange={(e) =>
          onChange(
            field.kind === "choice"
              ? e.target.value
                ? [e.target.value]
                : []
              : e.target.value,
          )
        }
      >
        <option value="">{t.blank}</option>
        {field.options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  if (field.multiline)
    return (
      <textarea
        {...shared}
        value={String(value)}
        maxLength={field.maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  return (
    <input
      {...shared}
      value={String(value)}
      maxLength={field.maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
