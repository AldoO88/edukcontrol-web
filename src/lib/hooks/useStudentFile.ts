// Hook de la FICHA del alumno (4 fetchs en paralelo, igual que
// students/[studentId].jsx de la app):
//   1. GET /api/students/:id        → datos del alumno
//   2. GET /api/conduct-logs        → reportes de conducta (score)
//   3. GET /api/citations           → citatorios
//   4. GET /api/conduct-config      → baseline/weights del score
// expone refetch() para refrescar tras acciones (los modales de la
// ficha son de solo lectura, pero se mantiene por simetría).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type {
  CitationItem,
  ConductConfig,
  ConductLogItem,
  PaginatedItems,
  PrefectStudent,
} from "@/lib/types";

// GET /api/students/:id puede envolver el alumno en { data } (la app
// hace `body.data ? body.data : body` — toleramos ambos).
type StudentBody = PrefectStudent | { data: PrefectStudent };

export function useStudentFile(studentId: string | undefined) {
  const [student, setStudent] = useState<PrefectStudent | null>(null);
  const [conductLogs, setConductLogs] = useState<ConductLogItem[]>([]);
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [conductConfig, setConductConfig] = useState<ConductConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [studentBody, conductRes, citationsRes, configRes] = await Promise.all([
        api.get<StudentBody>(ENDPOINTS.STUDENT_BY_ID(studentId)),
        api.get<PaginatedItems<ConductLogItem>>(
          `${ENDPOINTS.CONDUCT_LOGS}?${new URLSearchParams({ student_id: studentId, limit: "50" })}`
        ),
        api.get<PaginatedItems<CitationItem>>(
          `${ENDPOINTS.CITATIONS}?${new URLSearchParams({ student: studentId, limit: "50" })}`
        ),
        api.get<ConductConfig>(ENDPOINTS.CONDUCT_CONFIG).catch(() => null),
      ]);

      const resolved =
        studentBody && "data" in studentBody ? studentBody.data : (studentBody as PrefectStudent);
      if (!resolved?._id) throw new Error("No se encontró el alumno.");

      setStudent(resolved);
      setConductLogs(conductRes?.items || []);
      setCitations(citationsRes?.items || []);
      setConductConfig(configRes);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar la ficha del alumno.");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  return { student, conductLogs, citations, conductConfig, isLoading, error, refetch: fetchFile };
}
