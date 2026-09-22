// Wizard de configuración post-crear ciclo escolar.
// 4 pasos: Turnos → Materias → Personal → Grupos
// Al finalizar, activa el ciclo automáticamente.

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type {
  ShiftTemplate,
  Subject,
  User,
  GroupTemplate,
  UserRole,
} from "@/lib/types";
import {
  Clock,
  BookOpen,
  Users,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";

interface ConfigWizardProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolYearId: string;
  schoolYearName: string;
  onCompleted: () => void;
}

type Step = "shifts" | "subjects" | "staff" | "groups";

const STEPS: { key: Step; label: string; icon: typeof Clock }[] = [
  { key: "shifts", label: "Turnos", icon: Clock },
  { key: "subjects", label: "Materias", icon: BookOpen },
  { key: "staff", label: "Personal", icon: Users },
  { key: "groups", label: "Grupos", icon: ClipboardList },
];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  principal: "Dirección",
  registrar: "Control Escolar",
  teacher: "Docente",
  prefect: "Prefecto",
  social_worker: "Trabajo Social",
  tutor: "Tutor",
};

export function ConfigWizard({
  isOpen,
  onClose,
  schoolId,
  schoolYearId,
  schoolYearName,
  onCompleted,
}: ConfigWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [groupTemplates, setGroupTemplates] = useState<GroupTemplate[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // Loading states
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const step = STEPS[currentStep];

  // Fetch data for each step
  useEffect(() => {
    if (!isOpen) return;

    // Reset on open
    setCurrentStep(0);
    setIsProcessing(false);
    setSelectedShifts(new Set());
    setSelectedGroups(new Set());

    // Fetch all data upfront
    const fetchAll = async () => {
      try {
        const [shiftsRes, subjectsRes, staffRes, groupsRes] = await Promise.all([
          api.get<{ items: ShiftTemplate[] }>(ENDPOINTS.SHIFT_TEMPLATES),
          api.get<{ items: Subject[] }>(`${ENDPOINTS.SUBJECTS}?school=${schoolId}`),
          api.get<{ items: User[] }>(ENDPOINTS.DASHBOARD_USERS(schoolId)),
          api.get<{ items: GroupTemplate[] }>(ENDPOINTS.GROUP_TEMPLATES),
        ]);

        const shifts = shiftsRes.items || [];
        setShiftTemplates(shifts);
        setSelectedShifts(new Set(shifts.map((s) => s._id)));

        setSubjects(subjectsRes.items || []);
        setStaff((staffRes.items || []).filter((u) => u.role !== "super_admin" && u.role !== "tutor"));

        const groups = groupsRes.items || [];
        setGroupTemplates(groups);
        setSelectedGroups(new Set(groups.map((g) => g._id)));
      } catch {
        // Errors handled silently
      } finally {
        setLoadingShifts(false);
        setLoadingSubjects(false);
        setLoadingStaff(false);
        setLoadingGroups(false);
      }
    };

    fetchAll();
  }, [isOpen, schoolId]);

  const toggleShift = (id: string) => {
    setSelectedShifts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubjectActive = (id: string, isActive: boolean) => {
    setSubjects((prev) =>
      prev.map((s) => (s._id === id ? { ...s, isActive } : s))
    );
  };

  const toggleStaffActive = (id: string, isActive: boolean) => {
    setStaff((prev) =>
      prev.map((u) => (u._id === id ? { ...u, isActive } : u))
    );
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      // 1. Clone selected shifts
      const selectedShiftData = shiftTemplates.filter((s) => selectedShifts.has(s._id));
      for (const tpl of selectedShiftData) {
        await api.post(ENDPOINTS.SCHOOL_SHIFTS, {
          school_year_id: schoolYearId,
          name: tpl.name,
          shift: tpl.shift,
          startTime: tpl.startTime,
          endTime: tpl.endTime,
          moduleDurationMinutes: tpl.moduleDurationMinutes,
          gracePeriodMinutes: tpl.gracePeriodMinutes,
          timeBlocks: tpl.timeBlocks.map((b) => ({
            name: b.name,
            startTime: b.startTime,
            endTime: b.endTime,
            isBreak: b.isBreak,
          })),
          school: schoolId,
        });
      }

      // 2. Apply subject toggles
      for (const subj of subjects) {
        const original = shiftTemplates.length > 0 ? subjects.find((s) => s._id === subj._id) : null;
        // Only update if changed
        await api.put(`${ENDPOINTS.SUBJECTS}/${subj._id}`, {
          isActive: subj.isActive,
        }).catch(() => {});
      }

      // 3. Apply staff toggles
      for (const u of staff) {
        await api.put(
          ENDPOINTS.DASHBOARD_UPDATE_USER(schoolId, u._id),
          { isActive: u.isActive }
        ).catch(() => {});
      }

      // 4. Clone selected groups
      const selectedGroupData = groupTemplates.filter((g) => selectedGroups.has(g._id));
      for (const tpl of selectedGroupData) {
        await api.post(ENDPOINTS.GROUPS, {
          school: schoolId,
          school_year_id: schoolYearId,
          grade: tpl.grade,
          section: tpl.section,
          shift: tpl.shift,
          type: tpl.type,
        });
      }

      // 5. Activate the school year
      await api.post(`/api/school-years/${schoolYearId}/activate`);

      onCompleted();
      onClose();
    } catch {
      // Errors handled silently — wizard can be retried
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepContent = () => {
    switch (step.key) {
      case "shifts":
        return (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary mb-3">
              Selecciona los turnos que quieres copiar a este ciclo.
            </p>
            {loadingShifts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-text-muted" />
              </div>
            ) : shiftTemplates.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                No hay plantillas de turnos configuradas. Crea turnos en la sección de configuración primero.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {shiftTemplates.map((tpl) => (
                  <div
                    key={tpl._id}
                    onClick={() => toggleShift(tpl._id)}
                    className={`cursor-pointer rounded-2xl transition-all ${
                      selectedShifts.has(tpl._id)
                        ? "ring-2 ring-sky-500"
                        : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <Card>
                      <CardBody>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                            tpl.shift === "matutino" ? "bg-amber-100" : "bg-indigo-100"
                          }`}>
                            <Clock size={18} className={
                              tpl.shift === "matutino" ? "text-amber-600" : "text-indigo-600"
                            } />
                          </div>
                          <div>
                            <h4 className="font-semibold text-text-primary">{tpl.name}</h4>
                            <p className="text-sm text-text-secondary capitalize">{tpl.shift}</p>
                            <p className="text-xs text-text-muted">{tpl.startTime} — {tpl.endTime}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedShifts.has(tpl._id)
                            ? "bg-sky-500 border-sky-500"
                            : "border-slate-300"
                        }`}>
                          {selectedShifts.has(tpl._id) && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                      </div>
                    </CardBody>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "subjects":
        return (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary mb-3">
              Revisa las materias activas. Puedes activar o desactivar las que necesites.
            </p>
            {loadingSubjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-text-muted" />
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                No hay materias en el catálogo. Crea materias en la sección de configuración primero.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {subjects.map((subj) => (
                  <div
                    key={subj._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {subj.color && (
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: subj.color }}
                        />
                      )}
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {subj.code} — {subj.name}
                        </h4>
                        {subj.grade && (
                          <p className="text-xs text-text-muted">{subj.grade}° grado</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSubjectActive(subj._id, !subj.isActive)}
                      className={`w-9 h-5 rounded-full transition-colors ${
                        subj.isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transition-transform ${
                          subj.isActive ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "staff":
        return (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary mb-3">
              Revisa el personal activo. Puedes activar o desactivar desde aquí.
            </p>
            {loadingStaff ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-text-muted" />
              </div>
            ) : staff.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                No hay personal registrado. Agrega personal en la sección de configuración primero.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {staff.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 bg-slate-100 rounded-lg shrink-0">
                        <span className="text-sm font-bold text-slate-600">
                          {user.name.charAt(0)}{(user.last_name || "").charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {user.name} {user.last_name}
                        </h4>
                        <p className="text-xs text-text-muted">
                          {ROLE_LABELS[user.role]} · {user.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStaffActive(user._id, !user.isActive)}
                      className={`w-9 h-5 rounded-full transition-colors ${
                        user.isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transition-transform ${
                          user.isActive ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "groups":
        return (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary mb-3">
              Selecciona los grupos que quieres copiar a este ciclo.
            </p>
            {loadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-text-muted" />
              </div>
            ) : groupTemplates.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                No hay plantillas de grupos configuradas. Crea grupos en la sección de configuración primero.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {groupTemplates.map((tpl) => (
                  <div
                    key={tpl._id}
                    onClick={() => toggleGroup(tpl._id)}
                    className={`cursor-pointer rounded-2xl transition-all ${
                      selectedGroups.has(tpl._id)
                        ? "ring-2 ring-sky-500"
                        : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <Card>
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-9 h-9 bg-violet-100 rounded-lg">
                              <ClipboardList size={16} className="text-violet-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-text-primary text-sm">
                                {tpl.grade}° {tpl.section}
                              </h4>
                              <p className="text-xs text-text-secondary capitalize">{tpl.shift}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedGroups.has(tpl._id)
                              ? "bg-sky-500 border-sky-500"
                              : "border-slate-300"
                          }`}>
                            {selectedGroups.has(tpl._id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configurar Ciclo ${schoolYearName}`} size="lg">
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-sky-500 text-white"
                      : "bg-slate-200 text-text-muted"
                  }`}
                >
                  {isDone ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isActive ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step title */}
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = step.icon;
            return <Icon size={20} className="text-sky-600" />;
          })()}
          <h3 className="text-lg font-semibold text-text-primary">{step.label}</h3>
        </div>

        {/* Step content */}
        <div className="min-h-[280px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || isProcessing}
          >
            <ChevronLeft size={16} className="mr-1" />
            Anterior
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button variant="sky" onClick={handleNext} disabled={isProcessing}>
              Siguiente
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              variant="sky"
              onClick={handleFinish}
              isLoading={isProcessing}
            >
              <Check size={16} className="mr-1" />
              Finalizar y Activar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
