// Página de Alumnos

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, User } from "@/lib/types";
import { GraduationCap } from "lucide-react";

export default function StudentsPage() {
  const router = useRouter();
  const params = useParams();
  const yearId = params.yearId as string;
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await api.get<{ items: Student[] }>(
          `${ENDPOINTS.STUDENTS}?school_year_id=${yearId}`
        );
        setStudents(res.items);
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.controlNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<Student>[] = [
    { key: "controlNumber", label: "No. Control" },
    {
      key: "first_name",
      label: "Nombre",
      render: (item) => `${item.first_name} ${item.last_name || ""}`,
    },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <Badge variant={item.status === "active" ? "emerald" : "rose"}>
          {item.status === "active" ? "Activo" : "Baja"}
        </Badge>
      ),
    },
    {
      key: "_id",
      label: "Acciones",
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/students/${item._id}`)}
        >
          Ver
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumnos"
        subtitle="Gestión del alumnado"
        action={{
          label: "Registrar Alumno",
          href: "/students/new",
        }}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre o número de control..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title={searchQuery ? "No se encontraron resultados" : "No hay alumnos registrados"}
          description={
            searchQuery
              ? "Intenta con otros términos de búsqueda"
              : "Registra alumnos para comenzar a gestionar su información académica."
          }
          action={
            !searchQuery
              ? { label: "Registrar Alumno", href: "/students/new" }
              : undefined
          }
        />
      ) : (
        <Card>
          <DataTable columns={columns} data={filteredStudents} />
        </Card>
      )}
    </div>
  );
}
