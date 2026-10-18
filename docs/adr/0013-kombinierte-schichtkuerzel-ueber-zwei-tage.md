# 0013: Kombinierte Schichtkürzel über zwei Tage

- **Status:** Angenommen. Ergänzt [ADR 0002](0002-schichtkuerzel-an-schicht-vorlage.md).
- **Datum:** 18.10.2026
- **Feature:** [Dienstplan-Import](../prd/dienstplan-import.md)

## Kontext

Im realistischen Dienstplan (Variante 3 in `docs/beispiele/dienstplaene/`) ist ein Nachtdienst auf zwei Tage verteilt:

| Tag | D-Zeile (Dienst) | B-Zeile (Bereitschaft) | Zeiten |
|---|---|---|---|
| 1 | `N01` | `B11` | 17:30–23:57 |
| 2 | `F02` | – | 05:57–07:15 |

Die App fasst Nachtdienste zu *einer* Schicht zusammen und stellt sie im Kalender so dar, mit Überhang in den Folgetag. Die vorhandenen Felder der Vorlage reichen dafür aus:
- **Beginn und Ende:** 17:30–23:57 (N01)
- **Nachtbereitschaft:** 23:57–05:57
- **Zweiter Teil einer geteilten Schicht:** 05:57–07:15 (F02, über Mitternacht)

Es fehlt nur ein Weg, der Vorlage zu sagen, welche Kürzelfolge im Plan sie darstellt.

## Entscheidung

- **Kein neues Feld:** Das vorhandene Feld der Schichtkürzel (`ShiftType.codes`) darf neben einzelnen Kürzeln auch **Kombinationen** enthalten. Die Teile werden mit `+` verbunden.
- **Die Bedeutung ergibt sich aus der Anzahl der Teile:**

| Eintrag | Bedeutung |
|---|---|
| `N01` | einzelner Dienst (wie bisher) |
| `N01 + F02` | Dienst `N01` an Tag 1 **und** Dienst `F02` am Folgetag; die Bereitschaftszeile spielt keine Rolle |
| `N01 + B11 + F02` | wie oben, zusätzlich muss an Tag 1 in der Bereitschaftszeile `B11` stehen |
| `N01 + B* + F02` | wie oben, mit beliebigem Eintrag in der Bereitschaftszeile (Platzhalter, nur falls es mehrere Bereitschaftskürzel gibt) |

- **Normale Schreibweise** ist die vom Papier, also `N01 + B11 + F02`. Der Platzhalter `B*` ist eine zusätzliche Möglichkeit.
- **Höchstens zwei Tage:** Längere Folgen löst der Import durch Aneinanderreihen. Beispiel aus Variante 3: `N01`, `N06`, `F02` → `N01` einzeln, dann `N06 + F02`.
- **Reihenfolge beim Import, spezifischste zuerst:**
  1. Kombination mit Bereitschaft
  2. Kombination ohne Bereitschaft
  3. Einzelnes Kürzel

  Der Folgetag einer erkannten Kombination ist damit verbraucht und erzeugt keine eigene Schicht.
- **Eindeutigkeit (ADR 0002):** Sie gilt pro *Eintrag*, nach Vereinheitlichung der Leerzeichen um `+`. `N01` an einer Vorlage und `N01 + F02` an einer anderen sind erlaubt und auch nötig: Folgt auf `N01` nicht `F02` (z. B. Kessler: `N01`, dann `F04`), greift die einzelne Vorlage.
- **Hinweise im Vorlagen-Editor:**
  - Kombination mit Bereitschaft, aber Nachtbereitschaft an der Vorlage ausgeschaltet
  - Kombination über zwei Tage, aber kein zweiter Teil eingerichtet

### Tageszuordnung der Teile

Die Teile einer Schicht folgen zeitlich aufeinander: **Hauptteil → Nachtbereitschaft → zweiter Teil**. Beginnt ein Teil vor dem Ende des vorherigen, liegt er am Folgetag. Beginnt er zur selben Uhrzeit, schließt er direkt an.

Beispiele aus Variante 3:
- **`N01 + B11 + F02`:** 17:30–23:57, Bereitschaft 23:57–05:57 (über Mitternacht), zweiter Teil 05:57–07:15 am Folgetag.
- **`N06 + B11 + F02`:** 05:57–23:57, Bereitschaft 23:57–05:57, zweiter Teil 05:57–07:15 am Folgetag. Insgesamt über 25 Stunden. Abbildbar, weil jeder einzelne Teil unter 24 Stunden liegt ([ADR 0007](0007-zeiten-und-datum-als-strings.md) gilt pro Teil).

Der Kalender zeigt den Überhang heute schon an, weil die Nachtbereitschaft über Mitternacht geht. ICS-Export und Arbeitszeitberechnung müssen die Regel ausdrücklich anwenden.

## Konsequenzen

- **Keine Schemaänderung:** Bestehende Vorlagen und Backups bleiben gültig.
- **Erkennung der B-Zeile:** Die Bereitschaftszeile muss für `B11` gelesen werden, für `B*` nur auf „beschriftet“ geprüft. `B11` ist ein kurzes Kürzel in einer sonst fast leeren Zeile und gilt als leichter Fall.
- **Gemeinsame Funktion:** Die Kürzelauflösung (`codeResolver`) braucht eine Zerlegung der Einträge, die auch der Editor für die Eindeutigkeitsprüfung nutzt.
- **Hilfetext:** Der Hilfetext im Vorlagen-Editor erklärt die Kombination mit einem Beispiel.
- **Kombinationen über mehr als zwei Tage** oder mit Bereitschaft am zweiten Tag sind nicht abbildbar. Bei Bedarf ergänzt ein neues ADR diese Regel.
