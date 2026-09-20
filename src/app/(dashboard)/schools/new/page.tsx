// Página de Creación de Escuela

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X } from "lucide-react";

const schoolSchema = z.object({
  name: z.string().min(1, "Nombre de la escuela requerido"),
  cct: z
    .string()
    .min(1, "CCT requerido")
    .regex(/^[A-Z0-9]+$/, "CCT solo debe contener letras mayúsculas y números"),
  honoraryName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export default function NewSchoolPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: SchoolFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (logoFile) {
        // Use multipart endpoint with logo
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("cct", data.cct.toUpperCase());
        if (data.honoraryName) formData.append("honoraryName", data.honoraryName);
        if (data.address) formData.append("address", data.address);
        if (data.phoneNumber) formData.append("phoneNumber", data.phoneNumber);
        formData.append("logo", logoFile);

        await api.upload(`${ENDPOINTS.SCHOOLS}/with-logo`, formData);
      } else {
        // Use plain JSON endpoint
        await api.post(ENDPOINTS.SCHOOLS, {
          name: data.name,
          cct: data.cct.toUpperCase(),
          honoraryName: data.honoraryName || undefined,
          address: data.address || undefined,
          phoneNumber: data.phoneNumber || undefined,
        });
      }
      router.push("/schools");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la escuela");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Escuela"
        subtitle="Registrar una nueva institución educativa"
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Logo de la Escuela
              </label>
              <p className="text-sm text-text-secondary mb-3">
                Opcional. Puedes subirlo ahora o agregarlo después.
              </p>
              {logoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Preview del logo"
                    className="w-32 h-32 object-cover rounded-xl border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center hover:bg-error/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <Upload size={24} className="text-text-muted mb-2" />
                  <span className="text-xs text-text-muted text-center px-2">
                    Subir logo
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            {/* School Name */}
            <Input
              label="Nombre de la Escuela"
              placeholder="Escuela Secundaria Técnica No. 47"
              error={errors.name?.message}
              {...register("name")}
            />

            {/* Honorary Name */}
            <Input
              label="Nombre Honorífico"
              placeholder="José Clemente Orozco"
              error={errors.honoraryName?.message}
              {...register("honoraryName")}
            />

            {/* CCT */}
            <Input
              label="CCT (Clave del Centro de Trabajo)"
              placeholder="09DPR1234A"
              error={errors.cct?.message}
              {...register("cct")}
            />
            <p className="text-sm text-text-secondary -mt-2">
              El CCT debe ser único en todo el sistema. Se convertirá
              automáticamente a mayúsculas.
            </p>

            {/* Address */}
            <Input
              label="Dirección"
              placeholder="Av. Insurgentes Sur 1234, Col. Del Valle"
              error={errors.address?.message}
              {...register("address")}
            />

            {/* Phone */}
            <Input
              label="Teléfono"
              placeholder="55 1234 5678"
              error={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" variant="sky" isLoading={isSubmitting}>
                Crear Escuela
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
