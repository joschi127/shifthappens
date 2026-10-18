# PRD: Kalender

> Nachträglich dokumentiert (18.10.2026) aus Roadmap, Changelog und Code.

Ziel: Schnelle Übersicht über die eigenen Schichten eines Monats und einfaches Eintragen auf dem Smartphone.

## Funktionsumfang

| Funktion | Status |
|---|---|
| Monatsansicht mit Wochenstart Montag, Navigation vor und zurück, Sprung zu heute | ✅ |
| Markierung von heute und vom ausgewählten Tag | ✅ |
| Schicht-Indikatoren in Vorlagenfarbe mit den ersten zwei Buchstaben des Namens, chronologisch sortiert | ✅ |
| Nachtschichten (über Mitternacht, auch durch geteilte Schicht oder Nachtbereitschaft) ragen sichtbar in den Folgetag | ✅ |
| Tagesliste der ausgewählten Schichten, sortiert nach Beginn | ✅ |
| Schicht aus Vorlage hinzufügen (Auswahldialog) | ✅ |
| Schicht per Wischen löschen (mit Sicherheitsabfrage) | ✅ |
| Einzelne Schicht bearbeiten (Zeiten, Pause) | offen |
| Notizen zur Schicht (Datenfeld `notes` vorhanden, noch keine Oberfläche) | offen |
| Wochenansicht | offen (V1 laut Roadmap) |
| Agenda-Ansicht | offen (V1 laut Roadmap) |
| Schnelleingabe für wiederkehrende Schichtfolgen | offen (V1 laut Roadmap) |
| Dienstplan-Import per Foto/PDF | in Arbeit, siehe [PRD](dienstplan-import.md) |
| Statistiken, Export als PDF oder Text | geplant (V2) |

## Rahmen

- **Mobile First:** Die Monatsansicht muss auf einem iPhone-Display ohne horizontales Scrollen funktionieren. Mehrere Schichten an einem Tag dürfen die Zelle nicht vergrößern.
- **Startseite:** Einstieg mit Navigation zu Kalender, Vorlagen und Einstellungen, einem Beta-Hinweis und einem Installationshinweis für die PWA (Android/Desktop: Installationsdialog; iOS: Anleitung über das Teilen-Menü).
- **Darstellung:** Dark und Light Mode sind umschaltbar, die Wahl wird lokal gespeichert.
