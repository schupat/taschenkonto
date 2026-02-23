import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-bold text-text-primary">404</h2>
      <p className="text-text-secondary">Seite nicht gefunden</p>
      <Link href="/dashboard" className="text-accent hover:underline">
        Zurück zum Dashboard
      </Link>
    </div>
  );
}
