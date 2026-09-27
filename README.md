# SG Braunschweig – Teampokal 2026/27

Mobile Web-App für den SG-Braunschweig-Teampokal.

## Funktionen

- Passwort-Login für Team und Administrator
- Teamansicht zeigt die Top 5
- Plätze 1, 2 und 3 sind Gold, Silber und Bronze markiert
- Admin sieht das vollständige Ranking
- kompakte Spielerliste mit Popup für Punktkorrekturen
- Schnellkorrekturen um -2, -1, +1 und +2 Punkte
- Sammelbuchung „Personen beim Training heute“ mit +2 Punkten für alle Ausgewählten
- Teilnehmer hinzufügen und löschen
- Punkte-Legende für Training, Spiel, Trikots, Kampfgericht und Abzüge
- Black-Mode und SG-Braunschweig-Logo
- GitHub Pages als Hosting
- Supabase für Authentifizierung und Datenbank
- als Web-App auf dem Homescreen nutzbar

## Sicherheit

- Passwörter liegen nicht im Repository.
- Login-E-Mail-Adressen werden nicht im öffentlichen Frontend angezeigt oder gespeichert.
- Niemals einen Supabase `service_role`- oder Secret-Key in `config.js` eintragen.
- Adminrechte werden über Supabase Row Level Security geprüft.
