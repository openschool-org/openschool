import type { FieldError } from "@/shared/hooks/useErrorSummary";

// Lists every problem at the top of a form; each item jumps to its field.
export default function ErrorSummary({ errors }: { errors: FieldError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="os-error-summary" role="alert">
      <p className="os-error-summary__title">
        {errors.length === 1 ? "Fix 1 problem to continue" : `Fix ${errors.length} problems to continue`}
      </p>
      <ul>
        {errors.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => document.getElementById(e.id)?.focus()}>
              {e.label ? `${e.label}: ` : ""}
              {e.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
