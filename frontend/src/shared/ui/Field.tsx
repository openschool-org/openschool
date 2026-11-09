import type { ReactNode } from "react";

interface Props {
  id: string;
  label?: ReactNode;
  hideLabel?: boolean;
  error?: string;
  helper?: string;
  className?: string;
  children: ReactNode;
}

// Label, control and error text for a standalone antd input outside an antd Form.
export default function Field({ id, label, hideLabel, error, helper, className, children }: Props) {
  return (
    <div className={`os-field${error ? " is-invalid" : ""}${className ? ` ${className}` : ""}`}>
      {label && <label htmlFor={id} className={hideLabel ? "os-sr-only" : "os-field__label"}>{label}</label>}
      {children}
      {error ? <p id={`${id}-error`} className="os-field__error" role="alert">{error}</p> : helper && <p className="os-field__helper">{helper}</p>}
    </div>
  );
}
