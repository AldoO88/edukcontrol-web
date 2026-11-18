// Hook de la FICHA de expediente del alumno (área /social-worker/*).
// Fuente única de datos + mutaciones de la página:
//   1. GET  /api/students/:id                       → alumno + health_inclusion
//   2. GET  /api/social-worker/students/:id/agreements   → acuerdos
//   3. GET  /api/social-worker/students/:id/referrals    → canalizaciones
// Guardados:
//   - saveHealth(payload)  → PATCH /api/students/:id/health
//     (solo los campos de la sección; el backend bumpa
//     expediente_last_saved_at y auto-pasa pending → in_progress)
//   - saveStatus(status)   → PATCH .../expediente-status (completed /
//     revertir a in_progress, a mano)
//   - saveAgreement / saveReferral → POST (nuevo) o PATCH (editar)
// Cada mutación refresca el estado local sin re-fetch completo.

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type {
  ExpedienteStatus,
  InstitutionReferralItem,
  ParentAgreementItem,
  PrefectStudent,
} from "@/lib/types";

// Resultado plano de cualquier mutación (para toNotice()).
export interface MutateResult {
  success: boolean;
  message: string;
}

// GET /api/students/:id puede envolver el alumno en { data } (toleramos
// ambos shapes, igual que useStudentFile).
type StudentBody = PrefectStudent | { data: PrefectStudent };

// Respuesta del PATCH de salud.
interface HealthPatchResponse {
  success?: boolean;
  message?: string;
  data?: {
    expedienteStatus?: ExpedienteStatus;
    expedienteLastSavedAt?: string | null;
  };
}

interface ExpedienteStatusResponse {
  success?: boolean;
  data?: {
    expedienteStatus?: ExpedienteStatus;
    expedienteCompletedAt?: string | null;
  };
}

// Payload parcial del PATCH de salud: SOLO los campos de una sección
// (el whitelist del backend ignora lo demás).
export type HealthSectionPayload = Record<string, unknown>;

export function useStudentExpediente(studentId: string | undefined) {
  const [student, setStudent] = useState<PrefectStudent | null>(null);
  const [agreements, setAgreements] = useState<ParentAgreementItem[]>([]);
  const [referrals, setReferrals] = useState<InstitutionReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // isSaving global: lo consumen los botones "Guardar" de las secciones.
  const [isSaving, setIsSaving] = useState(false);

  const fetchFile = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [studentBody, agreementsRes, referralsRes] = await Promise.all([
        api.get<StudentBody>(ENDPOINTS.STUDENT_BY_ID(studentId)),
        api.get<ParentAgreementItem[]>(
          ENDPOINTS.SOCIAL_WORKER_AGREEMENTS(studentId)
        ),
        api.get<InstitutionReferralItem[]>(
          ENDPOINTS.SOCIAL_WORKER_REFERRALS(studentId)
        ),
      ]);

      const resolved =
        studentBody && "data" in studentBody
          ? studentBody.data
          : (studentBody as PrefectStudent);
      if (!resolved?._id) throw new Error("No se encontró el alumno.");

      setStudent(resolved);
      setAgreements(Array.isArray(agreementsRes) ? agreementsRes : []);
      setReferrals(Array.isArray(referralsRes) ? referralsRes : []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el expediente.");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  // ------------------------------------------------------------------
  // Guardar una SECCIÓN de la ficha (PATCH de salud)
  // ------------------------------------------------------------------
  const saveHealth = useCallback(
    async (payload: HealthSectionPayload): Promise<MutateResult> => {
      if (!studentId) return { success: false, message: "Sin alumno." };
      setIsSaving(true);
      try {
        const res = await api.patch<HealthPatchResponse>(
          ENDPOINTS.STUDENT_HEALTH(studentId),
          payload
        );
        // Actualización optimista del estado local: los campos del
        // payload viven o bien en health_inclusion o bien en el nivel
        // raíz (medical_notes).
        setStudent((prev) => {
          if (!prev) return prev;
          const next: PrefectStudent = { ...prev };
          const health = { ...(prev.health_inclusion || {}) };
          for (const [key, value] of Object.entries(payload)) {
            if (key === "medical_notes") {
              next.medical_notes = value as string;
            } else if (key === "family_socioeconomic") {
              health.family_socioeconomic = {
                ...(health.family_socioeconomic || {}),
                ...(value as object),
              };
            } else {
              (health as Record<string, unknown>)[key] = value;
            }
          }
          next.health_inclusion = health;
          if (res?.data?.expedienteStatus) {
            next.expediente_status = res.data.expedienteStatus;
          }
          if (res?.data?.expedienteLastSavedAt !== undefined) {
            next.expediente_last_saved_at = res.data.expedienteLastSavedAt;
          }
          return next;
        });
        return {
          success: res?.success !== false,
          message: res?.message || "Sección guardada correctamente.",
        };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo guardar la sección.",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [studentId]
  );

  // ------------------------------------------------------------------
  // Estado del expediente (completar / reabrir) — a mano
  // ------------------------------------------------------------------
  const saveStatus = useCallback(
    async (status: "in_progress" | "completed"): Promise<MutateResult> => {
      if (!studentId) return { success: false, message: "Sin alumno." };
      setIsSaving(true);
      try {
        const res = await api.patch<ExpedienteStatusResponse>(
          ENDPOINTS.SOCIAL_WORKER_EXPEDIENTE_STATUS(studentId),
          { status }
        );
        setStudent((prev) =>
          prev
            ? {
                ...prev,
                expediente_status: res?.data?.expedienteStatus ?? status,
                expediente_completed_at:
                  res?.data?.expedienteCompletedAt ??
                  (status === "completed" ? new Date().toISOString() : null),
              }
            : prev
        );
        return {
          success: true,
          message:
            status === "completed"
              ? "Expediente marcado como completado."
              : "Expediente reabierto (en proceso).",
        };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo actualizar el estado.",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [studentId]
  );

  // ------------------------------------------------------------------
  // Acuerdos con padres (crear / editar)
  // ------------------------------------------------------------------
  const saveAgreement = useCallback(
    async (
      payload: Record<string, unknown>,
      agreementId?: string
    ): Promise<MutateResult> => {
      if (!studentId) return { success: false, message: "Sin alumno." };
      setIsSaving(true);
      try {
        if (agreementId) {
          await api.patch(ENDPOINTS.SOCIAL_WORKER_AGREEMENT_BY_ID(agreementId), payload);
        } else {
          await api.post(ENDPOINTS.SOCIAL_WORKER_AGREEMENTS(studentId), payload);
        }
        const refreshed = await api.get<ParentAgreementItem[]>(
          ENDPOINTS.SOCIAL_WORKER_AGREEMENTS(studentId)
        );
        setAgreements(Array.isArray(refreshed) ? refreshed : []);
        return {
          success: true,
          message: agreementId ? "Acuerdo actualizado." : "Acuerdo registrado.",
        };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo guardar el acuerdo.",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [studentId]
  );

  // ------------------------------------------------------------------
  // Canalizaciones externas (crear / editar)
  // ------------------------------------------------------------------
  const saveReferral = useCallback(
    async (
      payload: Record<string, unknown>,
      referralId?: string
    ): Promise<MutateResult> => {
      if (!studentId) return { success: false, message: "Sin alumno." };
      setIsSaving(true);
      try {
        if (referralId) {
          await api.patch(ENDPOINTS.SOCIAL_WORKER_REFERRAL_BY_ID(referralId), payload);
        } else {
          await api.post(ENDPOINTS.SOCIAL_WORKER_REFERRALS(studentId), payload);
        }
        const refreshed = await api.get<InstitutionReferralItem[]>(
          ENDPOINTS.SOCIAL_WORKER_REFERRALS(studentId)
        );
        setReferrals(Array.isArray(refreshed) ? refreshed : []);
        return {
          success: true,
          message: referralId
            ? "Canalización actualizada."
            : "Canalización registrada.",
        };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo guardar la canalización.",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [studentId]
  );

  return {
    student,
    agreements,
    referrals,
    isLoading,
    error,
    isSaving,
    refetch: fetchFile,
    saveHealth,
    saveStatus,
    saveAgreement,
    saveReferral,
  };
}
