# PRD: Abwesenheiten im Dienstplan zuverlässiger erkennen (Entwurf)

> **Status: Entwurf, noch unvollständig.** Gesammelt sind bisher nur Ausgangslage und Ideen. Ziel, Umfang und Umsetzungsschritte werden ergänzt, bevor die Arbeit beginnt.

Ziel (vorläufig): Einträge in der Abwesenheitszeile (z. B. „U“ für Urlaub) werden auf echten Fotos genauso zuverlässig erkannt wie die Dienstkürzel, damit Urlaubsmonate ohne viel Nachtippen importiert werden können.

## Ausgangslage

- **Teil des [Dienstplan-Imports](dienstplan-import.md):** Abwesenheiten sind eigene Schicht-Vorlagen der Art „Abwesenheit“ ([ADR 0012](../adr/0012-abwesenheiten-als-vorlagen-art.md)). Gelesen wird die Unterzeile „S“ (Sonder) des eigenen Blocks.
- **Auf sauberen Bildern zuverlässig:** keine unsicheren Zellen in Variante 3 bis 5.
- **Auf den echten Fotos von Variante 5 bleibt ein großer Teil unsicher:** 14 bis 26 Abwesenheitszellen je Bild, im Vergleich zu 12 bis 15 bei den Dienstkürzeln (Referenz: `src/import/recognition.baseline.json`). Sicher falsche Zellen gibt es keine.
- **Folge für den Nutzer:** In einem Urlaubsmonat muss er viele Tage einzeln bestätigen.

## Vermutete Ursachen (zu prüfen)

- **Einzelbuchstabe:** „U“ ist ein einzelnes Zeichen in einer niedrigen Unterzeile. Die Texterkennung liest einzelne Zeichen deutlich unsicherer als dreistellige Kürzel.
- **Schwellen:** Die Leer-Schwelle (Otsu über den Zellkontrast) ist für eine fast leere Zeile wenig aussagekräftig.
- **Muster:** Ein Mustervergleich findet bei wenigen „U“ im Plan kaum Beispiele.

## Ideen (unbewertet)

- **Muster über alle Personen:** Muster für „U“ aus allen Abwesenheitszeilen der Tabelle bzw. der Nachbarblöcke sammeln, nicht nur aus dem eigenen Block.
- **Streifen-Erkennung:** wie bei der Dienstzeile auch für die Abwesenheitszeile, mit Abgleich gegen die Einzelzellen.
- **Zusammenhängende Zeiträume:** Urlaub kommt meist in Blöcken mehrerer Tage. Einzelne unsichere Tage zwischen sicheren „U“ könnten mit hoher Ähnlichkeit übernommen werden, aber nie ohne Musterprüfung.
- **Abgleich mit der Dienstzeile:** An Tagen mit Abwesenheit steht in der Dienstzeile oft „-“. Das ist allenfalls ein schwaches Indiz und kein Beweis.
- **Bestätigungsansicht:** Mehrere unsichere „U“ auf einmal bestätigen (z. B. „alle vorgeschlagenen U übernehmen“).

## Abwesenheitskürzel

Diese Kürzel werden berücksichtigt (festgelegt am 18.10.2026):

| Kürzel | Bedeutung |
|---|---|
| `U` | Urlaub |
| `K` | krank |
| `FB` | Fortbildung |

Die Nutzer legen sie als Schicht-Vorlagen der Art „Abwesenheit“ mit dem jeweiligen Kürzel an. Testbilder enthalten bisher nur „U“. Für „K“ und „FB“ fehlen noch Beispiele.

## Offene Fragen

- Wie viel Nachbestätigung ist für Nutzer akzeptabel?
