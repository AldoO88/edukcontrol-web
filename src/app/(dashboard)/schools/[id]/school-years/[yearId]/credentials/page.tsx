// Página de Credenciales Escolares
// - Badge con el tipo de diseño activo (visual / HTML / por defecto).
// - Botón para subir un diseño HTML personalizado (modo avanzado).
// - Al generar, muestra una VISTA PREVIA del PDF en modal; la descarga
//   se dispara desde el modal con el blob ya generado (sin regenerar).
// GET /api/students/credentials?school_year_id=...&ids=a,b,c
//   sin ids → genera credencial para TODOS los alumnos activos del ciclo
//   con ids → genera solo para esos alumnos (csv)

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Group } from "@/lib/types";
import { IdCard, Download, Upload } from "lucide-react";
import {
  PdfPreviewModal,
  usePdfPreview,
} from "@/components/credential-designer/PdfPreviewModal";

// El PUT /credential-template envía el HTML como JSON y el body está
// limitado a 1 MB en el backend; dejamos margen de sobra.
const MAX_DESIGN_BYTES = 512 * 1024;

type DesignKind = "cr80" | "visual" | "html" | "default";

interface DesignInfo {
  html: string | null;
  layout: unknown | null;
  pdf: unknown | null;
}

export default function CredentialsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Grupo seleccionado en el filtro de pills. `null` = todavía
  // no se eligió ninguno (no se muestra nada hasta que el admin
  // elija). `"__none__"` = bucket explícito de alumnos sin grupo
  // (se muestra solo si hay alumnos en ese bucket).
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Diseño activo (visual del diseñador / HTML avanzado / por defecto)
  const [designKind, setDesignKind] = useState<DesignKind>("default");
  const [canUploadDesign, setCanUploadDesign] = useState(true);
  const [designNotice, setDesignNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    fileName: string;
    html: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = usePdfPreview();

  const fetchStudents = async () => {
    try {
      // Trae TODOS los alumnos inscritos en el ciclo (limit máx. 100 por
      // página → se pagina hasta agotar). status=active mantiene la lista
      // idéntica al criterio de impresión del backend.
      const all: Student[] = [];
      let page = 1;
      let pages = 1;
      do {
        const res = await api.get<{
          items: Student[];
          total: number;
          pages: number;
        }>(
          `${ENDPOINTS.STUDENTS}?school_year_id=${yearId}&status=active&limit=100&page=${page}`
        );
        all.push(...(res.items || []));
        pages = res.pages || 1;
        page += 1;
      } while (page <= pages && all.length < 5000);
      setStudents(all);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDesignInfo = async () => {
    try {
      const res = await api.get<DesignInfo>(
        ENDPOINTS.CREDENTIAL_TEMPLATE(schoolId)
      );
      setDesignKind(
        res.pdf
          ? "cr80"
          : res.layout
            ? "visual"
            : res.html?.trim()
              ? "html"
              : "default"
      );
      setCanUploadDesign(true);
    } catch (err) {
      // 403 (rol sin permiso) → ocultar el botón de subir; otros errores
      // (red) no deben esconderlo.
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permisos")) setCanUploadDesign(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchStudents();
      await fetchDesignInfo();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, yearId]);

  // Normaliza una cadena para comparar búsquedas: minúsculas y sin
  // caracteres no alfanuméricos. Usado para que el usuario pueda
  // buscar un grupo con "1a" y matchee contra el label "1° A".
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Resuelve el grupo regular del alumno y el label legible. Devuelve
  // null si el alumno no tiene grupo, si `current_group_id` es solo un
  // id (no se populó) o si apunta a un grupo de OTRO ciclo (caso
  // documentado por `migrate-enroll-active-students.js`).
  const resolveGroup = (s: Student): Group | null => {
    const cg = s.current_group_id;
    if (!cg || typeof cg !== "object") return null;
    const g = cg as Group;
    if (
      g.school_year_id &&
      typeof g.school_year_id === "string" &&
      g.school_year_id !== yearId
    ) {
      return null;
    }
    return g;
  };

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    const qNorm = normalize(search);
    return students.filter((s) => {
      if (
        s.first_name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.controlNumber?.toLowerCase().includes(q)
      ) {
        return true;
      }
      // Match por label de grupo: "1° A" debe matchear con búsqueda
      // "1a", "1A", "1°a", etc. (sin acentos/espacios/°).
      const g = resolveGroup(s);
      if (!g) return false;
      const label = `${g.grade}°${g.section}`;
      return normalize(label).includes(qNorm);
    });
  }, [students, search, yearId]);

  // Agrupa los alumnos filtrados por su grupo regular. Orden:
  // grupos por grade asc → section localeCompare "es"; "Sin grupo"
  // al final. Dentro de cada grupo, alfabético apellido → nombre.
  const groupedStudents = useMemo(() => {
    const buckets = new Map<
      string,
      { key: string; label: string; sortKey: [number, string]; items: Student[] }
    >();
    for (const s of filteredStudents) {
      const g = resolveGroup(s);
      let key: string;
      let label: string;
      let sortKey: [number, string];
      if (g) {
        key = g._id;
        label = `${g.grade}°${g.section}`;
        sortKey = [g.grade, g.section];
      } else {
        key = "__none__";
        label = "Sin grupo";
        // "Sin grupo" va al final → grade máximo + sección "z".
        sortKey = [Number.MAX_SAFE_INTEGER, "z"];
      }
      if (!buckets.has(key)) buckets.set(key, { key, label, sortKey, items: [] });
      buckets.get(key)!.items.push(s);
    }
    const groups = Array.from(buckets.values()).sort((a, b) => {
      if (a.sortKey[0] !== b.sortKey[0]) return a.sortKey[0] - b.sortKey[0];
      return a.sortKey[1].localeCompare(b.sortKey[1], "es");
    });
    for (const g of groups) {
      g.items.sort((a, b) => {
        const ln = (a.last_name || "").localeCompare(b.last_name || "", "es");
        if (ln !== 0) return ln;
        return (a.first_name || "").localeCompare(b.first_name || "", "es");
      });
    }
    return groups;
  }, [filteredStudents, yearId]);

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

  // Selecciona / deselecciona todos los alumnos de un grupo.
  // Si todos están seleccionados, los quita; en cualquier otro
  // caso (ninguno o parcial), agrega todos.
  const toggleGroup = (ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      if (allIn) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // ── Subir diseño HTML ──────────────────────────────────────────────
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-seleccionar el mismo archivo
    if (!file) return;

    setDesignNotice(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith(".html") && !name.endsWith(".htm")) {
      setDesignNotice({
        type: "error",
        text: "El archivo debe ser .html o .htm.",
      });
      return;
    }
    if (file.size > MAX_DESIGN_BYTES) {
      setDesignNotice({
        type: "error",
        text: "El archivo supera el máximo de 512 KB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || "");
      if (!html.trim()) {
        setDesignNotice({ type: "error", text: "El archivo está vacío." });
        return;
      }
      setPendingUpload({ fileName: file.name, html });
    };
    reader.onerror = () => {
      setDesignNotice({ type: "error", text: "No se pudo leer el archivo." });
    };
    reader.readAsText(file);
  };

  const confirmUpload = async () => {
    if (!pendingUpload) return;
    setIsUploading(true);
    setDesignNotice(null);
    try {
      await api.put(ENDPOINTS.CREDENTIAL_TEMPLATE(schoolId), {
        html: pendingUpload.html,
      });
      setDesignNotice({
        type: "success",
        text: `Diseño "${pendingUpload.fileName}" guardado. Se usará en la generación de credenciales.`,
      });
      setPendingUpload(null);
      await fetchDesignInfo();
    } catch (err) {
      setDesignNotice({
        type: "error",
        text:
          err instanceof Error ? err.message : "Error al guardar el diseño.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Generar vista previa del PDF ──────────────────────────────────
  const generatePreview = (withIds: boolean) =>
    preview.generate({
      yearId,
      schoolId,
      ids: withIds ? Array.from(selected).join(",") : undefined,
    });

  // Grupos disponibles para los pills — derivado del set completo
  // (sin búsqueda) para que los counts no bailen al tipear en el
  // input de búsqueda. Mismo formato {key, label} que
  // groupedStudents para reutilizar la key.
  const availableGroups = useMemo(() => {
    const buckets = new Map<
      string,
      { key: string; label: string; sortKey: [number, string]; count: number }
    >();
    for (const s of students) {
      const g = resolveGroup(s);
      let key: string;
      let label: string;
      let sortKey: [number, string];
      if (g) {
        key = g._id;
        label = `${g.grade}°${g.section}`;
        sortKey = [g.grade, g.section];
      } else {
        key = "__none__";
        label = "Sin grupo";
        sortKey = [Number.MAX_SAFE_INTEGER, "z"];
      }
      if (!buckets.has(key)) buckets.set(key, { key, label, sortKey, count: 0 });
      buckets.get(key)!.count += 1;
    }
    return Array.from(buckets.values()).sort((a, b) => {
      if (a.sortKey[0] !== b.sortKey[0]) return a.sortKey[0] - b.sortKey[0];
      return a.sortKey[1].localeCompare(b.sortKey[1], "es");
    });
  }, [students, yearId]);

  // Grupos que efectivamente se muestran en la lista. Si todavía
  // no hay grupo seleccionado, está vacío (la UI muestra un
  // empty state que pide elegir uno).
  const displayedGroups = useMemo(() => {
    if (selectedGroupKey === null) return [];
    return groupedStudents.filter((g) => g.key === selectedGroupKey);
  }, [groupedStudents, selectedGroupKey]);

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
          <div className="text-sm flex items-center gap-2 flex-wrap">
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
            <Badge
              variant={
                designKind === "cr80"
                  ? "emerald"
                  : designKind === "visual"
                    ? "sky"
                    : designKind === "html"
                      ? "amber"
                      : "slate"
              }
            >
              {designKind === "cr80"
                ? "Diseño CR80"
                : designKind === "visual"
                  ? "Diseño visual"
                  : designKind === "html"
                    ? "Diseño HTML"
                    : "Diseño por defecto"}
            </Badge>
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
            {canUploadDesign && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} className="mr-1.5" />
                Subir diseño (HTML)
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              variant="sky"
              size="sm"
              onClick={() => generatePreview(false)}
              isLoading={preview.isLoading}
            >
              <Download size={14} className="mr-1.5" />
              Todas las del ciclo
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={() => generatePreview(true)}
              disabled={selectedCount === 0}
              isLoading={preview.isLoading}
            >
              <IdCard size={14} className="mr-1.5" />
              Solo seleccionados ({selectedCount})
            </Button>
          </div>
        </CardBody>
      </Card>

      {designNotice && (
        <div
          className={`p-3 rounded-xl text-sm ${
            designNotice.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {designNotice.text}
        </div>
      )}

      {preview.error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {preview.error}
        </div>
      )}

      <Input
        placeholder={
          selectedGroupKey === null
            ? "Selecciona un grupo para habilitar la búsqueda..."
            : "Buscar por nombre o número de control..."
        }
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={selectedGroupKey === null}
      />

      {/* Selector de grupo: pills horizontales. Sin selección por
          default → no se muestra ningún alumno (empty state). */}
      {students.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Grupo
          </p>
          <div className="flex flex-wrap gap-2">
            {availableGroups.map((g) => {
              const isActive = selectedGroupKey === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setSelectedGroupKey(g.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-white text-text-secondary border-border hover:border-accent hover:text-accent-dark"
                  }`}
                >
                  <span>{g.label}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-text-secondary"
                    }`}
                  >
                    {g.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          icon={<IdCard size={48} />}
          title="No hay alumnos activos"
          description="Registra alumnos primero para poder generar sus credenciales."
        />
      ) : selectedGroupKey === null ? (
        <EmptyState
          icon={<IdCard size={48} />}
          title="Selecciona un grupo"
          description="Elige un grupo arriba para ver a sus alumnos y generar sus credenciales."
        />
      ) : displayedGroups.length === 0 || filteredStudents.length === 0 ? (
        <EmptyState
          icon={<IdCard size={48} />}
          title="Sin coincidencias"
          description="No hay alumnos que coincidan con la búsqueda en este grupo."
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <div className="divide-y divide-slate-100">
              {displayedGroups.map((g, groupIdx) => {
                const groupIds = g.items.map((s) => s._id);
                const selectedInGroup = groupIds.filter((id) => selected.has(id)).length;
                const allSelected = selectedInGroup === groupIds.length;
                const someSelected = selectedInGroup > 0 && !allSelected;
                return (
                  <div key={g.key} className={groupIdx === 0 ? "" : ""}>
                    {/* Encabezado de grupo: checkbox con estado
                        indeterminate + label + conteo. */}
                    <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-sky-600 shrink-0"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={() => toggleGroup(groupIds)}
                        aria-label={`Seleccionar todos los alumnos de ${g.label}`}
                      />
                      <span className="text-sm font-semibold text-text-primary">
                        {g.label}
                      </span>
                      <Badge variant="slate">
                        {g.items.length} alumno{g.items.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {g.items.map((s) => {
                        const isSelected = selected.has(s._id);
                        return (
                          <div
                            key={s._id}
                            className={`pl-10 pr-4 py-4 flex items-center gap-4 transition-colors ${
                              isSelected ? "bg-sky-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-sky-600 shrink-0"
                              checked={isSelected}
                              onChange={() => toggleStudent(s._id)}
                            />
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                              {s.photoUrl ? (
                                <img
                                  src={s.photoUrl}
                                  alt={`${s.first_name} ${s.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                                />
                              ) : (
                                <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border border-border shrink-0">
                                  <span className="text-xs font-semibold text-accent-dark">
                                    {s.first_name?.[0]}
                                    {s.last_name?.[0]}
                                  </span>
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary truncate">
                                  {s.first_name} {s.last_name}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  No. Control: {s.controlNumber}
                                </p>
                              </div>
                            </div>
                            <Badge variant="emerald">Activo</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Confirmación de subida de diseño */}
      <Modal
        isOpen={!!pendingUpload}
        onClose={() => setPendingUpload(null)}
        title="Confirmar diseño de credencial"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Archivo:{" "}
            <span className="font-semibold text-text-primary">
              {pendingUpload?.fileName}
            </span>
            . Es el modo avanzado HTML: se usará solo si NO hay un diseño
            CR80 ni uno visual definidos en Configuración de Credenciales (si
            los hay, tienen prioridad). Las variables Handlebars (
            {"{{student.first_name}}"},{" "}
            {"{{student.controlNumber}}"}, etc.) se reemplazan con los datos de
            cada alumno al generar el PDF.
          </p>
          <div className="border border-border rounded-xl overflow-hidden bg-white">
            <iframe
              srcDoc={
                pendingUpload?.html ||
                "<p style='padding:20px;color:#999;'>Sin contenido.</p>"
              }
              sandbox=""
              className="w-full h-[420px]"
              title="Preview del diseño"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPendingUpload(null)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={confirmUpload}
              isLoading={isUploading}
            >
              Guardar diseño
            </Button>
          </div>
        </div>
      </Modal>

      {/* Vista previa del PDF */}
      <PdfPreviewModal
        url={preview.url}
        isLoading={preview.isLoading}
        onClose={preview.close}
        onDownload={() => preview.download(`credenciales-${yearId}.pdf`)}
        filename={`credenciales-${yearId}.pdf`}
      />
    </div>
  );
}
