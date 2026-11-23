// Hook de la lista de Maestros del trabajador social (Fase C).
// Puerto de usePrefectTeachers con el endpoint del rol:
// GET /api/social-worker/teachers — fetch único con nombre/teléfono/
// horas semanales; la búsqueda por nombre es client-side (igual que
// en la lista del prefecto y en teachers.jsx de la app).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherListItem } from "@/lib/types";

interface TeachersResponse {
  teachers: TeacherListItem[];
}

export function useSocialWorkerTeachers() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<TeachersResponse>(ENDPOINTS.SOCIAL_WORKER_TEACHERS);
      setTeachers(res?.teachers || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los maestros.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return { teachers, isLoading, error, refetch: fetchTeachers };
}
