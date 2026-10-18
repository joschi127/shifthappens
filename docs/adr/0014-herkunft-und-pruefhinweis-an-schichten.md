# 0014: Herkunft, Änderungsverlauf und Prüfhinweis an Schichten; erneuter Import überschreibt

- **Status:** Angenommen
- **Datum:** 18.10.2026
- **Feature:** [Dienstplan-Import](../prd/dienstplan-import.md)
- **Bezug:** [ADR 0005](0005-offline-first-ohne-backend.md) (Dexie), [ADR 0006](0006-schicht-kopiert-werte-der-vorlage.md) (Kopie der Vorlagenwerte), [ADR 0008](0008-sync-ueber-google-drive-appdata.md) (Sync)

## Kontext

Dienstpläne erscheinen oft zuerst als „Vorplan“ und werden später geändert (Variante 3). Wer eine neue Fassung importiert, erwartet, dass sie die früher importierten Schichten des Monats ersetzt. Selbst angelegte Schichten sollen dabei erhalten bleiben.

Außerdem sollen Schichten, bei denen der Import unsicher ist (z. B. handschriftliche Korrekturen, Variante 4), dauerhaft als „zu prüfen“ markiert sein. Die Markierung erscheint mit einem gelben „?!“-Symbol.

Bisher speichert eine Schicht weder, woher sie stammt, noch wann und wodurch sie zuletzt geändert wurde.

## Entscheidung

`Shift` erhält folgende optionale Felder:

| Feld | Bedeutung |
|---|---|
| `source?: 'manual' \| 'import'` | Herkunft. Ohne Wert gilt `'manual'`, das betrifft alle bestehenden Schichten. |
| `createdAt?: string` | Zeitpunkt der Anlage (ISO) |
| `importedAt?: string` | Zeitpunkt des ersten Imports dieser Schicht (ISO) |
| `importId?: string` | Kennung des Importvorgangs, der die Schicht zuletzt geschrieben hat |
| `updatedAt?: string` | Zeitpunkt der letzten Änderung (ISO) |
| `lastChangeBy?: 'manual' \| 'import'` | Art der letzten Änderung: von Hand oder durch erneuten Import |
| `review?: { reason: string; since: string }` | Prüfhinweis mit Grund, z. B. „Handschriftliche Korrektur im Dienstplan“. Wird bei „Geprüft“ entfernt. |

**Erneuter Import für einen Monat:**

- **Früher importierte Schicht am selben Tag:** Sie wird **überschrieben**, mit derselben ID und `source: 'import'`. `updatedAt` wird gesetzt, `lastChangeBy` wird `'import'`, `importedAt` bleibt erhalten.
- **Früher importierte Schicht an einem Tag, für den die neue Fassung nichts mehr enthält:** Sie wird entfernt, die neue Fassung ist für importierte Schichten maßgeblich.
- **Importierte Schicht, die seit dem Import von Hand geändert wurde** (`lastChangeBy: 'manual'`): Sie wird ebenfalls überschrieben. Die Bestätigungsansicht kennzeichnet sie aber als „von Hand geändert, wird überschrieben“, und man kann sie einzeln ausnehmen.
- **Selbst angelegte Schichten** (`source: 'manual'`) werden nie automatisch überschrieben oder gelöscht. Überschneidungen am selben Tag klärt der bisherige Konfliktdialog.

**Bearbeiten von Hand:** Jede Änderung über die Oberfläche setzt `updatedAt` und `lastChangeBy: 'manual'`.

## Konsequenzen

- **Keine Datenmigration:** Fehlende Felder gelten als „manuell, ohne Verlauf“. Die Felder werden mit Backup und Drive-Sync gesichert, denn sie gehören zur Schicht.
- **Neue Schichten:** Alle Stellen, die Schichten anlegen (Kalender, Import), setzen `createdAt`. Dafür gibt es eine gemeinsame Funktion neben `shiftFromType()`.
- **Bearbeiten:** Eine Oberfläche zum Bearbeiten einzelner Schichten gibt es noch nicht (PRD Kalender). Sie muss `updatedAt` und `lastChangeBy` setzen.
- **Zuordnung beim erneuten Import:** Sie erfolgt über Datum und Herkunft, nicht über Schichtkürzel. Eine Nachtdienst-Kombination (ADR 0013) zählt zum ersten Tag.
- **Prüfhinweis:** Kalender und Tagesliste zeigen ihn als gelbes „?!“-Symbol. Später kann er auch aus anderen Gründen gesetzt werden, z. B. bei unsicherer Erkennung.
- **Kein Verlauf:** Der Verlauf wird bewusst nicht als Liste aller Änderungen gespeichert, nur der letzte Stand. Das hält die Daten klein.
