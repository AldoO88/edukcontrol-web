// Página de Configuración de Credenciales
// - Diseñador CR80: PDF de fondo + foto / textos / logos / formas en el
//   lienzo de tarjeta PVC (85.6 × 54 mm) → School.credentialTemplate.
// - "Datos de la escuela" (director, ciudad, valores, indicaciones, etc.)
//   ya no se editan aquí: van como elementos desde la paleta.

"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Save, Eye, EyeOff } from "lucide-react";
import { CredentialDesigner } from "@/components/credential-designer/CredentialDesigner";
import {
  PdfPreviewModal,
  usePdfPreview,
} from "@/components/credential-designer/PdfPreviewModal";
import {
  emptyLayout,
  normalizeLayout,
  type CredentialLayout,
} from "@/lib/credential-layout";
import {
  normalizeLogoEntry,
  normalizePdfMeta,
  normalizeSides,
  type Cr80LogoEntry,
  type Cr80Sides,
  type TemplatePdfMeta,
} from "@/lib/credential-cr80";
import type { Student } from "@/lib/types";
import type { PdfPreviewStudentOption } from "@/components/credential-designer/PdfPreviewModal";

interface CredentialConfigResponse {
  html: string | null;
  layout: unknown | null;
  pdf: unknown | null;
  sides: unknown | null;
  updatedAt: string | null;
  config: Record<string, unknown>;
  logos: unknown[] | null;
  schoolName: string;
  cct: string;
  logoUrl: string | null;
  activeSchoolYearId: string | null;
}

export default function CredentialConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: schoolId } = use(params);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState<string | null>(null);
  const [previewStudents, setPreviewStudents] = useState<PdfPreviewStudentOption[]>([]);
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);

  // Form state
  const [html, setHtml] = useState("");
  const [layout, setLayout] = useState<CredentialLayout>(emptyLayout());
  const [pdfMeta, setPdfMeta] = useState<TemplatePdfMeta | null>(null);
  const [sides, setSides] = useState<Cr80Sides>([]);
  const [logos, setLogos] = useState<Cr80LogoEntry[]>([]);

  const preview = usePdfPreview();

  const fetchConfig = async () => {
    try {
      const res = await api.get<CredentialConfigResponse>(
        ENDPOINTS.CREDENTIAL_TEMPLATE(schoolId)
      );
      setHtml(res.html || "");
      setLayout(normalizeLayout(res.layout) || emptyLayout());
      const pdf = normalizePdfMeta(res.pdf);
      setPdfMeta(pdf);
      setSides(normalizeSides(res.sides, pdf ? pdf.pages : 1));
      setActiveSchoolYearId(res.activeSchoolYearId || null);
      setLogos(
        Array.isArray(res.logos)
          ? (res.logos
              .map((l) => normalizeLogoEntry(l))
              .filter(Boolean) as Cr80LogoEntry[])
          : []
      );
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchConfig();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await api.put(ENDPOINTS.CREDENTIAL_TEMPLATE(schoolId), {
        html,
        layout,
        pdf: pdfMeta,
        sides: pdfMeta ? sides : null,
      });
      setMessage({ type: "success", text: "Configuracion guardada correctamente." });
      fetchConfig();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar la configuracion.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewNotice(null);
    preview.setError(null);
    if (!activeSchoolYearId) {
      setPreviewNotice("Activa un ciclo escolar para poder previsualizar.");
      return;
    }
    try {
      // Lista del ciclo activo (enrolled solamente). Para el selector de
      // "alumno de muestra" del modal necesitamos varios — elegimos uno
      // con foto y nombre largo cuando exista, si no el primero.
      const res = await api.get<{ items: Student[] }>(
        `${ENDPOINTS.STUDENTS}?school_year_id=${activeSchoolYearId}&status=active&limit=50`
      );
      const items = res.items ?? [];
      const opts: PdfPreviewStudentOption[] = items.map((s) => ({
        _id: s._id,
        first_name: s.first_name,
        last_name: s.last_name,
        controlNumber: s.controlNumber,
      }));
      setPreviewStudents(opts);
      if (opts.length === 0) {
        setPreviewNotice("No hay alumnos registrados para previsualizar.");
        return;
      }
      const preferred =
        opts.find((s) => (s.first_name?.length ?? 0) + (s.last_name?.length ?? 0) >= 20) ||
        opts.find((s) => s.controlNumber) ||
        opts[0];
      setPreviewStudentId(preferred._id);
      await preview.generate({
        yearId: activeSchoolYearId,
        schoolId,
        ids: preferred._id,
      });
    } catch (err) {
      setPreviewNotice(
        err instanceof Error ? err.message : "Error al preparar la vista previa."
      );
    }
  };

  const handleSelectPreviewStudent = async (studentId: string) => {
    setPreviewStudentId(studentId);
    if (!activeSchoolYearId) return;
    preview.setError(null);
    try {
      await preview.generate({
        yearId: activeSchoolYearId,
        schoolId,
        ids: studentId,
      });
    } catch (err) {
      preview.setError(
        err instanceof Error ? err.message : "Error al regenerar la vista previa."
      );
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando configuracion..." height="page" />;
  }

  const banner = previewNotice || preview.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracion de Credenciales"
        subtitle="Sube el PDF de tu plantilla y coloca foto, datos, logos y figuras sobre la tarjeta CR80"
        action={{
          label: isSaving ? "Guardando..." : "Guardar",
          onClick: handleSave,
          icon: <Save size={16} />,
        }}
      />

      {message && (
        <div
          className={`p-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {banner && (
        <div className="p-3 rounded-xl text-sm bg-amber-50 text-amber-700">
          {banner}
        </div>
      )}

      {/* Diseñador CR80 (única sección: logos + datos + figuras desde aquí) */}
      <Card>
        <CardBody className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Diseñador de la credencial
            </h3>
            <p className="text-xs text-text-muted">
              Sube el PDF de tu plantilla (frente y, si aplica, reverso) tal
              como lo diseñaste en Canva o Illustrator — sin datos de alumnos
              — y encima coloca la foto, nombre, matrícula, los logos que
              hayas subido y cualquier figura (línea, rectángulo, elipse)
              con el lienzo en 85.6 × 54 mm. Al imprimir, el servidor
              compone el PDF con esos datos en milisegundos. Recuerda guardar
              con el botón &quot;Guardar&quot; de arriba.
            </p>
          </div>
          {!pdfMeta &&
            layout.front.elements.length + layout.back.elements.length > 0 && (
              <div className="p-3 rounded-xl text-xs bg-amber-50 text-amber-700">
                Tu diseño visual anterior sigue activo. Cuando subas un PDF
                CR80, este tendrá prioridad en la impresión.
              </div>
            )}
          <CredentialDesigner
            schoolId={schoolId}
            pdfMeta={pdfMeta}
            sides={sides}
            logos={logos}
            onChange={(next) => {
              setPdfMeta(next.pdf);
              setSides(next.sides);
            }}
            onChangeLogos={setLogos}
            onPreview={handlePreview}
          />
        </CardBody>
      </Card>

      {/* Modo avanzado: Template HTML (legado, mantenemos colapsable) */}
      <details className="group border border-border rounded-2xl bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between select-none">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Modo avanzado — Template HTML
            </h3>
            <p className="text-xs text-text-muted">
              Para quienes saben HTML/Handlebars. Tiene prioridad sobre el
              template por defecto, pero el diseño visual tiene prioridad sobre
              este.
            </p>
          </div>
          <span className="text-xs font-semibold text-accent-dark group-open:hidden">
            Abrir
          </span>
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-divider pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-primary">HTML</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
              {showPreview ? "Ocultar Preview" : "Ver Preview"}
            </Button>
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full h-96 px-4 py-3 text-sm font-mono text-text-primary bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-y"
            placeholder="Pega tu template HTML aqui..."
          />
          <p className="text-xs text-text-muted">
            Usa Handlebars para las variables: {"{{student.first_name}}"}, {"{{student.last_name}}"}, {"{{student.controlNumber}}"}, {"{{student.photoUrl}}"}, {"{{student.blood_type}}"}, {"{{group.grade}}"}, {"{{group.section}}"}, {"{{group.shift}}"}, {"{{school.name}}"}, {"{{school.honoraryName}}"}, {"{{school.cct}}"}, {"{{school.logoUrl}}"}, {"{{school.address}}"}, {"{{school.phoneNumber}}"}, {"{{schoolYear.name}}"}, {"{{guardian.phone}}"}
          </p>

          {showPreview && (
            <div className="border border-border rounded-xl overflow-hidden bg-white">
              <iframe
                srcDoc={html || "<p style='padding:20px;color:#999;'>No hay template HTML configurado.</p>"}
                sandbox=""
                className="w-full h-[600px]"
                title="Preview Credencial"
              />
            </div>
          )}
        </div>
      </details>

      {/* Vista previa del PDF */}
      <PdfPreviewModal
        url={preview.url}
        isLoading={preview.isLoading}
        onClose={preview.close}
        onDownload={() => preview.download("credenciales-vista-previa.pdf")}
        filename="vista previa (1 alumno)"
        students={previewStudents}
        selectedStudentId={previewStudentId ?? undefined}
        onSelectStudent={handleSelectPreviewStudent}
      />
    </div>
  );
}
