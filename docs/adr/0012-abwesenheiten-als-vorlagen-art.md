# 0012: Abwesenheiten als eigene Art von Schicht-Vorlage

- **Status:** Angenommen
- **Datum:** 18.10.2026
- **Feature:** [Dienstplan-Import](../prd/dienstplan-import.md), [Schicht-Vorlagen](../prd/schicht-vorlagen.md)
- **Bezug:** [ADR 0002](0002-schichtkuerzel-an-schicht-vorlage.md) (Schichtkürzel), [ADR 0006](0006-schicht-kopiert-werte-der-vorlage.md) (Kopie der Vorlagenwerte), [ADR 0007](0007-zeiten-und-datum-als-strings.md) (Zeitformat)

## Kontext

Dienstpläne enthalten neben Schichten auch Abwesenheiten. Beispiele sind `U` (Urlaub) in der S-Zeile von Variante 3 sowie `U` und `FB` (Fortbildung) in Variante 1. Bisher kennt die App nur Schichten mit Uhrzeiten. Abwesenheiten konnten nur als „Kürzel ohne Eintrag“ übersprungen werden.

Der Import soll Urlaub übernehmen. Dafür braucht die App ein Konzept, das ohne Uhrzeiten auskommt.

### Geprüfte Optionen

| Option | Bewertung |
|---|---|
| **A. Neue Art an der Schicht-Vorlage** (`kind: 'shift' \| 'absence'`) | Nutzt Vorlagen, Schichtkürzel, Kalender, Backup und Sync unverändert weiter. Man pflegt „Urlaub“ wie jede andere Vorlage. |
| B. Eigene Tabelle für Abwesenheiten | Saubere Trennung, aber eine doppelte Infrastruktur: Kürzel, Oberfläche, Backup, Sync, Kalender und ICS. Mehr Aufwand ohne erkennbaren Vorteil. |
| C. Abwesenheiten weiterhin ignorieren | Widerspricht der Anforderung, Urlaub zu übernehmen. |

## Entscheidung

**Option A:**

- **Vorlage:** `ShiftType` erhält `kind?: 'shift' | 'absence'`. Ohne Wert gilt `'shift'`, damit bestehende Vorlagen und Backups unverändert gültig bleiben.
- **Abwesenheiten** sind ganztägig, haben keine Uhrzeiten, Pausen, Nachtbereitschaft oder geteilte Schicht und **zählen nicht als Arbeitszeit**.
- **Schicht:** `Shift` übernimmt die Art beim Anlegen, wie alle anderen Werte (ADR 0006). Bei Abwesenheiten bleiben `startTime` und `endTime` leer (`''`).
- **Schichtkürzel:** Abwesenheiten haben Schichtkürzel wie andere Vorlagen, z. B. `U` → „Urlaub“. Es gilt dieselbe Eindeutigkeit (ADR 0002).
- **„Kürzel ohne Eintrag“** bleibt für Codes, die gar nichts bedeuten sollen, z. B. `-` oder `/`.

## Konsequenzen

- **Keine Datenmigration:** Fehlt `kind`, gilt die Vorlage als Schicht.
- **Code-Stellen, die feste Uhrzeiten voraussetzen**, müssen Abwesenheiten berücksichtigen:
  - Erkennung von Schichten über Mitternacht und Überhang im Kalender
  - Pausenberechnung und Zusammenfassung der Arbeitszeit
  - Sortierung nach Beginn
  - Editor der Vorlagen: Zeitfelder ausblenden
- **Darstellung:** Im Kalender werden Abwesenheiten ganztägig dargestellt, mit eigener Farbe und ohne Zeitangabe.
- **ICS-Abo:** Abwesenheiten werden als ganztägige Termine ausgegeben.
- **Geklärt am 18.10.2026:**
  - Abwesenheiten sind im geteilten Kalender sichtbar.
  - Eine Abwesenheit darf zusammen mit einer Schicht am selben Tag stehen. Das ist untypisch, aber z. B. bei halben Urlaubstagen möglich.
- **Spätere Auswertungen** wie Urlaubstage oder Soll-Anrechnung können auf `kind` aufbauen.
