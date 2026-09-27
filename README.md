# SG Braunschweig – Teampokal 2025/26/27

Mobile Web-App für den Teampokal.

## Funktionen

- Passwort-Login für Team und Administrator
- gemeinsames Ranking
- Admin kann Punkte ändern
- Admin kann Teilnehmer hinzufügen und löschen
- GitHub Pages als Hosting
- Supabase für Authentifizierung und Datenbank
- als Web-App auf dem Homescreen nutzbar

## Einrichtung

1. Kostenloses Supabase-Projekt anlegen.
2. `supabase.sql` im SQL Editor ausführen.
3. Zwei Auth-Benutzer anlegen: Team und Admin.
4. Die Benutzer in `public.profiles` den Rollen `member` und `admin` zuordnen.
5. Project URL und Publishable/Anon Key in `config.js` eintragen.
6. In GitHub Pages den Branch `main` und `/ (root)` veröffentlichen.

## Sicherheit

- Passwörter gehören nicht ins Repository.
- Niemals einen Supabase `service_role`- oder Secret-Key in `config.js` eintragen.
- Adminrechte werden über Supabase Row Level Security geprüft.
