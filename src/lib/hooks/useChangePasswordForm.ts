// Hook del formulario de cambio de contraseña — puerto web de
// useChangePassword.js de la app móvil:
//   - Estado de los 3 campos + errores por campo + general.
//   - Misma validación: actual requerida; nueva requerida, ≥8 chars y
//     distinta de la actual; confirmación requerida e idéntica.
//   - Submit → changePassword (src/lib/auth.ts → PUT
//     /api/auth/change-password); en éxito limpia el formulario y deja
//     el mensaje de éxito visible (en web NO se navega: la pantalla
//     actualiza in-place).

"use client";

import { useCallback, useState } from "react";
import { changePassword } from "@/lib/auth";

const INITIAL_VALUES = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type Field = keyof typeof INITIAL_VALUES;

type FormErrors = Partial<Record<Field, string>> & { general?: string };

// Validación idéntica al hook de la app.
function validateChangePassword(values: typeof INITIAL_VALUES): FormErrors {
  const errors: FormErrors = {};

  // Contraseña actual requerida.
  if (!values.currentPassword?.trim()) {
    errors.currentPassword = "La contraseña actual es obligatoria.";
  }

  // Nueva contraseña: requerida, mínimo 8 y distinta de la actual.
  if (!values.newPassword?.trim()) {
    errors.newPassword = "La nueva contraseña es obligatoria.";
  } else if (values.newPassword.length < 8) {
    errors.newPassword = "Debe tener al menos 8 caracteres.";
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = "La nueva contraseña debe ser diferente a la actual.";
  }

  // Confirmación requerida y debe coincidir.
  if (!values.confirmPassword?.trim()) {
    errors.confirmPassword = "Confirma tu nueva contraseña.";
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}

export function useChangePasswordForm() {
  const [values, setValues] = useState({ ...INITIAL_VALUES });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // handleChange: actualiza un campo y limpia su error + el banner de
  // éxito (editar tras un cambio exitoso lo oculta, como cabría esperar).
  const handleChange = useCallback((field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  }, []);

  // handleSubmit: valida → servicio → banner de éxito o error general.
  const handleSubmit = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    // Sin doble submit.
    if (isSubmitting) return { success: false, message: "Ya se está procesando…" };

    const validationErrors = validateChangePassword(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return { success: false, message: "Revisa los campos marcados." };
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(values.currentPassword, values.newPassword);
      if (result.success) {
        // Limpiar formulario y mostrar el mensaje de éxito del backend.
        setValues({ ...INITIAL_VALUES });
        setErrors({});
        setSuccessMessage(result.message || "Contraseña actualizada correctamente.");
      } else {
        // Error del backend (contraseña actual incorrecta, etc.).
        setErrors({ general: result.message || "No se pudo cambiar la contraseña." });
      }
      return result;
    } catch {
      setErrors({ general: "Ocurrió un error inesperado. Intenta de nuevo." });
      return { success: false, message: "Ocurrió un error inesperado." };
    } finally {
      setIsSubmitting(false);
    }
  }, [values, isSubmitting]);

  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  return {
    values,
    errors,
    isSubmitting,
    successMessage,
    clearSuccess,
    handleChange,
    handleSubmit,
  };
}
