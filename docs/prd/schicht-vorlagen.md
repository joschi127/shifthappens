# PRD: Schicht-Vorlagen

> Nachträglich dokumentiert (18.10.2026) aus Roadmap, Changelog und Code. Umgesetzt seit 24.04.2026.

Ziel: Wiederkehrende Schichten werden einmal als Vorlage definiert und lassen sich dann mit einem Tipp in den Kalender eintragen.

## Funktionsumfang

| Funktion | Status |
|---|---|
| Name und Farbe (vordefinierte Material-Design-Farben) | ✅ |
| Beginn und Ende im 24-Stunden-Format (`HH:mm`), auch über Mitternacht | ✅ |
| Standardpause, automatisch nach § 4 ArbZG vorbelegt (> 6 Std.: 30 Min., > 9 Std.: 45 Min.), manuell änderbar | ✅ |
| Geteilte Schicht mit zweitem Zeitraum (Vorbelegung: 2 Std. nach Ende, Dauer 2 Std.) | ✅ |
| Nachtbereitschaft mit Zeitraum und anteiliger Anrechnung (Standard 25 %) | ✅ |
| Zusammenfassung der Gesamt-Arbeitszeit (Hauptschicht − Pause + 2. Teil + anteilige Bereitschaft) | ✅ |
| Reihenfolge per Drag & Drop. Bei der Einführung der Sortierung wurden bestehende Vorlagen einmalig nach Beginn und Ende sortiert. | ✅ |
| Löschen (Liste und Bearbeitungsansicht, mit Sicherheitsabfrage) | ✅ |
| Schichtkürzel im Dienstplan für den [Dienstplan-Import](dienstplan-import.md) | ✅ |
| Vorlagen-Art „Abwesenheit“ (z. B. Urlaub, Fortbildung, krank): ganztägig, ohne Zeiten, keine Arbeitszeit ([ADR 0012](../adr/0012-abwesenheiten-als-vorlagen-art.md)) | geplant |
| Rufbereitschafts-Schichten | Idee (Backlog) |

## Regeln

- **Werte werden kopiert:** Eine Schicht übernimmt beim Eintragen die Werte ihrer Vorlage. Spätere Änderungen an der Vorlage verändern bereits eingetragene Schichten nicht (siehe [ADR 0006](../adr/0006-schicht-kopiert-werte-der-vorlage.md)).
- **Pause nur aus der Hauptschicht:** Die gesetzliche Pause wird nur aus der Dauer der Hauptschicht berechnet. Der zweite Teil einer geteilten Schicht fließt nicht ein.
- **Gelöschte Vorlagen:** Löscht man eine Vorlage, bleiben die damit eingetragenen Schichten erhalten. Ihre Farbe wird nicht kopiert, sondern live aus der Vorlage gelesen und fällt dann auf Grau zurück.
