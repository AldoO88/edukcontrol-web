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

// ---------------------------------------------------------------------
// formatDateTimeLocal
// ---------------------------------------------------------------------
// Extrae date ('YYYY-MM-DD') y time ('HH:mm') de un ISO datetime con
// getters LOCALES (port exacto de citationHelpers.formatDateTime de la
// app): desde la migración 2026-10-14 `scheduledDate` es instante UTC
// real, así que la hora que ve el usuario es la de su navegador.
export function formatDateTimeLocal(
  isoString?: string | null
): { date: string; time: string } {
  if (!isoString) return { date: "", time: "" };
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  } catch {
    return { date: "", time: "" };
  }
}

// ---------------------------------------------------------------------
// naiveLocalIso
// ---------------------------------------------------------------------
// Payload de citatorios: el backend recibe scheduledDate como ISO
// LOCAL NAÏVE 'YYYY-MM-DDTHH:mm:ss' (sin Z ni offset) — convención
// vigente desde 2026-10-14. `date` = 'YYYY-MM-DD', `time` = 'HH:mm'.
export function naiveLocalIso(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

// ---------------------------------------------------------------------
// formatTime12
// ---------------------------------------------------------------------
// 'HH:mm' → '8:30 a.m.' (12h con punto de meridiano en español,
// sin depender del locale del runtime).
export function formatTime12(hhmm?: string | null): string {
  if (!hhmm) return "";
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${String(Number.isNaN(m) ? 0 : m).padStart(2, "0")} ${period}`;
}

// ---------------------------------------------------------------------
// formatShortDate / formatFullDateTime
// ---------------------------------------------------------------------
// 'YYYY-MM-DD' o ISO → '21 oct 2026' (es-MX, fecha local).
export function formatShortDate(dateOrIso?: string | null): string {
  if (!dateOrIso) return "";
  const d = dateOrIso.length <= 10 ? new Date(`${dateOrIso}T12:00:00`) : new Date(dateOrIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// ISO → '21 de octubre de 2026, 8:30 a.m.' (meta de detalle).
export function formatFullDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fecha = d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const period = hh >= 12 ? "p.m." : "a.m.";
  const h12 = hh % 12 || 12;
  return `${fecha}, ${h12}:${mm} ${period}`;
}

// ---------------------------------------------------------------------
// relativeDayLabel
// ---------------------------------------------------------------------
// ISO → 'Hoy' | 'Ayer' | 'D de mes' (etiqueta de lista).
export function relativeDayLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOf(now) - startOf(d)) / 86_400_000;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
