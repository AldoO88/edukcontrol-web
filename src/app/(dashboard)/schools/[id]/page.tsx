// Overview de la escuela

"use client";

import { useEffect, useState, useRef } from "react";
import { redirect, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { School, SchoolYear } from "@/lib/types";
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
  Clock,
  ArrowRight,
  AlertTriangle,
  Shield,
  XCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateSchoolYearModal } from "@/components/school-years/CreateSchoolYearModal";
import { ConfigWizard } from "@/components/school-years/ConfigWizard";
import Image from "next/image";

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
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardYearId, setWizardYearId] = useState("");
  const [wizardYearName, setWizardYearName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit year modal state
  const [editingYear, setEditingYear] = useState<SchoolYear | null>(null);
  const [editYearName, setEditYearName] = useState("");
  const [editYearStart, setEditYearStart] = useState("");
  const [editYearEnd, setEditYearEnd] = useState("");
  const [isEditYearModalOpen, setIsEditYearModalOpen] = useState(false);
  const [isSavingYear, setIsSavingYear] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditSchoolFormData>({
    resolver: zodResolver(editSchoolSchema),
  });

  const fetchData = async () => {
    try {
      const [schoolRes, yearsRes] = await Promise.all([
        api.get<School>(`${ENDPOINTS.SCHOOLS}/${schoolId}`),
        api.get<{ items: SchoolYear[] }>(`${ENDPOINTS.SCHOOL_YEARS}?school=${schoolId}`),
      ]);
      setSchool(schoolRes);
      setYears(yearsRes.items);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const handleActivateYear = async (id: string) => {
    try {
      await api.post(ENDPOINTS.SCHOOL_YEAR_ACTIVATE(id));
      fetchData();
    } catch (err) {
      // Error silencioso
    }
  };

  const handleDeactivateYear = async (id: string) => {
    try {
      await api.post(ENDPOINTS.SCHOOL_YEAR_DEACTIVATE(id));
      fetchData();
    } catch (err) {
      // Error silencioso
    }
  };

  const openEditYearModal = (year: SchoolYear) => {
    setEditingYear(year);
    setEditYearName(year.name);
    // Extract YYYY-MM-DD from ISO string to avoid timezone shift
    setEditYearStart(year.startDate.slice(0, 10));
    setEditYearEnd(year.endDate.slice(0, 10));
    setIsEditYearModalOpen(true);
  };

  const handleSaveYear = async () => {
    if (!editingYear) return;
    setIsSavingYear(true);
    try {
      await api.put(`${ENDPOINTS.SCHOOL_YEARS}/${editingYear._id}`, {
        name: editYearName,
        startDate: editYearStart,
        endDate: editYearEnd,
      });
      setIsEditYearModalOpen(false);
      fetchData();
    } catch {
      // silent
    } finally {
      setIsSavingYear(false);
    }
  };

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
      await api.put(`${ENDPOINTS.SCHOOLS}/${schoolId}`, {
        name: data.name,
        cct: data.cct.toUpperCase(),
        honoraryName: data.honoraryName || undefined,
        address: data.address || undefined,
        phoneNumber: data.phoneNumber || undefined,
      });

      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await api.upload(`${ENDPOINTS.SCHOOLS}/${schoolId}/logo`, formData);
      }

      await fetchData();
      setIsEditModalOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al actualizar la escuela");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando escuela..." height="page" />;
  }

  if (!school) {
    return (
      <ErrorState
        title="Escuela no encontrada"
        message="La escuela que buscas no existe o fue eliminada."
        action={{
          label: "Volver al listado",
          onClick: () => {
            if (typeof window !== "undefined") {
              redirect("/schools");
            }
          },
        }}
      />
    );
  }

  const activeYear = years.find((y) => y.isActive);
  const recentYears = years.slice(0, 3);

  const configLinks = [
    {
      label: "Materias",
      icon: <BookOpen size={20} />,
      color: "text-rose-600",
      bgColor: "bg-rose-100",
      href: `/schools/${schoolId}/subjects`,
    },
    {
      label: "Turnos",
      icon: <Clock size={20} />,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      href: `/schools/${schoolId}/shifts`,
    },
    {
      label: "Grupos",
      icon: <ClipboardList size={20} />,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      href: `/schools/${schoolId}/groups`,
    },
    {
      label: "Usuarios",
      icon: <GraduationCap size={20} />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: `/schools/${schoolId}/users`,
    },
    {
      label: "Personal",
      icon: <Shield size={20} />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      href: `/schools/${schoolId}/staff`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info de la escuela */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-4">
            {school.logoUrl && !logoPreview ? (
              <Image
                src={school.logoUrl}
                alt={`Logo de ${school.name}`}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : logoPreview ? (
              <Image
                src={logoPreview}
                alt="Preview del logo"
                width={80}
                height={80}
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
              <Badge variant={activeYear ? "emerald" : "slate"}>
                {activeYear ? `Ciclo ${activeYear.name}` : "Sin ciclo activo"}
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

      {/* Sin ciclo activo - alerta */}
      {!activeYear && (
        <Card className="border-amber-200 bg-amber-50">
          <CardBody>
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                No hay ciclo escolar activo.{" "}
                <button
                  onClick={() => setIsYearModalOpen(true)}
                  className="font-semibold underline hover:text-amber-900"
                >
                  Crea uno para comenzar a configurar.
                </button>
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ciclos Escolares */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Ciclos Escolares
          </h3>
          <Button
            variant="sky"
            size="sm"
            onClick={() => setIsYearModalOpen(true)}
          >
            + Nuevo Ciclo
          </Button>
        </div>

        {recentYears.length === 0 ? (
          <EmptyState
            icon={<Calendar size={48} />}
            title="No hay ciclos escolares"
            description="Crea tu primer ciclo escolar para comenzar."
            action={{ label: "Crear Primer Ciclo", onClick: () => setIsYearModalOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentYears.map((year) => (
              <Card
                key={year._id}
                className={`${
                  year.isActive
                    ? "ring-2 ring-emerald-500 border-emerald-200"
                    : ""
                }`}
              >
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-text-primary">
                          {year.name}
                        </h4>
                        {year.isActive && (
                          <Badge variant="emerald">Activo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {year.startDate.slice(0, 10).split("-").reverse().join("/")} —{" "}
                        {year.endDate.slice(0, 10).split("-").reverse().join("/")}
                      </p>
                    </div>
                    <button
                      onClick={() => openEditYearModal(year)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted hover:text-accent-dark transition-colors"
                      title="Editar ciclo"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {year.isActive ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeactivateYear(year._id)}
                      >
                        <XCircle size={14} className="mr-1" />
                        Cerrar Ciclo
                      </Button>
                    ) : (
                      <Button
                        variant="sky"
                        size="sm"
                        onClick={() => handleActivateYear(year._id)}
                      >
                        Activar
                      </Button>
                    )}
                    <Link
                      href={`/schools/${schoolId}/school-years/${year._id}`}
                      className="text-sm text-accent-dark hover:text-accent font-medium ml-auto flex items-center"
                    >
                      Configurar <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Configuración de la Escuela */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Configuración de la Escuela
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {configLinks.map((link) => (
            <Link key={link.label} href={link.href}>
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
                <Image
                  src={logoPreview}
                  alt="Preview del logo"
                  width={96}
                  height={96}
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
                <Image
                  src={school.logoUrl}
                  alt="Logo actual"
                  width={96}
                  height={96}
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

      {/* Create School Year Modal */}
      <CreateSchoolYearModal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        onCreated={(yearId) => {
          setIsYearModalOpen(false);
          const yearName = years.length > 0
            ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
            : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
          // Find the year we just created from the name input or use a default
          setWizardYearId(yearId);
          setWizardYearName(yearName);
          setIsWizardOpen(true);
          fetchData();
        }}
        schoolId={schoolId}
        existingYears={years}
      />

      {/* Edit School Year Modal */}
      <Modal
        isOpen={isEditYearModalOpen}
        onClose={() => setIsEditYearModalOpen(false)}
        title="Editar Ciclo Escolar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={editYearName}
              onChange={(e) => setEditYearName(e.target.value)}
              placeholder="2025-2026"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={editYearStart}
                onChange={(e) => setEditYearStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Fecha de Fin
              </label>
              <input
                type="date"
                value={editYearEnd}
                onChange={(e) => setEditYearEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsEditYearModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="sky" onClick={handleSaveYear} isLoading={isSavingYear}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Config Wizard */}
      <ConfigWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          fetchData();
        }}
        schoolId={schoolId}
        schoolYearId={wizardYearId}
        schoolYearName={wizardYearName}
        onCompleted={fetchData}
      />
    </div>
  );
}
