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
| Prüfhinweis an Schichten (gelber Punkt im Kalender, „?!“ mit Grund in der Tagesliste, z. B. nach handschriftlicher Korrektur im importierten Dienstplan), entfernbar per „Geprüft“ ([ADR 0014](../adr/0014-herkunft-und-pruefhinweis-an-schichten.md)) | ✅ |
| Abwesenheiten (z. B. Urlaub) ganztägig ohne Zeitangabe anzeigen (gestrichelter Umriss statt Fläche) ([ADR 0012](../adr/0012-abwesenheiten-als-vorlagen-art.md)) | ✅ |
| Überhang in den Folgetag nach der Regel „Hauptteil → Bereitschaft → zweiter Teil“ ([ADR 0013](../adr/0013-kombinierte-schichtkuerzel-ueber-zwei-tage.md)) | ✅ |
| Einzelne Schicht bearbeiten (Zeiten, Pause) | offen |
| Notizen zur Schicht (Datenfeld `notes` vorhanden, noch keine Oberfläche) | offen |
| Wochenansicht | offen (V1 laut Roadmap) |
| Agenda-Ansicht | offen (V1 laut Roadmap) |
| Schnelleingabe für wiederkehrende Schichtfolgen | offen (V1 laut Roadmap) |
| Dienstplan-Import per Foto/PDF | in Arbeit, siehe [PRD](dienstplan-import.md) |
| Export als PDF oder Text | geplant (V2) |
| Statistiken | Idee (Backlog) |

## Rahmen

- **Mobile First:** Die Monatsansicht muss auf einem iPhone-Display ohne horizontales Scrollen funktionieren. Mehrere Schichten an einem Tag dürfen die Zelle nicht vergrößern.
- **Startseite:** Einstieg mit Navigation zu Kalender, Vorlagen und Einstellungen, einem Beta-Hinweis und einem Installationshinweis für die PWA (Android/Desktop: Installationsdialog; iOS: Anleitung über das Teilen-Menü).
- **Darstellung:** Dark und Light Mode sind umschaltbar, die Wahl wird lokal gespeichert.
