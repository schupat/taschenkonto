import { cn } from "@/lib/utils";

type CardTone = "default" | "muted" | "tinted";
type CardPadding = "md" | "lg";

export function Card({
  tone = "default",
  padding = "lg",
  interactive = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
  padding?: CardPadding;
  interactive?: boolean;
}) {
  const toneStyles: Record<CardTone, string> = {
    default: "bg-bg-card border-border/50",
    muted: "bg-bg-app border-border/50",
    tinted: "bg-accent-light/40 border-accent/10",
  };
  const paddingStyles: Record<CardPadding, string> = {
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm",
        toneStyles[tone], // eslint-disable-line security/detect-object-injection
        paddingStyles[padding], // eslint-disable-line security/detect-object-injection
        interactive && "card-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
