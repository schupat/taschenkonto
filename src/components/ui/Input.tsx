import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent",
          error && "border-danger",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
