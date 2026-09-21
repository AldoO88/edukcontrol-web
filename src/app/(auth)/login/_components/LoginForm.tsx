// Formulario de Login
// Client Component con react-hook-form + zod

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { login } from "@/lib/auth";

const loginSchema = z.object({
  phone: z
    .string()
    .min(10, "El teléfono debe tener 10 dígitos")
    .max(10, "El teléfono debe tener 10 dígitos")
    .regex(/^\d+$/, "El teléfono solo debe contener números"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    const result = await login(data.phone, data.password);

    if (!result.success) {
      setError(result.message || "Error al iniciar sesión");
      return;
    }

    if (result.user && result.token) {
      authLogin(result.user, result.token);
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo mobile (visible solo en pantallas pequeñas, el hero muestra el logo en desktop) */}
      <div className="flex flex-col items-center mb-8 lg:hidden">
        <div className="flex items-center justify-center w-14 h-14 bg-accent rounded-2xl shadow-sm mb-4">
          <GraduationCap size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-accent tracking-tight">
          EdukControl
        </h1>
      </div>

      {/* Card del formulario */}
      <div className="bg-card rounded-3xl border border-border shadow-lg p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-text-primary">Bienvenido</h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Ingresa tus credenciales para acceder al portal académico
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {error}
            </div>
          )}

          <Input
            label="Teléfono"
            type="tel"
            placeholder="10 dígitos"
            icon={<Phone size={18} />}
            error={errors.phone?.message}
            {...register("phone")}
          />

          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-text-muted hover:text-text-secondary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button
            type="submit"
            variant="sky"
            size="lg"
            isLoading={isSubmitting}
            className="w-full mt-6"
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-text-muted text-[10px] font-semibold tracking-[0.2em] mt-8 uppercase">
        Versión 1.0.0 — Sistema de Gestión Escolar
      </p>
    </div>
  );
}
