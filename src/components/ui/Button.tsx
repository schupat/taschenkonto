import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantStyles: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-bg-card text-text-primary border border-border hover:bg-bg-app",
  danger: "bg-danger text-white hover:bg-danger/90",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-app",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variantStyles[variant], // eslint-disable-line security/detect-object-injection
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}
