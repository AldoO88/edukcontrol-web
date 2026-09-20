// Hook personalizado para paginación
// Sincroniza el estado de paginación con URL search params

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface UsePaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  offset: number;
  totalPages: (total: number) => number;
}

export function usePagination({
  defaultPage = 1,
  defaultLimit = 20,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page")) || defaultPage;
  const limit = Number(searchParams.get("limit")) || defaultLimit;

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const setLimit = useCallback(
    (newLimit: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", String(newLimit));
      params.set("page", "1"); // Reset a página 1
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return {
    page,
    limit,
    setPage,
    setLimit,
    offset: (page - 1) * limit,
    totalPages: (total: number) => Math.ceil(total / limit),
  };
}
