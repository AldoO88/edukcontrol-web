// Utilidades de fecha — SOLO fechas locales (sin desfase UTC).
//
// Por qué existe: `new Date().toISOString().split('T')[0]` da la fecha
// en UTC; en México (UTC-6) a partir de las 18:00 local devuelve el día
// SIGUIENTE. Para todo lo que consulte asistencia por día escolar
// (historial del grupo, override manual) usamos los componentes
// LOCALES de la fecha.

// "YYYY-MM-DD" a partir de los componentes locales de la fecha.
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Copia de la fecha desplazada N días (navegación ← Anterior / Siguiente).
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
