interface AsciiProgressBarProps {
  current: number;
  target: number;
  width?: number;
}

export function AsciiProgressBar({ current, target, width = 20 }: AsciiProgressBarProps) {
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const percent = Math.round(ratio * 100);

  return (
    <span className="ascii-bar text-sm">
      <span className="text-kiosk-text">{"[" + "█".repeat(filled)}</span>
      <span className="text-kiosk-text-dim">{"░".repeat(empty) + "]"}</span>
      <span className="ml-2 text-kiosk-amber">{percent}%</span>
    </span>
  );
}
