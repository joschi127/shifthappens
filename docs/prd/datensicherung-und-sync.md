# PRD: Datensicherung und Synchronisation

> Nachträglich dokumentiert (18.10.2026) aus Roadmap, Changelog und Code. Drive-Sync umgesetzt seit 01.08.2026.

Ziel: Die lokal gespeicherten Daten gehen bei Gerätewechsel oder Datenverlust nicht verloren und lassen sich zwischen Geräten abgleichen, ohne eigenes Backend.

## Funktionsumfang

| Funktion | Status |
|---|---|
| Backup als JSON-Datei exportieren (alle Schichten, Vorlagen und Import-Einstellungen) | ✅ |
| Backup importieren (ersetzt den lokalen Stand nach Sicherheitsabfrage, ältere Backup-Formate werden unterstützt) | ✅ |
| Mit Google Drive verbinden und trennen, Anzeige des verbundenen Kontos | ✅ |
| Manueller Sync in den versteckten Anwendungsordner (`appDataFolder`) | ✅ |
| Konflikterkennung (lokal und Cloud geändert) mit Auswahl „Cloud-Stand“ oder „Lokalen Stand“ | ✅ |
| Automatischer Sync alle 15 Minuten (optional) | ✅ mit Einschränkung, siehe unten |
| Anzeige von letzter Synchronisation und Richtung | ✅ |
| Kalender-Abo (`.ics`) im regulären Drive mit Freigabelink | geplant (V2) |

## Regeln und Einschränkungen

- **Ganzer Datenstand:** Synchronisiert wird immer der ganze Datenstand als eine Datei, nicht einzelne Einträge (siehe [ADR 0008](../adr/0008-sync-ueber-google-drive-appdata.md)).
- **Konflikte beim automatischen Sync:** Der neuere Stand gewinnt vollständig, Änderungen der anderen Seite gehen dabei verloren.
- **Bekannte Einschränkung:** Das Zugriffstoken liegt nur im Arbeitsspeicher. Nach einem Neuladen der App läuft der automatische Sync erst wieder, wenn einmal manuell synchronisiert oder neu verbunden wurde.
- **Datenschutz:** Google sieht nur die Backup-Datei im Anwendungsordner. Die App fordert keinen Zugriff auf andere Drive-Dateien an.
