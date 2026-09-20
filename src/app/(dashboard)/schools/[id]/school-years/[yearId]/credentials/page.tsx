// Página de Credenciales

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { KeyRound } from "lucide-react";

export default function CredentialsPage() {
  const params = useParams();
  const yearId = params.yearId as string;
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [count, setCount] = useState<number>(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await api.post<{ generated: number }>(`${ENDPOINTS.CREDENTIALS}/generate`, {
        count: count || 10,
        school_year_id: yearId,
      });
      setResult({
        success: true,
        message: `Se generaron ${res.generated} credenciales exitosamente.`,
      });
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Error al generar credenciales",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credenciales"
        subtitle="Generar credenciales para alumnos"
      />

      <Card>
        <CardBody>
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl">
                <KeyRound className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Generar Credenciales</h3>
                <p className="text-sm text-text-secondary">
                  Genera números de control y contraseñas para alumnos nuevos.
                </p>
              </div>
            </div>

            <Input
              label="Cantidad de credenciales a generar"
              type="number"
              placeholder="10"
              value={count || ""}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
            />

            <Button
              variant="sky"
              onClick={handleGenerate}
              isLoading={isGenerating}
              className="w-full"
            >
              Generar Credenciales
            </Button>

            {result && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  result.success
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-error-light text-error"
                }`}
              >
                {result.message}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
