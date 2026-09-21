// Página de Importación Masiva de Inscripciones desde Excel/CSV
// Sube un archivo .xlsx/.xls/.csv con columnas controlNumber + group
// (name opcional). El backend parsea, valida, crea y reporta por fila.

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CheckCircle2, XCircle, Upload, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";

interface ImportResult {
  index: number;
  status: "ok" | "error";
  controlNumber?: string;
  group?: string;
  _id?: string;
  errors?: string[];
}

export default function ImportEnrollmentsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [schoolGroups, setSchoolGroups] = useState<{ grade: number; section: string }[]>(
    []
  );
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await api.get<{ items: { grade: number; section: string }[] }>(
          `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearId}`
        );
        setSchoolGroups(res.items || []);
      } catch {
        // silencioso
      } finally {
        setGroupsLoading(false);
      }
    }
    loadGroups();
  }, [schoolId, yearId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const validExts = [".xlsx", ".xls", ".csv", ".xlsm"];
    if (!validExts.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setError("Tipo de archivo no soportado. Use .xlsx, .xls, .csv o .xlsm.");
      return;
    }
    setFile(f);
    setError(null);
    setResults([]);
    setSummary(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    setSummary(null);
    if (!file) {
      setError("Selecciona un archivo primero.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("school_year_id", yearId);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"}${
          ENDPOINTS.ENROLLMENTS_IMPORT
        }`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("edukcontrol_token") || ""}`,
          },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Error al procesar el archivo");
      }

      setSummary({
        total: data.total,
        succeeded: data.succeeded,
        failed: data.failed,
      });
      setResults(data.results || []);
      // refrescar lista de inscripciones si hubo éxito
      if (data.succeeded > 0) {
        // refetch handled by caller navigating back
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al importar el archivo"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/schools/${schoolId}/school-years/${yearId}/enrollments`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent-dark transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a Matrícula
      </Link>

      <PageHeader
        title="Importar Inscripciones"
        subtitle="Carga masiva desde Excel / CSV"
      />

      {/* Instrucciones */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Formato esperado
          </h3>
          <p className="text-sm text-text-secondary mb-2">
            El archivo debe tener al menos estas columnas (case-insensitive,
            cualquier orden):
          </p>
          <ul className="text-sm text-text-secondary list-disc list-inside space-y-0.5">
            <li>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">controlNumber</code>{" "}
              — número de control del alumno (debe existir en la escuela)
            </li>
            <li>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">group</code> — etiqueta
              del grupo (ej. <code>1A</code>, <code>2B</code>, etc.)
            </li>
            <li>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">name</code> (opcional)
              — solo se ignora, no se valida
            </li>
          </ul>
          {groupsLoading ? (
            <p className="text-xs text-text-muted mt-3">
              Cargando grupos disponibles…
            </p>
          ) : schoolGroups.length > 0 ? (
            <p className="text-xs text-text-muted mt-3">
              Grupos disponibles en este ciclo:{" "}
              {schoolGroups
                .map((g) => `${g.grade}°${g.section}`)
                .join(", ")}
            </p>
          ) : (
            <p className="text-xs text-amber-700 mt-3">
              ⚠ No hay grupos configurados en este ciclo. Crea grupos
              primero.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Form de carga */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-error-light text-error text-sm">
                {error}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.xlsm"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-border rounded-2xl flex flex-col items-center gap-2 hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <Upload size={32} className="text-text-muted" />
              {file ? (
                <div className="text-center">
                  <p className="font-semibold text-text-primary">{file.name}</p>
                  <p className="text-xs text-text-secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-semibold text-text-primary">
                    Haz click para seleccionar
                  </p>
                  <p className="text-xs text-text-secondary">
                    .xlsx, .xls, .csv, .xlsm (max 10MB)
                  </p>
                </div>
              )}
            </button>

            <Button
              type="submit"
              variant="sky"
              disabled={!file || submitting}
              isLoading={submitting}
              className="w-full"
            >
              <Upload size={16} className="mr-1.5" />
              Importar
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Resumen */}
      {summary && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Resumen
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {summary.total}
                </p>
                <p className="text-xs text-text-secondary">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {summary.succeeded}
                </p>
                <p className="text-xs text-text-secondary">Importados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-600">
                  {summary.failed}
                </p>
                <p className="text-xs text-text-secondary">Errores</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Resultados por fila */}
      {results.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Detalle por fila ({results.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((r) => (
                <div
                  key={r.index}
                  className={`p-2 rounded-lg flex items-start gap-2 text-xs ${
                    r.status === "ok"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  {r.status === "ok" ? (
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      Fila #{r.index + 1}
                      {r.controlNumber && ` · ${r.controlNumber}`}
                      {r.group && ` → ${r.group}`}
                      {r.status === "ok" ? " ✓" : " ✗"}
                    </p>
                    {r.errors && r.errors.length > 0 && (
                      <ul className="list-disc list-inside">
                        {r.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
