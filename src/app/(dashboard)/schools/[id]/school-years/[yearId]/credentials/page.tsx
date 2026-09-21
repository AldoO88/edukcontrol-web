// Página de Credenciales Escolares (genera PDF)
// GET /api/students/credentials?school_year_id=...&ids=a,b,c
//   sin ids → genera credencial para TODOS los alumnos activos del ciclo
//   con ids → genera solo para esos alumnos (csv)
// El response es application/pdf (Content-Disposition: attachment).

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { IdCard, Download } from "lucide-react";

export default function CredentialsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await api.get<{ items: Student[] }>(
        `${ENDPOINTS.STUDENTS}?school_year_id=${yearId}`
      );
      setStudents(res.items || []);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.first_name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.controlNumber?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredStudents.map((s) => s._id)));
    }
  };

  const downloadPdf = async (withIds: boolean) => {
    setError(null);
    setIsDownloading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("edukcontrol_token")
          : null;
      const ids = withIds ? Array.from(selected).join(",") : "";
      const url = ENDPOINTS.CREDENTIALS_PDF(yearId, ids);
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
      const res = await fetch(`${apiBase}${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Error ${res.status}`);
      }

      const blob = await res.blob();
      const url2 = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url2;
      a.download = `credenciales-${yearId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  const selectedCount = selected.size;
  const totalActive = students.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credenciales"
        subtitle="Genera PDF con credenciales estilo tarjeta (1 por página)"
      />

      {/* Acciones */}
      <Card>
        <CardBody className="!p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm">
            <span className="font-semibold text-text-primary">
              {totalActive}
            </span>
            <span className="text-text-secondary"> alumnos activos en el ciclo</span>
            {selectedCount > 0 && (
              <span className="text-text-secondary">
                {" · "}
                <span className="text-accent-dark font-semibold">
                  {selectedCount}
                </span>{" "}
                seleccionado{selectedCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              disabled={filteredStudents.length === 0}
            >
              {selected.size === filteredStudents.length
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={() => downloadPdf(false)}
              isLoading={isDownloading}
            >
              <Download size={14} className="mr-1.5" />
              Todas las del ciclo
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={() => downloadPdf(true)}
              disabled={selectedCount === 0}
              isLoading={isDownloading}
            >
              <IdCard size={14} className="mr-1.5" />
              Solo seleccionados ({selectedCount})
            </Button>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      <Input
        placeholder="Buscar por nombre o número de control..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {students.length === 0 ? (
        <EmptyState
          icon={<IdCard size={48} />}
          title="No hay alumnos activos"
          description="Registra alumnos primero para poder generar sus credenciales."
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<IdCard size={48} />}
          title="Sin coincidencias"
          description="No hay alumnos que coincidan con la búsqueda."
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const isSelected = selected.has(s._id);
                return (
                  <div
                    key={s._id}
                    className={`p-4 flex items-center gap-4 transition-colors ${
                      isSelected ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input type="checkbox" className="w-4 h-4 accent-sky-600 shrink-0"
                      checked={isSelected}
                      onChange={() => toggleStudent(s._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        No. Control: {s.controlNumber}
                      </p>
                    </div>
                    <Badge variant="emerald">Activo</Badge>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
