// Grid de estadísticas del dashboard

"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Users, BookOpen, ClipboardCheck } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Group, TeacherSubject } from "@/lib/types";

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function StatsGrid() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total Alumnos", value: "—", icon: <GraduationCap size={24} />, color: "text-accent-dark", bgColor: "bg-accent/10" },
    { label: "Grupos Activos", value: "—", icon: <Users size={24} />, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "Materias", value: "—", icon: <BookOpen size={24} />, color: "text-amber-600", bgColor: "bg-amber-100" },
    { label: "Asignaciones", value: "—", icon: <ClipboardCheck size={24} />, color: "text-rose-600", bgColor: "bg-rose-100" },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, groupsRes, subjectsRes, teacherSubsRes] = await Promise.allSettled([
          api.get<{ items: Student[]; total: number }>(`${ENDPOINTS.STUDENTS}?limit=1`),
          api.get<Group[]>(ENDPOINTS.GROUPS),
          api.get<{ items: unknown[]; total: number }>(`${ENDPOINTS.SUBJECTS}?limit=1`),
          api.get<{ items: TeacherSubject[]; total: number }>(ENDPOINTS.TEACHER_SUBJECTS),
        ]);

        setStats([
          {
            label: "Total Alumnos",
            value: studentsRes.status === "fulfilled" ? studentsRes.value.total : "—",
            icon: <GraduationCap size={24} />,
            color: "text-accent-dark",
            bgColor: "bg-accent/10",
          },
          {
            label: "Grupos Activos",
            value: groupsRes.status === "fulfilled" ? groupsRes.value.length : "—",
            icon: <Users size={24} />,
            color: "text-emerald-600",
            bgColor: "bg-emerald-100",
          },
          {
            label: "Materias",
            value: subjectsRes.status === "fulfilled" ? subjectsRes.value.total : "—",
            icon: <BookOpen size={24} />,
            color: "text-amber-600",
            bgColor: "bg-amber-100",
          },
          {
            label: "Asignaciones",
            value: teacherSubsRes.status === "fulfilled" ? teacherSubsRes.value.total : "—",
            icon: <ClipboardCheck size={24} />,
            color: "text-rose-600",
            bgColor: "bg-rose-100",
          },
        ]);
      } catch {
        // Mantener valores por defecto
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bgColor}`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {isLoading ? (
                    <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-sm text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
