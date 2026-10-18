# 0006: Eine Schicht kopiert die Werte ihrer Vorlage

- **Status:** Angenommen. Nachträglich dokumentiert, Entscheidung bereits umgesetzt.
- **Datum der Entscheidung:** 24.04.2026 (Initial Commit)

## Kontext

Eine eingetragene Schicht (`Shift`) entsteht aus einer Schicht-Vorlage (`ShiftType`). Vorlagen ändern sich mit der Zeit, z. B. durch neue Dienstzeiten oder eine andere Pausenregelung. Bereits gearbeitete Schichten sollen dabei korrekt bleiben, etwa für spätere Auswertungen der Arbeitszeit.

## Entscheidung

- **Werte werden kopiert:** Beim Eintragen übernimmt die Schicht Name, Zeiten, Pause, geteilte Schicht und Nachtbereitschaft als **Kopie** (`shiftFromType()` in `src/utils/shiftFactory.ts`). Die Verbindung zur Vorlage bleibt über `shiftTypeId` erhalten.
- **Ausnahme Darstellung:** Die **Farbe** wird nicht kopiert, sondern live aus der Vorlage gelesen. Ohne Vorlage ist sie grau. Fehlende Zeitangaben an der Schicht werden für die Nachtschicht-Erkennung aus der Vorlage ergänzt.

## Konsequenzen

- Änderungen an einer Vorlage wirken nur auf neu eingetragene Schichten. Vergangene Schichten bleiben unverändert.
- Gelöschte Vorlagen hinterlassen keine kaputten Schichten.
- Ändert man eine Vorlage absichtlich auch für schon eingetragene künftige Schichten, muss man diese neu eintragen. Eine Funktion „auf künftige Schichten anwenden“ gibt es nicht.
- Wer Schichten anlegt, zum Beispiel der Dienstplan-Import, nutzt `shiftFromType()`, damit die Kopierregel an einer Stelle bleibt.
