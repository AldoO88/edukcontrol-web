// =====================================================================
// src/app/prefect/profile/page.tsx
// ---------------------------------------------------------------------
// Perfil del prefecto — puerto web de (tabs)/profile/index.jsx +
// profile/change-password.jsx (ambos en una sola página, patrón web):
//   1. Tarjeta de perfil: avatar de iniciales (ámbar, igual que la
//      app), nombre completo (dashboard.prefect → user), rol
//      "Prefectura", teléfono, email y nota de contacto a
//      administración para cambios oficiales.
//   2. Cambiar Contraseña: formulario con validaciones idénticas a la
//      app (actual obligatoria; nueva ≥8 y distinta; confirmación
//      idéntica) con toggles de visibilidad y feedback in-place.
// Fuente de datos: usePrefectDashboard (prefect/school) + useAuth.
// Formulario: hook useChangePasswordForm (misma lógica que la app).
// (Preferencias notificaciones/modo oscuro: fuera de alcance v1 web.)
// =====================================================================

"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Key, Lock, Mail, Phone, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePrefectDashboard } from "@/lib/hooks/usePrefectDashboard";
import { useChangePasswordForm } from "@/lib/hooks/useChangePasswordForm";

// Campo de contraseña con toggle de visibilidad (Input no trae sufijo,
// así que se posiciona un botón absoluto a la derecha).
function PasswordField({
  label,
  value,
  placeholder,
  error,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      <div className="relative mt-1.5">
        <Input
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          error={error}
          autoComplete="new-password"
          className="pr-10"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

export default function PrefectProfilePage() {
  const { user } = useAuth();
  const { data: dashboard } = usePrefectDashboard();
  const {
    values,
    errors,
    isSubmitting,
    successMessage,
    handleChange,
    handleSubmit,
  } = useChangePasswordForm();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Los toggles de visibilidad se ocultan al enviar (formulario limpio).
  useEffect(() => {
    if (!isSubmitting) return;
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }, [isSubmitting]);

  // Datos del prefecto: dashboard es la fuente preferida (como la app).
  // OJO: el backend compone `prefect.name` como "Nombre Apellido" (no
  // trae last_name aparte) — se usa fullName/name tal cual y solo se
  // compone desde user como último fallback.
  const prefect = dashboard?.prefect;
  const fullName =
    (prefect?.fullName || prefect?.name || "").trim() ||
    `${user?.last_name || ""} ${user?.name || ""}`.trim() ||
    user?.name ||
    "Prefecto";
  const initials = fullName
    .split(/\s+/)
    .map((w) => w[0] || "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const phone = prefect?.phoneNumber || user?.phoneNumber || "—";
  const email = prefect?.email || user?.email || "—";

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Perfil" subtitle="Tu cuenta y seguridad" />

      {/* ---------------------------------------------------------------
          TARJETA DE PERFIL
          --------------------------------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col items-center py-6">
          {/* Avatar de iniciales (ámbar, igual que la app) */}
          <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-200 flex items-center justify-center">
            <span className="text-3xl font-extrabold text-amber-700">{initials}</span>
          </div>

          <p className="text-xl font-extrabold text-text-primary mt-4 text-center">
            {fullName}
          </p>
          <p className="text-sm text-text-secondary mt-0.5">Prefectura</p>

          {/* Contacto */}
          <div className="w-full mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
            <p className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
              <Phone size={15} className="text-slate-400" />
              Tel: {phone}
            </p>
            <div className="border-t border-slate-200" />
            <p className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
              <Mail size={15} className="text-slate-400" />
              {email}
            </p>
          </div>

          <p className="text-xs text-slate-400 italic text-center mt-4 leading-relaxed">
            Para modificar tu información oficial, contacta a la administración escolar.
          </p>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------------
          SEGURIDAD: CAMBIO DE CONTRASEÑA
          --------------------------------------------------------------- */}
      <Card>
        <CardBody className="space-y-4">
          <p className="flex items-center gap-2 text-base font-bold text-text-primary">
            <Key size={16} className="text-sky-600" />
            Cambiar Contraseña
          </p>

          {/* Banner informativo (mismo texto que la app) */}
          <div className="bg-sky-50 rounded-xl px-4 py-3">
            <p className="text-sky-800 text-sm leading-5">
              Para cambiar tu contraseña, verifica tu contraseña actual y establece una
              nueva. La nueva contraseña debe tener al menos 8 caracteres.
            </p>
          </div>

          {/* Error general del backend */}
          {errors.general && (
            <div className="bg-rose-50 rounded-xl px-4 py-3">
              <p className="text-rose-700 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Éxito */}
          {successMessage && (
            <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <p className="text-emerald-700 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Campos */}
          <PasswordField
            label="Contraseña actual"
            value={values.currentPassword}
            placeholder="Tu contraseña actual"
            error={errors.currentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            onChange={(v) => handleChange("currentPassword", v)}
          />
          <PasswordField
            label="Nueva contraseña"
            value={values.newPassword}
            placeholder="Mínimo 8 caracteres"
            error={errors.newPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            onChange={(v) => handleChange("newPassword", v)}
          />
          <PasswordField
            label="Confirmar nueva contraseña"
            value={values.confirmPassword}
            placeholder="Repite tu nueva contraseña"
            error={errors.confirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            onChange={(v) => handleChange("confirmPassword", v)}
          />

          {/* Submit */}
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            isLoading={isSubmitting}
            className="w-full"
          >
            <Lock size={15} className="mr-1.5" />
            {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
