# Taschenkonto

Open-Source-Familienbankingapp: Eltern verwalten virtuelle „Bankkonten" für Kinder — Taschengeld, Aufgaben, Sparziele. Kinder sehen ihren Kontostand in einem Retro-CRT-Terminal (Kiosk). **Es wird kein echtes Geld bewegt** — nur Zahlen, die Eltern offline nachhalten.

## Features

- **Magic-Link-Login** — kein Passwort nötig, E-Mail-Link via [Resend](https://resend.com)
- **Taschengeld-Regeln** — automatische wöchentliche/monatliche Buchungen (idempotenter Cron)
- **Aufgaben & Belohnungen** — Aufgaben definieren, zuweisen, freigeben → automatische Gutschrift
- **Sparziele** — Kinder setzen Ziele mit Fortschrittsbalken
- **Investitionen** — Tagesgeld/Festgeld mit Zinsen (simuliert)
- **Kiosk-Modus** — PIN-geschützter Retro-Terminal für Kinder (CRT-Scanlines, Glow, Flicker)
- **Dark Mode** — System-Erkennung + manueller Toggle
- **Mehrsprachig** — Deutsch (Standard) + Englisch
- **Responsive** — Desktop, Tablet, Mobil

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS v4 |
| Datenbank | PostgreSQL + Prisma 6 |
| Auth (Eltern) | Auth.js v5 — Magic Link via Resend |
| Auth (Kinder) | PIN → JWT (jose) |
| i18n | next-intl v4 (de/en) |
| Validierung | Zod v4 |

## Schnellstart

### Voraussetzungen

- Node.js ≥ 18
- Docker (für PostgreSQL)

### 1. Repo klonen

```bash
git clone https://github.com/schupat/taschenkonto.git
cd taschenkonto
npm install
```

### 2. Datenbank starten

```bash
docker compose up db -d
```

Startet PostgreSQL 17 auf `localhost:5432` (User/Pass/DB: `taschenkonto`).

### 3. Umgebungsvariablen

```bash
cp .env.example .env.local
```

Die Standardwerte in `.env.example` funktionieren sofort für lokale Entwicklung. Für Magic-Link-E-Mails brauchst du einen Resend-API-Key (siehe [Magic-Link-Setup](#magic-link-einrichten)).

### 4. Datenbank migrieren & seeden

```bash
npx prisma migrate dev
npx prisma db seed
```

Seed erstellt eine Demo-Familie:
- **Eltern-Login:** `demo@taschenkonto.app` (Magic Link)
- **Kind Lena:** PIN `1234` (Kontostand 12,50 €)
- **Kind Max:** PIN `5678` (Kontostand 5,00 €)

### 5. Dev-Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Magic-Link einrichten

Taschenkonto nutzt [Resend](https://resend.com) für Magic-Link-E-Mails. Ohne API-Key funktioniert das Login nicht (es wird keine E-Mail versendet).

### Schritte

1. Erstelle einen kostenlosen Account auf [resend.com](https://resend.com)
2. Gehe zu **API Keys** → neuen Key erstellen
3. Trage den Key in `.env.local` ein:

```env
AUTH_RESEND_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

4. **Absenderadresse** (optional):
   - Zum Testen: Resend stellt `onboarding@resend.dev` bereit (Standard)
   - Für Produktion: Eigene Domain in Resend verifizieren und eintragen:

```env
AUTH_EMAIL_FROM="Taschenkonto <noreply@deinedomain.de>"
```

5. **Auth-Secret** generieren (Produktion):

```bash
openssl rand -base64 32
```

```env
AUTH_SECRET="dein-generierter-secret"
```

## Docker-Deployment

### 1. Server vorbereiten

Voraussetzungen auf dem VPS: Docker und Docker Compose.

### 2. Umgebungsvariablen

```bash
cp .env.example .env
```

Mindestens diese Werte anpassen:

| Variable | Beschreibung | Pflicht |
|----------|-------------|---------|
| `AUTH_SECRET` | `openssl rand -base64 32` | ✅ |
| `KIOSK_SESSION_SECRET` | `openssl rand -base64 32` | ✅ |
| `CRON_SECRET` | `openssl rand -base64 32` | ✅ |
| `POSTGRES_PASSWORD` | Datenbank-Passwort (Standard: `taschenkonto`) | ✅ |
| `AUTH_RESEND_KEY` | Resend-API-Key für Magic Links | ✅ |
| `AUTH_EMAIL_FROM` | Absenderadresse | Optional |
| `APP_PORT` | Host-Port (Standard: `3000`) | Optional |

### 3. Starten

```bash
docker compose up --build -d
```

Startet drei Container:

- **db** — PostgreSQL 17
- **app** — Next.js (führt Migrationen beim Start automatisch aus)
- **cron** — Taschengeld (6:00 Uhr) + Zinsen (2:00 Uhr) + DB-Backup (3:00 Uhr), Zeitzone Europe/Berlin

### 4. Reverse Proxy

Die App lauscht auf `APP_PORT` (Standard 3000). Einen Reverse Proxy (z.B. Cloudflare Tunnel, Caddy, nginx) davor setzen für HTTPS.

### 5. Backups

Tägliche PostgreSQL-Backups landen in `./data/backups/` (7 Tage Rotation). Wiederherstellen:

```bash
gunzip -c ./data/backups/taschenkonto-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose exec -T db psql -U taschenkonto taschenkonto
```

### 6. Update

```bash
git pull
docker compose up --build -d
```

Der App-Container führt ausstehende Migrationen beim Neustart automatisch aus.

## Kiosk-Modus

Der Kiosk ist für Tablets im Hochformat optimiert. Kinder melden sich mit ihrer PIN an und sehen:

- Animierter Kontostand (Count-Up/Down)
- Sparziele mit ASCII-Fortschrittsbalken
- Letzte Transaktionen
- Offene Aufgaben

**URL:** `/kiosk`

Für einen dedizierten Kiosk: Browser im Vollbild-/Kiosk-Modus öffnen und auf `/kiosk` zeigen.

## Entwicklung

```bash
npm run dev              # Dev-Server
npm run build            # Produktions-Build
npm run lint             # ESLint
npx prisma studio        # Visueller DB-Browser
npx prisma migrate dev   # Migration erstellen/ausführen
npx prisma db seed       # Demo-Daten laden
```

## Projektstruktur

```
src/
├── app/[locale]/
│   ├── (marketing)/     # Öffentlich: Startseite, Login, Demo
│   ├── (app)/           # Eltern-UI: Dashboard, Kinder, Aufgaben
│   └── (kiosk)/kiosk/   # Kind-Terminal: PIN-Login, Kontoansicht
├── components/
│   ├── app/             # Eltern-UI-Komponenten
│   ├── kiosk/           # Kiosk-Komponenten (CRT-Effekte)
│   └── ui/              # Shared UI (Button, Card, ThemeToggle)
├── lib/
│   ├── services/        # Business-Logik
│   ├── auth.ts          # Auth.js-Konfiguration
│   └── session.ts       # Kiosk-JWT-Session
└── i18n/messages/       # de.json, en.json
```

## Lizenz

MIT
