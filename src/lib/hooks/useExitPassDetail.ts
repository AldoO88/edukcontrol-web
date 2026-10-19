// Detalle de Pase de Salida (GET /api/exit-passes/:id) — solo lectura
// (la app tampoco ofrece acciones en este detalle).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { ExitPassItem } from "@/lib/types";

type Body = ExitPassItem | { data: ExitPassItem };

function unwrap(body: Body): ExitPassItem {
  return body && "data" in body && body.data ? body.data : (body as ExitPassItem);
}

export function useExitPassDetail(id: string | undefined) {
  const [exitPass, setExitPass] = useState<ExitPassItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const body = await api.get<Body>(`${ENDPOINTS.EXIT_PASSES}/${id}`);
      setExitPass(unwrap(body));
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el pase de salida.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { exitPass, isLoading, error, refetch: fetchOne };
}
