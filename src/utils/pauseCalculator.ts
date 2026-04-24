/**
 * Berechnet die gesetzliche Mindestpause in Deutschland basierend auf der Arbeitszeit.
 * 
 * Gesetzliche Regelung (§ 4 ArbZG):
 * - Mehr als 6 bis zu 9 Stunden: 30 Minuten
 * - Mehr als 9 Stunden: 45 Minuten
 * 
 * @param startTime Startzeit im Format "HH:mm"
 * @param endTime Endzeit im Format "HH:mm"
 * @returns Die gesetzliche Mindestpause in Minuten
 */
export function calculateLegalPause(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  let durationMinutes = end - start;
  
  // Falls die Endzeit vor der Startzeit liegt (Nachtschicht)
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  const hours = durationMinutes / 60;
  
  if (hours > 9) {
    return 45;
  } else if (hours > 6) {
    return 30;
  }
  
  return 0;
}

/**
 * Hilfsfunktion zum Parsen von "HH:mm" in Minuten seit Mitternacht.
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
