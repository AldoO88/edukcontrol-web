// Layout del detalle de ciclo escolar

"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

interface SchoolYearDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; yearId: string }>;
}

export default function SchoolYearDetailLayout({
  children,
  params,
}: SchoolYearDetailLayoutProps) {
  const { id: schoolId, yearId } = use(params);
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);

  useEffect(() => {
    async function fetchSchoolYear() {
      try {
        const res = await api.get<SchoolYear>(`${ENDPOINTS.SCHOOL_YEARS}/${yearId}`);
        setSchoolYear(res);
      } catch {
        // Error silencioso
      }
    }
    fetchSchoolYear();
  }, [yearId]);

  return (
    <div className="space-y-6">
      {/* Header con botón volver y nombre del ciclo */}
      <div className="flex items-center gap-4">
        <Link
          href={`/schools/${schoolId}`}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors text-text-secondary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Ciclo {schoolYear?.name || "Cargando..."}
          </h1>
          {schoolYear && (
            <p className="text-sm text-text-secondary">
              {schoolYear.startDate.slice(0, 10).split("-").reverse().join("/")} —{" "}
              {schoolYear.endDate.slice(0, 10).split("-").reverse().join("/")}
            </p>
          )}
        </div>
      </div>

      {/* Contenido de la página */}
      <div>{children}</div>
    </div>
  );
}
