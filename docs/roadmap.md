# Roadmap "ShiftHappens"

Diese Datei dokumentiert den geplanten Funktionsumfang und die Meilensteine des Projekts.

## Version 1 (V1) - MVP (Minimum Viable Product)
Der Fokus liegt auf der soliden Grundfunktionalität für die Verwaltung persönlicher Schichtplänen.

### Kernfunktionen
- **Schicht-Typen:** Definition eigener Schichten (Name, Farbe, Standardzeiten, Nachtbereitschaft).
- **Erweiterte Schicht-Optionen:**
  - Erfassung von Pausenzeiten (automatische Vorbelegung nach gesetzlichen Vorgaben).
  - Unterstützung für geteilte Schichten (Split-Shifts).
  - Spezielle Kennzeichnung und Zeitberechnung für Nachtbereitschaft.
  - **Notizen:** Freitextfeld für wichtige Informationen, Aufgaben oder Termine während der Schicht.
- **Kalender-Management:**
  - Monatsansicht zur schnellen Übersicht.
  - Wochenansicht für die detailliertere Wochenplanung.
  - Agenda-Ansicht für die täglichen Details.
  - Schnelleingabe-Modus für wiederkehrende Schichtfolgen.

### Technische Basis
- **Offline First:** Volle Funktionalität ohne Internet via Dexie.js.
- **Mobile First:** Optimiert für Smartphone-Browser und als PWA installierbar.
- **Ionic UI:** Konsistentes, natives Look-and-Feel (Vordefinierte Material Design Farbauswahl).
- **Theme-Support:** Unterstützung für Dark Mode und Light Mode.
- **Kalender-Konfiguration:** Wochenstart ist Montag.
- **Gesetzliche Pausen (DE):** Automatische Berechnung der Mindestpausen (30 Min ab 6 Std, 45 Min ab 9 Std Arbeitszeit).
- **Zeitformat:** Einheitliche Verwendung des 24-Stunden-Formats (HH:mm) für alle Zeitangaben.
- **Sortierung:** Schicht-Vorlagen werden in Listenansichten automatisch primär nach Startzeit und sekundär nach Endzeit sortiert.

---

## Version 2 (V2) - Automatisierung & Komfort
Erweiterung um intelligente Features und Exporte.

### Geplante Features
- **Google Drive Synchronisation & Kalender-Sharing:**
  *Entscheidung: Google Drive wurde als primäre Cloud-Lösung gewählt (Vorteile gegenüber iCloud: Kostenlos für Entwickler, plattformübergreifend für Android/iOS/Web und einfache Freigabe von `.ics`-Dateien).*
  - **Backup & Sync:** Serverlose Synchronisation der App-Daten über das versteckte Google Drive Anwendungsdatenverzeichnis (`appDataFolder`).
  - **Kalender-Abonnement (.ics):** Generierung einer iCalendar-Datei (`.ics`) im regulären Google Drive des Nutzers mit öffentlichem Freigabelink zur Einbindung in Outlook, Apple Calendar oder Google Calendar. Automatische Neuerstellung bei Datenänderungen.
- **Dienstplan-Import per Foto/PDF:** Papier- oder PDF-Dienstplan fotografieren bzw. hochladen; die App erkennt nur die eigene Zeile und trägt die Schichten nach Bestätigung ein. Anforderungen: [PRD](prd/dienstplan-import.md), Entscheidungen: [ADRs](adr/).
- **Rufbereitschaft:** Möglichkeit spezielle Rufbereitschafts-Schichten anzulegen.
- **Smart-Checkout:** Automatisches Erkennen des Schichtendes über den Gerätestandort beim Verlassen des Arbeitsortes (Heimweg-Erkennung).
- **Export-Funktionen:** Export des Plans als PDF oder Text für Messenger-Dienste.
- **Statistiken:** Auswertung von Arbeitszeiten und Schichtverteilungen.

---

## Ideen-Backlog (Zukunftsmusik)
Hier werden Ideen gesammelt, deren Umsetzung noch nicht feststeht, die aber Potenzial für die Zukunft haben.

- **Schicht-Termine:** Möglichkeit, während einer Schicht spezifische Termine zu hinterlegen (z.B. "15:00 Uhr Gespräch mit Frau Z.").
- **Schicht-Aufgaben:** Festhalten von Aufgaben, die innerhalb einer Schicht erledigt werden müssen (z.B. "Anruf bei Amt XY").
- **Mini-Game:** Moorhuhn-ähnliches Mini-Game, um Wartezeiten zu überbrücken.
- **Betreuer-Memes:** Passende Memes für die Betreuer-Arbeit (z.B. zur Beantwortung von Fragen wie "Wie hast du heute geschlafen?"). Ähnlich wie die Visualisierungen in Gentler Streak.
- **iCloud-Synchronisation:** Optionale Erweiterung für reine Apple-Nutzer über CloudKit Web Services. Aufgrund der hohen jährlichen Entwicklergebühren (99$/Jahr) und der komplexeren API-Struktur im Vergleich zu Google Drive ist dies jedoch vorerst zurückgestellt.
- **Umbenennung zu "MyShiftHappens":** Der Name "ShiftHappens" ist bereits stark verbreitet (u.a. mehrere Apps im Google Play/App Store und eine eingetragene US-Marke in anderer Klasse). Eine Umbenennung zu "MyShiftHappens" grenzt das Projekt klarer ab und ist im Schichtplaner-Umfeld noch frei. Umsetzung würde Anpassungen erfordern (u.a. `base`-Pfad in `vite.config.ts`, Repository-Name, ggf. eigene Domain/Package-ID wie `com.myshifthappens.app`; die Domain `myshifthappens.org` ist bereits durch eine themenfremde Coaching-Marke belegt).
