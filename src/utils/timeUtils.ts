/**
 * Addiert Stunden zu einer Zeit im Format HH:mm oder ISO-String.
 * Gibt die neue Zeit im Format HH:mm zurück.
 */
export const addHours = (time: string, hours: number): string => {
  let date: Date;
  
  if (time.includes('T')) {
    date = new Date(time);
  } else {
    const [h, m] = time.split(':').map(Number);
    date = new Date();
    date.setHours(h, m, 0, 0);
  }
  
  date.setHours(date.getHours() + hours);
  
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  
  return `${h}:${m}`;
};

/**
 * Berechnet die Differenz in Minuten zwischen zwei Uhrzeiten (HH:mm oder ISO).
 * Berücksichtigt den Tageswechsel (z.B. 22:00 bis 06:00).
 */
export const getDurationMinutes = (startTime: string, endTime: string): number => {
  const start = formatToHHmm(startTime);
  const end = formatToHHmm(endTime);

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  
  // Tageswechsel korrigieren
  if (diff < 0) {
    diff += 24 * 60;
  }

  return diff;
};

/**
 * Formatiert Minuten in das Format "X Std. Y Min." oder "Xh Ym".
 */
export const formatDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours === 0) return `${minutes} Min.`;
  if (minutes === 0) return `${hours} Std.`;
  return `${hours} Std. ${minutes} Min.`;
};

/**
 * Formatiert eine Zeit (ISO oder HH:mm) zu HH:mm.
 */
export const formatToHHmm = (time?: string): string => {
  if (!time) return '00:00';
  if (time.includes('T')) {
    return time.split('T')[1].substring(0, 5);
  }
  return time;
};

/**
 * Prüft, ob eine Schicht (oder ein Teil davon) über Mitternacht geht.
 */
export const crossesMidnight = (startTime: string, endTime: string): boolean => {
  const start = formatToHHmm(startTime);
  const end = formatToHHmm(endTime);

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return endMinutes < startMinutes;
};

/**
 * Gibt das Datum des nächsten Tages als ISO-String zurück.
 */
export const getNextDayISO = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return toISODateString(d);
};

/**
 * Konvertiert ein Date-Objekt sicher in einen ISO-Datum-String (YYYY-MM-DD),
 * ohne Probleme mit Zeitzonen-Verschiebungen.
 */
export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
