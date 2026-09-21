// AcademicRecordTable — componente reutilizable para gestionar
// registros académicos (Licenciatura, Maestría, Doctorado, etc.)
//
// Muestra una tabla con los registros existentes y un botón "+" para
// agregar nuevos. Cada registro tiene: tipo, nombre de carrera,
// institución y estado (pasante/titulado).

"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Select } from "./Select";
import { Input } from "./Input";
import type { AcademicRecord } from "@/lib/types";
import { Plus, X, GraduationCap } from "lucide-react";

const DEGREE_OPTIONS = [
  { value: "Licenciatura", label: "Licenciatura" },
  { value: "Especialidad", label: "Especialidad" },
  { value: "Maestría", label: "Maestría" },
  { value: "Doctorado", label: "Doctorado" },
  { value: "Posdoctorado", label: "Posdoctorado" },
];

const STATUS_OPTIONS = [
  { value: "pasante", label: "Pasante" },
  { value: "titulado", label: "Titulado" },
];

interface AcademicRecordTableProps {
  value: AcademicRecord[];
  onChange: (records: AcademicRecord[]) => void;
  readonly?: boolean;
  label?: string;
}

export function AcademicRecordTable({
  value,
  onChange,
  readonly = false,
  label = "Preparación Académica",
}: AcademicRecordTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const [newCareer, setNewCareer] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const resetForm = () => {
    setNewType("");
    setNewCareer("");
    setNewInstitution("");
    setNewStatus("");
    setIsAdding(false);
  };

  const handleAdd = () => {
    if (!newType || !newCareer || !newInstitution || !newStatus) return;
    const record: AcademicRecord = {
      type: newType as AcademicRecord["type"],
      careerName: newCareer,
      institution: newInstitution,
      status: newStatus as AcademicRecord["status"],
    };
    onChange([...value, record]);
    resetForm();
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text-primary">{label}</label>

      {/* Tabla de registros existentes */}
      {value.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left px-3 py-2 font-semibold text-text-primary">Tipo</th>
                <th className="text-left px-3 py-2 font-semibold text-text-primary">Carrera</th>
                <th className="text-left px-3 py-2 font-semibold text-text-primary">Institución</th>
                <th className="text-left px-3 py-2 font-semibold text-text-primary">Estado</th>
                {!readonly && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {value.map((record, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-b-0 hover:bg-slate-50/50"
                >
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent-dark">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-primary">{record.careerName}</td>
                  <td className="px-3 py-2 text-text-secondary">{record.institution}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        record.status === "titulado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {record.status === "titulado" ? "Titulado" : "Pasante"}
                    </span>
                  </td>
                  {!readonly && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemove(idx)}
                        className="p-1 rounded-lg hover:bg-error-light text-text-muted hover:text-error transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !readonly && (
          <div className="flex items-center gap-2 py-3 text-sm text-text-muted">
            <GraduationCap size={16} />
            <span>Sin registros académicos</span>
          </div>
        )
      )}

      {/* Formulario inline para agregar */}
      {!readonly && isAdding && (
        <div className="border border-accent/30 rounded-xl p-4 bg-accent/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo de grado"
              options={DEGREE_OPTIONS}
              placeholder="Seleccionar..."
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
            <Select
              label="Estado"
              options={STATUS_OPTIONS}
              placeholder="Seleccionar..."
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            />
          </div>
          {newType && (
            <>
              <Input
                label="Nombre de la carrera"
                placeholder="Ej. Ingeniería en Sistemas"
                value={newCareer}
                onChange={(e) => setNewCareer(e.target.value)}
              />
              <Input
                label="Institución"
                placeholder="Ej. Universidad Autónoma de México"
                value={newInstitution}
                onChange={(e) => setNewInstitution(e.target.value)}
              />
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={handleAdd}
              disabled={!newType || !newCareer || !newInstitution || !newStatus}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Botón + para agregar */}
      {!readonly && !isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-sm font-medium text-accent-dark hover:text-accent transition-colors self-start"
        >
          <Plus size={16} />
          Agregar preparación académica
        </button>
      )}
    </div>
  );
}
