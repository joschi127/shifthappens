# 0011: Kalender teilen per ICS-Datei mit öffentlichem Link im Google Drive

- **Status:** Vorgeschlagen. Wird nach erfolgreichem PoC (siehe unten) auf „Angenommen“ gesetzt.
- **Datum:** 18.10.2026
- **Feature:** [Kalender teilen](../prd/kalender-teilen.md)
- **Bezug:** [ADR 0005](0005-offline-first-ohne-backend.md) (kein Backend), [ADR 0008](0008-sync-ueber-google-drive-appdata.md) (Drive-Sync), [ADR 0010](0010-google-token-mit-ablaufzeit-speichern.md) (Token)

## Kontext

Die Schichten sollen in beliebigen Kalender-Apps erscheinen, bei mir und bei anderen Personen, **unabhängig vom Kalendersystem**: Outlook, Apple Kalender lokal oder mit iCloud, Google Calendar. Der kleinste gemeinsame Nenner ist ein **ICS-Abo über eine öffentlich abrufbare HTTPS-URL**.

Die App hat kein Backend (ADR 0005) und wird statisch auf GitHub Pages ausgeliefert. Eine URL mit Nutzerdaten muss also ein Dienst bereitstellen, auf den die App schreiben kann. Google Drive ist bereits angebunden (ADR 0008).

Die Idee aus der Roadmap („`.ics` im regulären Drive mit öffentlichem Freigabelink“) stammt aus einem Brainstorming mit kurzem Technik-Check und soll jetzt verprobt werden.

### Geprüfte Optionen

| Option | Bewertung |
|---|---|
| **A. `.ics` im Google Drive mit Freigabe „Jeder mit dem Link“** | Systemunabhängig, kein Server, nutzt die vorhandene Google-Anbindung. Braucht den zusätzlichen Scope `drive.file`, der unkritisch ist. **Offen:** ob Kalender-Apps die Download-URL von Drive zuverlässig abonnieren (Weiterleitungen, Content-Type, mögliche Zwischenseiten oder Begrenzungen). |
| B. Eigener Kalender über die Google Calendar API (`calendar.app.created`) | Gezieltes Teilen und schnelle Aktualisierung, aber **nicht systemunabhängig**: Empfänger ohne Google-Konto bräuchten trotzdem einen öffentlichen ICS-Link. Möglicherweise sensibler Scope mit Prüfung der App durch Google. Schon früher tendenziell abgelehnt. **Verworfen.** |
| C. Einmaliger `.ics`-Export über das Teilen-Menü | Trivial und ohne Berechtigungen, aber kein Abo: Jede Änderung müsste neu verschickt werden. **Nicht als Zwischenlösung**, später eventuell als Ergänzung. |
| D. Eigener Server oder Proxy, der die ICS-Datei ausliefert | Widerspricht ADR 0005. **Verworfen.** |
| E. Anderer Speicher mit öffentlichen URLs (z. B. GitHub Gist, S3) | Bräuchte eine weitere Anmeldung oder Geheimnisse in der App, ohne Vorteil gegenüber A. **Verworfen.** |

## Entscheidung (vorgeschlagen)

**Option A:**
- **Datei anlegen:** Die App legt mit dem Scope `drive.file` eine Datei `shifthappens-dienstplan.ics` (`text/calendar`) im regulären Drive des Nutzers an und setzt die Freigabe `anyone` / `reader`.
- **Abo-Link:** Der abonnierbare Link ist die direkte Download-URL der Datei, nicht die Vorschau-URL.
- **Aktualisierung:** Die Datei wird beim Drive-Sync aktualisiert, wenn sich Schichten geändert haben. Die Datei-ID und damit der Link bleibt dabei gleich.
- **Widerruf:** Datei löschen und bei Bedarf neu anlegen. Das ergibt einen neuen Link.

### PoC vor der Annahme

1. Eine Test-`.ics` mit 2–3 Terminen per API (oder manuell) im Drive anlegen und auf „Jeder mit dem Link“ freigeben.
2. Die Download-URL prüfen: Weiterleitungen, `Content-Type`, keine HTML-Zwischenseite (per `curl -IL`).
3. **Abonnieren** in Google Calendar („Per URL“), Apple Kalender auf dem iPhone ohne Google-Konto (auch als `webcal://`) und Outlook (Web und Desktop).
4. **Darstellung von Nachtschichten** vergleichen: ein durchgehender Termin gegen eine Aufteilung an Mitternacht, siehe PRD.
5. **Datei aktualisieren** (gleiche ID): Kommt die Änderung in allen drei Apps an? Werden Termine dank stabiler UID aktualisiert statt verdoppelt?
6. Prüfen, ob Drive den Abruf öffentlicher Dateien durch Kalender-Server begrenzt oder blockiert.

**Scheitert der PoC**, wird das ADR mit Begründung auf „Abgelehnt“ gesetzt und ein neues ADR für eine Alternative angelegt.

## Konsequenzen

- **Aufwand für Empfänger:** Sie brauchen nur den Link, keine App und kein Konto.
- **Berechtigungen:** Zusätzlich zu `drive.appdata` wird `drive.file` angefordert, was eine erneute Zustimmung erfordert. Die App sieht damit nur Dateien, die sie selbst angelegt hat.
- **Öffentlichkeit:** Schichtnamen und Zeiten sind für jeden mit dem Link einsehbar. Notizen werden deshalb nie exportiert (PRD).
- **Aktualität:** Sie hängt von zwei Faktoren ab, nämlich davon, dass die App läuft und angemeldet ist (ADR 0010), und vom Abruftakt der Kalender-Apps. Beides ist laut PRD akzeptiert.
- **Abhängigkeit von Google:** Ändert Google die Download-URLs oder die Regeln für öffentliche Freigaben, bricht das Abo. Dieses Risiko wird bewusst getragen.
