// =====================================================================
// src/lib/asistenciaPct.ts
// ---------------------------------------------------------------------
// Puerto web de src/utils/asistenciaPct.js de la app móvil — MISMA
// regla, fuente única del indicador "% ASIST." en el área del prefecto.
//
// Problema que resuelve (UX reportado 2026-10-17): el card dividía
// `dayPresent / dayTotal` sin filtro de volumen. Con pocos registros el
// resultado es engañoso (sábado con 9 taps sobre 448 → "100%"; 07:10am
// antes del cron → "100%" parcial; día vacío → "0%" falso).
//
// REGLA: el % solo se publica si `dayTotal` alcanza el umbral
// MIN_PCT_DE_MATRICULA (50%) de `totalStudents`; si no → "—". El día
// lectivo procesado por el cron siempre supera el umbral de calle.
// =====================================================================

// Umbral: proporción mínima de la matrícula con registro del día para
// considerar "representativa" la tasa y publicar el %.
const MIN_PCT_DE_MATRICULA = 0.5;

interface AsistStats {
  dayPresent?: number;
  dayTotal?: number;
  totalStudents?: number;
}

// Recibe el objeto `stats` del dashboard y devuelve un string YA
// formateado para pintarlo directo ("87%" o "—").
export function formatAsistPct(stats: AsistStats | null | undefined): string {
  const dayPresent = stats?.dayPresent ?? 0;
  const dayTotal = stats?.dayTotal ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;

  // Sin registros del día (domingo, día no lectivo, paro, cron caído):
  // no hay tasa que calcular.
  if (dayTotal <= 0) return "—";

  // Regla principal: pocos registros vs matrícula → sin % (evita el
  // "100%" de 9 alumnos sobre 448). Defensivo: sin matrícula conocida
  // se aplica la tasa cruda, no regresar comportamiento a ciegas.
  if (totalStudents > 0 && dayTotal < totalStudents * MIN_PCT_DE_MATRICULA) {
    return "—";
  }

  return `${Math.round((dayPresent / dayTotal) * 100)}%`;
}
