// Layout del detalle de escuela
// Muestra nombre de escuela y botón volver

"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { School } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

interface SchoolDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function SchoolDetailLayout({
  children,
  params,
}: SchoolDetailLayoutProps) {
  const { id: schoolId } = use(params);
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    async function fetchSchool() {
      try {
        const res = await api.get<School>(`${ENDPOINTS.SCHOOLS}/${schoolId}`);
        setSchool(res);
      } catch {
        // Error silencioso
      }
    }
    fetchSchool();
  }, [schoolId]);

  return (
    <div className="space-y-6">
      {/* Header con botón volver y nombre de escuela */}
      <div className="flex items-center gap-4">
        <Link
          href="/schools"
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors text-text-secondary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {school?.name || "Cargando..."}
          </h1>
          {school?.cct && (
            <p className="text-sm text-text-secondary">CCT: {school.cct}</p>
          )}
        </div>
      </div>

      {/* Contenido de la página */}
      <div>{children}</div>
    </div>
  );
}
