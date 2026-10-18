# 0010: Google-Zugriffstoken mit Ablaufzeit lokal speichern

- **Status:** Angenommen. Ergänzt [ADR 0008](0008-sync-ueber-google-drive-appdata.md).
- **Datum:** 18.10.2026

## Kontext

Laut ADR 0008 lag das Zugriffstoken nur im Arbeitsspeicher. Nach jedem Neuladen der App, also bei jedem Start der PWA, fehlte es deshalb. Der automatische Sync scheiterte still, obwohl die Einstellungen „Verbunden“ anzeigten.

Google Identity Services (Token-Client) stellt im Browser **kein Refresh-Token** aus. Ein neues Zugriffstoken gibt es nur über ein Google-Popup, und Browser öffnen Popups nur nach einer Nutzeraktion. Ein Refresh-Token über den Authorization-Code-Flow würde einen Server brauchen, das widerspricht [ADR 0005](0005-offline-first-ohne-backend.md).

## Entscheidung

- **Token mit Ablaufzeit speichern:** Das Zugriffstoken wird mit Ablaufzeit in `localStorage` gespeichert (`google_access_token`, `google_access_token_expires_at`, eine Minute Puffer). So übersteht die Verbindung ein Neuladen, solange das Token gültig ist (rund eine Stunde).
- **Prüfung vor jedem Zugriff:** Vor jedem Drive-Zugriff wird die Ablaufzeit geprüft. Antwortet Google mit 401, wird das Token verworfen.
- **Verbunden, aber ohne Token** gilt als eigener Zustand `needsReauth`:
  - **In den Einstellungen:** Hinweis „Anmeldung abgelaufen“ mit einem „Anmelden“-Knopf.
  - **Beim automatischen Sync:** einmal pro Sitzung ein Hinweis mit „Anmelden“. Der Tipp darauf ist die Nutzeraktion, die das Popup erlaubt.
  - **Erneute Anmeldung ohne Kontoauswahl:** Sie nutzt `login_hint` mit der bekannten E-Mail-Adresse.
- **Sync beim Start:** Der automatische Sync läuft beim App-Start sofort, nicht erst nach 15 Minuten.
- **Beim Trennen** wird das Token bei Google widerrufen und lokal gelöscht.

## Konsequenzen

- **Neuladen und App-Neustart innerhalb der Gültigkeit** unterbrechen den Sync nicht mehr.
- **Nach Ablauf** ist weiterhin ein Tipp nötig. Danach ist der Zustand aber sichtbar, und der Sync scheitert nicht mehr still.
- **Sicherheit:** Ein Token in `localStorage` ist für eingeschleusten JavaScript-Code (XSS) lesbar. Das Risiko wird akzeptiert, aus diesen Gründen:
  - Der Scope ist auf den versteckten App-Ordner und die E-Mail-Adresse beschränkt.
  - Das Token läuft nach rund einer Stunde ab.
  - Bei XSS wären die Daten in IndexedDB ohnehin genauso lesbar.
- **Fehler unterscheiden:** Fehler beim Suchen der Cloud-Datei werden nicht mehr als „keine Datei vorhanden“ gewertet. Das verhindert, dass eine zweite Backup-Datei angelegt wird.
