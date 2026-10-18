# 0007: Uhrzeiten und Datum als Strings ohne Zeitzone

- **Status:** Angenommen. Nachträglich dokumentiert, Entscheidung bereits umgesetzt.
- **Datum der Entscheidung:** 24.04.2026 (Initial Commit)

## Kontext

Schichten sind an ein Kalenderdatum und an Uhrzeiten vor Ort gebunden, z. B. „Frühdienst am 3. November, 06:00–14:00“. Zeitstempel mit Zeitzone (`Date`, ISO mit Offset) führen in JavaScript leicht zu Datumsverschiebungen, etwa durch `toISOString()` in UTC oder bei der Sommerzeitumstellung.

## Entscheidung

- **Datum** als lokaler String `YYYY-MM-DD` (`Shift.date`). Erzeugt wird es über `toISODateString()`, das bewusst die lokalen Datumsteile nutzt.
- **Uhrzeiten** als `HH:mm` im 24-Stunden-Format. `ion-datetime` kann ISO-Strings liefern, die werden mit `formatToHHmm()` normalisiert.
- **Schichten über Mitternacht** werden aus den Uhrzeiten abgeleitet: Ende vor Beginn heißt Folgetag (`crossesMidnight()`, `getDurationMinutes()`). Es gibt kein eigenes Enddatum.

## Konsequenzen

- Keine Verschiebungen durch Zeitzonen. Ein Datum ist das, was im Dienstplan steht.
- Schichten von 24 Stunden oder länger lassen sich so nicht abbilden. Das ist für typische Dienstpläne ausreichend.
- Bei der Sommerzeitumstellung rechnet die Dauerberechnung eine Stunde falsch, weil sie mit Wanduhrzeiten rechnet. Das wird bewusst in Kauf genommen.
- Zeitbasierte Funktionen wie Erinnerungen oder ein `.ics`-Export müssen die Strings explizit in die lokale Zeitzone umrechnen.
