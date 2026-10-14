// Página de Grupos (scoped por ciclo escolar)
// Muestra grupos regulares y talleres en secciones separadas.
// "Agregar grupos" jala plantillas del catálogo de la escuela (creadas
// en Configuración de Escuela → Grupos) que no existan aún en el ciclo:
// cubre el caso de "olvidé marcar un grupo al crear el ciclo".

"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Group, GroupTemplate } from "@/lib/types";
import {
  ClipboardList,
  Users,
  User,
  Wrench,
  Plus,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface GroupStudent {
  _id: string;
  student_id: {
    _id: string;
    controlNumber: string;
    first_name: string;
    last_name: string;
    photoUrl?: string;
  };
  cycle_status: string;
}

// Llave de dedupe: la misma del índice único del backend
// ({school, grade, section, school_year_id}). Se compara grade+section
// en mayúsculas para ignorar diferencias de formato.
const groupKey = (g: { grade: number; section: string }) =>
  `${g.grade}-${g.section.toUpperCase()}`;

export default function GroupsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // --- Estado del modal "Agregar grupos" (importar plantillas) ---
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [templates, setTemplates] = useState<GroupTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  // Flash de éxito tras importar: "N grupos agregados, M ya existían".
  const [importFlash, setImportFlash] = useState<string | null>(null);

  // Counter para forzar el refetch tras importar plantillas:
  // incrementar → el useEffect de abajo vuelve a correr.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await api.get<Group[]>(
          `${ENDPOINTS.GROUPS}?school_year_id=${yearId}&school=${schoolId}`
        );
        setGroups(res);
      } catch {
        setError("Error al cargar los grupos.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroups();
  }, [yearId, schoolId, refreshKey]);

  const { regulares, talleres } = useMemo(() => ({
    regulares: groups.filter((g) => g.type !== "taller"),
    talleres: groups.filter((g) => g.type === "taller"),
  }), [groups]);

  // --- Modal "Agregar grupos": carga el catálogo de la escuela y lo
  //     difiere contra los grupos ya presentes en el ciclo. ---
  const openImportModal = useCallback(async () => {
    setIsImportOpen(true);
    setTemplates([]);
    setTemplatesError(null);
    setSelectedTemplateIds(new Set());
    setImportError(null);
    setIsLoadingTemplates(true);
    try {
      const res = await api.get<{ items: GroupTemplate[] }>(
        `${ENDPOINTS.GROUP_TEMPLATES}?school=${schoolId}`
      );
      const all = res.items || [];
      setTemplates(all);
      // Preselecciona solo las faltantes (las que ya están en el ciclo
      // quedan deshabilitadas y no se pueden marcar).
      const existing = new Set(groups.map(groupKey));
      const missing = all.filter((t) => !existing.has(groupKey(t)));
      setSelectedTemplateIds(new Set(missing.map((t) => t._id)));
    } catch {
      setTemplatesError("No se pudieron cargar las plantillas de la escuela.");
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [schoolId, groups]);

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedTemplateIds.size === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await api.post<{ created: number; skipped: number }>(
        ENDPOINTS.GROUPS_IMPORT_TEMPLATES,
        {
          school_year_id: yearId,
          template_ids: [...selectedTemplateIds],
        }
      );
      const created = res?.created ?? 0;
      const skipped = res?.skipped ?? 0;
      setImportFlash(
        skipped > 0
          ? `${created} grupo${created !== 1 ? "s" : ""} agregado${created !== 1 ? "s" : ""} al ciclo · ${skipped} ya existía${skipped !== 1 ? "n" : ""} y se omitieron.`
          : `${created} grupo${created !== 1 ? "s" : ""} agregado${created !== 1 ? "s" : ""} al ciclo.`
      );
      setIsImportOpen(false);
      // Fuerza el refetch de grupos del ciclo.
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Error al importar los grupos.";
      setImportError(msg || "Error al importar los grupos.");
    } finally {
      setIsImporting(false);
    }
  };

  // Difusión catálogo vs ciclo: faltantes (seleccionables) y presentes
  // (deshabilitados con badge "Ya en el ciclo").
  const { missingTemplates, existingTemplates } = useMemo(() => {
    const existing = new Set(groups.map(groupKey));
    return {
      missingTemplates: templates.filter((t) => !existing.has(groupKey(t))),
      existingTemplates: templates.filter((t) => existing.has(groupKey(t))),
    };
  }, [templates, groups]);

  const missingRegulares = missingTemplates.filter((t) => t.type !== "taller");
  const missingTalleres = missingTemplates.filter((t) => t.type === "taller");

  const openStudentsModal = async (group: Group) => {
    setSelectedGroup(group);
    setStudents([]);
    setStudentsError(null);
    setIsLoadingStudents(true);

    try {
      const res = await api.get<{ items: GroupStudent[]; total: number }>(
        ENDPOINTS.GROUP_STUDENTS(group._id)
      );
      // Orden alfabético por apellido, luego nombre, con
      // `localeCompare("es")` para que las letras acentuadas (Á, É,
      // Ñ) y mayúsculas se ordenen como en español. El backend
      // responde por fecha de inscripción (createdAt desc), así que
      // reordenamos en cliente. La numeración posicional (idx+1) en
      // el render queda 1..N por grupo, tipo "lista de clase".
      const items = (res.items || []).slice().sort((a, b) => {
        const ln = (a.student_id?.last_name || "").localeCompare(
          b.student_id?.last_name || "",
          "es"
        );
        if (ln !== 0) return ln;
        return (a.student_id?.first_name || "").localeCompare(
          b.student_id?.first_name || "",
          "es"
        );
      });
      setStudents(items);
    } catch {
      setStudentsError("Error al cargar los alumnos del grupo.");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando grupos..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos"
        subtitle={`${groups.length} grupo${groups.length !== 1 ? "s" : ""} en el ciclo`}
        action={{
          label: "Agregar grupos",
          onClick: openImportModal,
          icon: <Plus size={16} />,
        }}
      />

      {/* Flash de éxito tras importar plantillas: "N agregados · M ya existían" */}
      {importFlash && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="flex-1">{importFlash}</span>
          <button
            onClick={() => setImportFlash(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No hay grupos configurados"
          description="Jala los grupos desde las plantillas de la escuela para comenzar a asignar alumnos."
          action={{
            label: "Agregar grupos",
            onClick: openImportModal,
          }}
        />
      ) : (
        <>
          {/* Grupos Regulares */}
          {regulares.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <ClipboardList size={18} className="text-violet-500" />
                Grupos Regulares
                <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                  {regulares.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regulares.map((group) => (
                  <Card key={group._id} className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-text-primary text-lg">
                            {group.grade}° {group.section}
                          </h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {group.shift === "matutino" ? "Matutino" : "Vespertino"}
                          </p>
                        </div>
                        <Badge variant="sky">Regular</Badge>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentsModal(group)}
                        >
                          <Users size={16} className="mr-1.5" />
                          Ver Alumnos
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Talleres */}
          {talleres.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Wrench size={18} className="text-amber-500" />
                Talleres
                <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                  {talleres.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {talleres.map((group) => (
                  <Card key={group._id} className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-text-primary text-lg">
                            {group.grade}° {group.section}
                          </h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {group.shift === "matutino" ? "Matutino" : "Vespertino"}
                          </p>
                        </div>
                        <Badge variant="amber">Taller</Badge>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentsModal(group)}
                        >
                          <Users size={16} className="mr-1.5" />
                          Ver Alumnos
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Alumnos */}
      <Modal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title={
          selectedGroup
            ? `${selectedGroup.grade}° ${selectedGroup.section} — Alumnos`
            : "Alumnos"
        }
      >
        {isLoadingStudents ? (
          <div className="flex justify-center py-8">
            <LoadingState message="Cargando alumnos..." height="compact" />
          </div>
        ) : studentsError ? (
          <div className="p-4 text-center text-error text-sm">{studentsError}</div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center">
            <User size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">
              No hay alumnos asignados a este grupo aún.
            </p>
            {selectedGroup?.type === "taller" ? (
              <p className="text-xs text-text-muted mt-1">
                Asigna alumnos desde la sección de Talleres en el ciclo escolar.
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1">
                Asigna alumnos desde la página de Inscripciones.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.map((s, idx) => (
              <div
                key={s._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="w-7 text-center text-xs font-semibold text-text-muted tabular-nums shrink-0">
                  {idx + 1}.
                </span>
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.student_id?.photoUrl ? (
                    <img
                      src={s.student_id.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-text-secondary">
                      {s.student_id?.first_name?.[0]}
                      {s.student_id?.last_name?.[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {s.student_id?.first_name} {s.student_id?.last_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {s.student_id?.controlNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal "Agregar grupos" — importa plantillas del catálogo de la
          escuela que aún no existen en este ciclo (dedupe grade+section). */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Agregar grupos al ciclo"
        size="lg"
      >
        {isLoadingTemplates ? (
          <div className="flex justify-center py-8">
            <LoadingState message="Cargando plantillas..." height="compact" />
          </div>
        ) : templatesError ? (
          <div className="p-4 text-center text-error text-sm">{templatesError}</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center">
            <ClipboardList size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">
              Esta escuela no tiene plantillas de grupo.
            </p>
            <Link
              href={`/schools/${schoolId}/groups`}
              className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline"
            >
              Ir a configuración de grupos
              <ExternalLink size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Sin faltantes: todo el catálogo ya está en el ciclo */}
            {missingTemplates.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
                <p className="text-sm text-text-secondary">
                  Todos los grupos de la escuela ya están en este ciclo.
                </p>
                <Link
                  href={`/schools/${schoolId}/groups`}
                  className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline"
                >
                  Crear nuevas plantillas
                  <ExternalLink size={14} />
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  Selecciona las plantillas de la escuela que quieras agregar a este
                  ciclo. Las que ya existen se muestran más abajo.
                </p>

                {/* Plantillas faltantes — Regulares */}
                {missingRegulares.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <ClipboardList size={15} className="text-violet-500" />
                      Regulares
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {missingRegulares.map((tpl) => (
                        <label
                          key={tpl._id}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors cursor-pointer ${
                            selectedTemplateIds.has(tpl._id)
                              ? "border-accent bg-accent/10"
                              : "border-border bg-white hover:bg-slate-50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedTemplateIds.has(tpl._id)}
                            onChange={() => toggleTemplate(tpl._id)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {tpl.grade}° {tpl.section}
                            </p>
                            <p className="text-xs text-text-muted">
                              {tpl.shift === "matutino" ? "Matutino" : "Vespertino"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plantillas faltantes — Talleres */}
                {missingTalleres.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Wrench size={15} className="text-amber-500" />
                      Talleres
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {missingTalleres.map((tpl) => (
                        <label
                          key={tpl._id}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors cursor-pointer ${
                            selectedTemplateIds.has(tpl._id)
                              ? "border-accent bg-accent/10"
                              : "border-border bg-white hover:bg-slate-50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedTemplateIds.has(tpl._id)}
                            onChange={() => toggleTemplate(tpl._id)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {tpl.grade}° {tpl.section}
                            </p>
                            <p className="text-xs text-text-muted">
                              {tpl.shift === "matutino" ? "Matutino" : "Vespertino"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Plantillas ya presentes en el ciclo: deshabilitadas */}
            {existingTemplates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-muted">Ya en el ciclo</h4>
                <div className="grid grid-cols-2 gap-2">
                  {existingTemplates.map((tpl) => (
                    <div
                      key={tpl._id}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-slate-50 opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {tpl.grade}° {tpl.section}
                          <span className="ml-2 text-xs font-normal text-text-muted">
                            {tpl.type === "taller" ? "Taller" : "Regular"} ·{" "}
                            {tpl.shift === "matutino" ? "Matutino" : "Vespertino"}
                          </span>
                        </p>
                      </div>
                      <Badge variant="emerald">Ya en el ciclo</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error del import (POST falló) */}
            {importError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                {importError}
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setIsImportOpen(false)}
                disabled={isImporting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || selectedTemplateIds.size === 0}
              >
                {isImporting
                  ? "Importando..."
                  : `Importar seleccionados (${selectedTemplateIds.size})`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
