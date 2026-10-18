# 0002: Schichtkürzel werden an der Schicht-Vorlage gespeichert

- **Status:** Angenommen, ergänzt durch [ADR 0013](0013-kombinierte-schichtkuerzel-ueber-zwei-tage.md) (Kombinationen über zwei Tage)
- **Datum:** 18.10.2026
- **Feature:** [Dienstplan-Import](../prd/dienstplan-import.md)

## Kontext

Papier-Dienstpläne stehen pro Tag als Kürzel in der Zelle, z. B. `F`, `S`, `N` oder `F1`. Die Kürzel unterscheiden sich je nach Organisation. Damit der Import daraus Einträge machen kann, muss jedem Kürzel eine Schicht mit Uhrzeiten zugeordnet sein.

Die ursprüngliche Übergabe sah eine eigene **Schichtlegende** vor, also Kürzel → Schichtart/Uhrzeit. Diese Informationen (Uhrzeiten, Farbe, Pause, geteilte Schicht, Nachtbereitschaft) stehen aber schon an den **Schicht-Vorlagen** (`ShiftType`).

Außerdem gibt es Kürzel, die **keinen Eintrag** erzeugen sollen, z. B. frei, Urlaub oder krank.

## Entscheidung

- `ShiftType` bekommt das Feld `codes?: string[]` mit den Kürzeln, so wie sie auf dem Papier-Dienstplan stehen. Mehrere Kürzel pro Vorlage sind möglich.
- **Ein Kürzel darf nur an einer Vorlage hängen.** Der Vergleich ignoriert Groß- und Kleinschreibung, unterscheidet aber Umlaute.
- Kürzel ohne Eintrag stehen als `ignoreCodes` im Import-Profil (siehe [ADR 0003](0003-import-einstellungen-in-dexie-mit-sync.md)). Ein Kürzel ist entweder Schichtkürzel oder ohne Eintrag, nie beides. Beides wird beim Speichern geprüft.
- In der Oberfläche heißt das Feld „Schichtkürzel im Dienstplan“, mit dem Hinweis, es so einzugeben wie auf dem Papier-Dienstplan. Es ist klar getrennt vom „Name im Dienstplan“ der Person.
- Die Kürzel müssen nicht vorab gepflegt werden. Unbekannte Kürzel ordnet man in der Bestätigungsansicht des Imports einer Vorlage zu und kann sie dort merken.

## Konsequenzen

- Es gibt keine doppelte Pflege von Uhrzeiten, und die bestehenden Vorlagen werden direkt nutzbar.
- Das Feld ist nicht indiziert, deshalb braucht es keine Datenmigration. Vorlagen aus älteren Backups haben einfach keine Kürzel.
- Wer bei mehreren Arbeitgebern dasselbe Kürzel für unterschiedliche Schichten hat, stößt an die Eindeutigkeitsregel. Falls das relevant wird, könnten Kürzel später pro Import-Vorlage (also pro Arbeitgeber) gelten.
