// Overview de la escuela

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { School } from "@/lib/types";
import {
  School as SchoolIcon,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  MapPin,
  Phone,
  Pencil,
  Upload,
  X,
  ArrowRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const editSchoolSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  cct: z
    .string()
    .min(1, "CCT requerido")
    .regex(/^[A-Z0-9]+$/, "CCT solo debe contener letras mayúsculas y números"),
  honoraryName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type EditSchoolFormData = z.infer<typeof editSchoolSchema>;

export default function SchoolOverviewPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditSchoolFormData>({
    resolver: zodResolver(editSchoolSchema),
  });

  const fetchSchool = async () => {
    try {
      const res = await api.get<School>(`${ENDPOINTS.SCHOOLS}/${schoolId}`);
      setSchool(res);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchool();
  }, [schoolId]);

  const openEditModal = () => {
    if (school) {
      reset({
        name: school.name,
        cct: school.cct,
        honoraryName: school.honoraryName || "",
        address: school.address || "",
        phoneNumber: school.phoneNumber || "",
      });
      setLogoFile(null);
      setLogoPreview(null);
      setEditError(null);
      setIsEditModalOpen(true);
    }
  };

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

  const onEditSubmit = async (data: EditSchoolFormData) => {
    setEditError(null);
    setIsSubmitting(true);
    try {
      // Update text fields
      await api.put(`${ENDPOINTS.SCHOOLS}/${schoolId}`, {
        name: data.name,
        cct: data.cct.toUpperCase(),
        honoraryName: data.honoraryName || undefined,
        address: data.address || undefined,
        phoneNumber: data.phoneNumber || undefined,
      });

      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await api.upload(`${ENDPOINTS.SCHOOLS}/${schoolId}/logo`, formData);
      }

      await fetchSchool();
      setIsEditModalOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al actualizar la escuela");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No se encontró la escuela.
      </div>
    );
  }

  const hasActiveYear = !!school.current_school_year_id;

  const quickLinks = [
    { label: "Ciclos Escolares", href: "school-years", icon: <Calendar size={20} />, color: "text-accent-dark", bgColor: "bg-accent/10" },
    { label: "Maestros", href: "teachers", icon: <Users size={20} />, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "Alumnos", href: "students", icon: <GraduationCap size={20} />, color: "text-amber-600", bgColor: "bg-amber-100" },
    { label: "Materias", href: "subjects", icon: <BookOpen size={20} />, color: "text-rose-600", bgColor: "bg-rose-100" },
    { label: "Grupos", href: "groups", icon: <ClipboardList size={20} />, color: "text-violet-600", bgColor: "bg-violet-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Info de la escuela */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-4">
            {school.logoUrl && !logoPreview ? (
              <img
                src={school.logoUrl}
                alt={`Logo de ${school.name}`}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : logoPreview ? (
              <img
                src={logoPreview}
                alt="Preview del logo"
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-20 h-20 bg-accent/10 rounded-xl">
                <SchoolIcon size={40} className="text-accent-dark" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-primary">{school.name}</h2>
              {school.honoraryName && (
                <p className="text-sm text-accent-dark italic mt-1">
                  {school.honoraryName}
                </p>
              )}
              <p className="text-sm text-text-secondary mt-1">CCT: {school.cct}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-text-secondary">
                {school.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-text-muted" />
                    <span>{school.address}</span>
                  </div>
                )}
                {school.phoneNumber && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-text-muted" />
                    <span>{school.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={hasActiveYear ? "emerald" : "slate"}>
                {hasActiveYear ? "Con ciclo activo" : "Sin ciclo activo"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={openEditModal}
                className="text-text-secondary hover:text-accent-dark"
              >
                <Pencil size={16} className="mr-1.5" />
                Editar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Wizard de configuración - link destacado */}
      <Link href={`/schools/${schoolId}/setup-wizard`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-white">
                <ClipboardList size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">
                  Asistente de Configuración
                </h3>
                <p className="text-sm text-text-secondary">
                  Ver el progreso de configuración y completar piezas faltantes.
                </p>
              </div>
              <span className="text-sm font-medium text-accent-dark flex items-center">
                Abrir <ArrowRight size={14} className="ml-1" />
              </span>
            </div>
          </CardBody>
        </Card>
      </Link>

      {/* Links de acceso rápido */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Configuración de la Escuela
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={`/schools/${schoolId}/${link.href}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${link.bgColor}`}>
                      <span className={link.color}>{link.icon}</span>
                    </div>
                    <span className="font-medium text-text-primary">{link.label}</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Escuela"
      >
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {editError}
            </div>
          )}

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Logo
            </label>
            {logoPreview ? (
              <div className="relative inline-block">
                <img
                  src={logoPreview}
                  alt="Preview del logo"
                  className="w-24 h-24 object-cover rounded-xl border border-border"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center hover:bg-error/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : school?.logoUrl ? (
              <div className="relative inline-block">
                <img
                  src={school.logoUrl}
                  alt="Logo actual"
                  className="w-24 h-24 object-cover rounded-xl border border-border"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  <Pencil size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <Upload size={20} className="text-text-muted mb-1" />
                <span className="text-xs text-text-muted">Subir</span>
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

          <Input
            label="Nombre de la Escuela"
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            label="CCT (Clave del Centro de Trabajo)"
            error={errors.cct?.message}
            {...register("cct")}
          />

          <Input
            label="Nombre Honorífico"
            placeholder="José Clemente Orozco"
            error={errors.honoraryName?.message}
            {...register("honoraryName")}
          />

          <Input
            label="Dirección"
            error={errors.address?.message}
            {...register("address")}
          />

          <Input
            label="Teléfono"
            error={errors.phoneNumber?.message}
            {...register("phoneNumber")}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
