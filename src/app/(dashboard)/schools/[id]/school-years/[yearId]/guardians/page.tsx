"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Guardian, Student } from "@/lib/types";
import {
  Users,
  Search,
  Plus,
  X,
  Phone,
  Edit2,
  Power,
  PowerOff,
  Trash2,
  UserPlus,
  ChevronDown,
  UserX,
  CheckCircle2,
} from "lucide-react";

interface GuardiansStats {
  total: number;
  ativos?: number;
  dados_de_baja?: number;
  con_hijos_en_ciclo?: number;
  sin_alumnos?: number;
  con_cuenta_activa?: number;
  alumnos_sin_tutor?: number;
}

interface PaginatedGuardians {
  items: Guardian[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const formatChildren = (g: Guardian) => {
  const list = (g.students || []).filter(
    (s): s is NonNullable<Guardian["students"]>[number] & object => typeof s === "object" && s !== null
  );
  if (list.length === 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
        Sin alumnos
      </span>
    );
  }
  return list.map((s) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s._id).join(", ");
};

const isUserActive = (g: Guardian): boolean => {
  if (!g.user_id) return false;
  if (typeof g.user_id === "string") return true;
  return g.user_id.isActive === true;
};

export default function GuardiansPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [list, setList] = useState<PaginatedGuardians>({
    items: [],
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });
  const [stats, setStats] = useState<GuardiansStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [noStudentsOnly, setNoStudentsOnly] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [toggleTarget, setToggleTarget] = useState<Guardian | null>(null);
  const [toggling, setToggling] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Guardian | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [unlinkTarget, setUnlinkTarget] = useState<{
    guardian: Guardian;
    studentId: string;
    studentName: string;
  } | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkingTarget, setLinkingTarget] = useState<Guardian | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [debouncedLinkSearch, setDebouncedLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<Student[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedToLink, setSelectedToLink] = useState<Set<string>>(new Set());
  const linkSearchRef = useRef<HTMLInputElement>(null);

  const basePath = `/schools/${schoolId}/school-years/${yearId}`;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("page", "1");
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (noStudentsOnly) params.set("no_students", "1");

      const [listRes, statsRes] = await Promise.all([
        api.get<PaginatedGuardians>(`${ENDPOINTS.GUARDIANS}?${params.toString()}`),
        api.get<GuardiansStats>(ENDPOINTS.GUARDIANS_STATS).catch(() => null),
      ]);
      setList(listRes);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error";
      setError(msg || "No se pudo cargar la lista de padres.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, noStudentsOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleSaveEdit = async (form: { name: string; lastname: string; phone: string; relationship: string }) => {
    if (!editing) return;
    setEditSaving(true);
    try {
      await api.put(`${ENDPOINTS.GUARDIANS}/${editing._id}`, form);
      setIsEditOpen(false);
      setEditing(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error al guardar";
      setError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await api.put(`${ENDPOINTS.GUARDIANS}/${toggleTarget._id}`, {
        isActive: !(toggleTarget.isActive !== false),
      });
      setToggleTarget(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error";
      setError(msg);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`${ENDPOINTS.GUARDIANS}/${deleteTarget._id}`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error al eliminar";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      await api.delete(
        ENDPOINTS.GUARDIAN_UNLINK_STUDENT(unlinkTarget.guardian._id, unlinkTarget.studentId)
      );
      setUnlinkTarget(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error al desvincular";
      setError(msg);
    } finally {
      setUnlinking(false);
    }
  };

  // Búsqueda de alumnos para vincular
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const t = setTimeout(() => setDebouncedLinkSearch(linkSearch), 250);
    return () => clearTimeout(t);
  }, [linkSearch]);

  useEffect(() => {
    if (!isLinkOpen) return;
    const run = async () => {
      setLinkSearching(true);
      try {
        const q = debouncedLinkSearch.trim();
        const url = q
          ? `${ENDPOINTS.STUDENTS}?search=${encodeURIComponent(q)}&limit=20`
          : `${ENDPOINTS.STUDENTS}?limit=20`;
        const res = await api.get<{ items: Student[]; total: number }>(url);
        setLinkResults(res.items || []);
      } catch {
        setLinkResults([]);
      } finally {
        setLinkSearching(false);
      }
    };
    run();
  }, [debouncedLinkSearch, isLinkOpen]);

  const handleLinkStudents = async () => {
    if (!linkingTarget || selectedToLink.size === 0) return;
    setLinking(true);
    try {
      await api.post(ENDPOINTS.GUARDIAN_STUDENTS(linkingTarget._id), {
        student_ids: Array.from(selectedToLink),
      });
      setIsLinkOpen(false);
      setLinkingTarget(null);
      setSelectedToLink(new Set());
      setLinkSearch("");
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error al vincular";
      setError(msg);
    } finally {
      setLinking(false);
    }
  };

  if (error && !list.items.length && isLoading) {
    return <ErrorState title="Error al cargar" message={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Padres de familia"
        subtitle={`Tutores registrados en la escuela. Los cambios aplican a todos los ciclos.`}
      >
        <Link
          href={`${basePath}`}
          className="text-sm text-text-secondary hover:text-accent-dark"
        >
          ← Volver al ciclo
        </Link>
      </PageHeader>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatTile
            label="Padres totales"
            value={stats.total ?? 0}
            icon={<Users size={18} />}
            color="text-teal-700"
            bg="bg-teal-100"
          />
          <StatTile
            label="Con hijos en este ciclo"
            value={stats.con_hijos_en_ciclo ?? 0}
            icon={<UserPlus size={18} />}
            color="text-emerald-700"
            bg="bg-emerald-100"
          />
          <StatTile
            label="Con cuenta activa"
            value={stats.con_cuenta_activa ?? 0}
            icon={<CheckCircle2 size={18} />}
            color="text-sky-700"
            bg="bg-sky-100"
          />
          <StatTile
            label="Sin alumnos"
            value={stats.sin_alumnos ?? 0}
            icon={<UserX size={18} />}
            color="text-amber-700"
            bg="bg-amber-100"
          />
          <StatTile
            label="Alumnos sin tutor"
            value={stats.alumnos_sin_tutor ?? 0}
            icon={<UserX size={18} />}
            color="text-rose-700"
            bg="bg-rose-100"
          />
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono…"
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                options={[
                  { value: "active", label: "Activos" },
                  { value: "inactive", label: "Dados de baja" },
                  { value: "all", label: "Todos" },
                ]}
                className="w-40"
              />
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={noStudentsOnly}
                  onChange={(e) => setNoStudentsOnly(e.target.checked)}
                  className="rounded"
                />
                Solo sin alumnos
              </label>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditing({
                  _id: "",
                  name: "",
                  lastname: "",
                  phone: "",
                  relationship: "tutor legal",
                  isActive: true,
                } as Guardian);
                setIsEditOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Nuevo padre
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      {isLoading ? (
        <LoadingState message="Cargando padres…" height="page" />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="Sin padres registrados"
          description={
            debouncedSearch || statusFilter !== "active" || noStudentsOnly
              ? "Ninguna coincidencia con los filtros actuales."
              : "Aún no hay tutores dados de alta."
          }
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Teléfono</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Parentesco</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Alumnos</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Cuenta</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-primary w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((g) => {
                    const isActive = g.isActive !== false;
                    const kids = (g.students || []).filter(
                      (s): s is NonNullable<Guardian["students"]>[number] & object =>
                        typeof s === "object" && s !== null
                    );
                    return (
                      <tr key={g._id} className="border-b border-border last:border-b-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {g.name} {g.lastname || ""}
                        </td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {g.phone}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{g.relationship}</td>
                        <td className="px-4 py-3 max-w-xs">
                          {kids.length === 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                              Sin alumnos
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {kids.map((s) => (
                                <span
                                  key={s._id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700"
                                >
                                  {`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s._id}
                                  {s.controlNumber && (
                                    <span className="text-[10px] text-sky-500">· {s.controlNumber}</span>
                                  )}
                                  <button
                                    onClick={() =>
                                      setUnlinkTarget({
                                        guardian: g,
                                        studentId: s._id,
                                        studentName:
                                          `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() ||
                                          s.controlNumber ||
                                          s._id,
                                      })
                                    }
                                    className="ml-0.5 hover:bg-sky-200 rounded-full p-0.5"
                                    aria-label="Desvincular"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {g.user_id ? (
                            isUserActive(g) ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                Activa
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Pendiente
                              </span>
                            )
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              Sin cuenta
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block">
                            <details className="group">
                              <summary className="cursor-pointer list-none p-2 hover:bg-slate-100 rounded-lg inline-flex">
                                <ChevronDown size={16} className="text-text-secondary" />
                              </summary>
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                  onClick={() => {
                                    setEditing(g);
                                    setIsEditOpen(true);
                                    document.body.click();
                                  }}
                                >
                                  <Edit2 size={14} /> Editar
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                  onClick={() => {
                                    setLinkingTarget(g);
                                    setIsLinkOpen(true);
                                    setSelectedToLink(new Set());
                                    document.body.click();
                                  }}
                                >
                                  <UserPlus size={14} /> Vincular alumnos
                                </button>
                                <button
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                                    isActive ? "text-amber-700" : "text-emerald-700"
                                  }`}
                                  onClick={() => {
                                    setToggleTarget(g);
                                    document.body.click();
                                  }}
                                >
                                  {isActive ? (
                                    <>
                                      <PowerOff size={14} /> Dar de baja
                                    </>
                                  ) : (
                                    <>
                                      <Power size={14} /> Reactivar
                                    </>
                                  )}
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                                  onClick={() => {
                                    setDeleteTarget(g);
                                    document.body.click();
                                  }}
                                >
                                  <Trash2 size={14} /> Eliminar registro
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border text-xs text-text-secondary">
              Mostrando {list.items.length} de {list.total}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal Editar / Nuevo */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditing(null);
        }}
        title={editing?._id ? "Editar padre" : "Nuevo padre"}
      >
        {editing && (
          <GuardianEditForm
            initial={editing}
            saving={editSaving}
            onCancel={() => {
              setIsEditOpen(false);
              setEditing(null);
            }}
            onSubmit={async (form) => {
              if (editing._id) {
                await handleSaveEdit(form);
              } else {
                try {
                  await api.post(ENDPOINTS.GUARDIANS, form);
                  setIsEditOpen(false);
                  setEditing(null);
                  await fetchData();
                } catch (err: unknown) {
                  const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Error";
                  setError(msg);
                }
              }
            }}
          />
        )}
      </Modal>

      {/* Modal Vincular alumnos */}
      <Modal
        isOpen={isLinkOpen}
        onClose={() => {
          setIsLinkOpen(false);
          setLinkingTarget(null);
          setSelectedToLink(new Set());
          setLinkSearch("");
        }}
        title={`Vincular alumnos a ${linkingTarget?.name ?? ""}`}
        size="lg"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              ref={linkSearchRef}
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Buscar alumno por nombre, CURP o No. control…"
              className="pl-9"
            />
          </div>
          <div className="max-h-80 overflow-y-auto border border-border rounded-xl">
            {linkSearching ? (
              <div className="p-4 text-sm text-text-secondary text-center">Buscando…</div>
            ) : linkResults.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary text-center">Sin coincidencias.</div>
            ) : (
              <ul>
                {linkResults.map((s) => {
                  const checked = selectedToLink.has(s._id);
                  return (
                    <li
                      key={s._id}
                      className="border-b border-border last:border-b-0 hover:bg-slate-50"
                    >
                      <label className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedToLink((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(s._id);
                              else next.delete(s._id);
                              return next;
                            });
                          }}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">
                            {s.first_name} {s.last_name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {s.controlNumber ? `No. ${s.controlNumber}` : ""}
                            {s.curp ? ` · ${s.curp}` : ""}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-text-secondary">
              {selectedToLink.size} seleccionado{selectedToLink.size === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsLinkOpen(false);
                  setLinkingTarget(null);
                  setSelectedToLink(new Set());
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={selectedToLink.size === 0 || linking}
                isLoading={linking}
                onClick={handleLinkStudents}
              >
                Vincular
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm Dar de baja / Reactivar */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive}
        title={toggleTarget?.isActive === false ? "Reactivar padre" : "Dar de baja al padre"}
        message={
          toggleTarget?.isActive === false
            ? `¿Reactivar a ${toggleTarget.name} ${toggleTarget.lastname || ""}? Su cuenta de usuario volverá a estar activa si existía.`
            : `¿Dar de baja a ${toggleTarget?.name} ${toggleTarget?.lastname || ""}? Se desvincularán automáticamente sus ${(toggleTarget?.students || []).length} alumno(s) y, si no le quedan otras tutorías activas, su cuenta de usuario también se desactivará (no podrá entrar al dashboard).`
        }
        confirmLabel={toggleTarget?.isActive === false ? "Reactivar" : "Dar de baja"}
        cancelLabel="Cancelar"
      />

      {/* Confirm Eliminar */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar registro de padre"
        message={`¿Eliminar el registro de ${deleteTarget?.name} ${deleteTarget?.lastname || ""}? Esta acción no se puede deshacer. La cuenta de usuario NO se elimina (deberás darla de baja en Personal si quieres bloquear el acceso).`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      {/* Confirm Desvincular hijo */}
      <ConfirmDialog
        isOpen={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={handleUnlink}
        title="Desvincular alumno"
        message={`¿Quitar a ${unlinkTarget?.studentName} del tutor ${unlinkTarget?.guardian.name} ${unlinkTarget?.guardian.lastname || ""}? El alumno quedará sin este tutor.`}
        confirmLabel="Desvincular"
        cancelLabel="Cancelar"
      />
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function StatTile({ label, value, icon, color, bg }: StatTileProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${bg}`}>
            <span className={color}>{icon}</span>
          </div>
          <div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

interface GuardianEditFormProps {
  initial: Guardian;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (form: { name: string; lastname: string; phone: string; relationship: string }) => void | Promise<void>;
}

function GuardianEditForm({ initial, saving, onCancel, onSubmit }: GuardianEditFormProps) {
  const [name, setName] = useState(initial.name || "");
  const [lastname, setLastname] = useState(initial.lastname || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [relationship, setRelationship] = useState(initial.relationship || "tutor legal");

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Nombre(s)</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Apellido(s)</label>
        <Input value={lastname} onChange={(e) => setLastname(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          <Phone size={12} className="inline mr-1" />
          Teléfono (10 dígitos)
        </label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Parentesco</label>
        <Input
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          list="guardian-rel-list"
        />
        <datalist id="guardian-rel-list">
          <option value="madre" />
          <option value="padre" />
          <option value="tutor legal" />
          <option value="abuelo" />
          <option value="abuela" />
          <option value="tío" />
          <option value="tía" />
        </datalist>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button
          variant="primary"
          isLoading={saving}
          disabled={!name || !/^\d{10}$/.test(phone)}
          onClick={() => onSubmit({ name, lastname, phone, relationship })}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}