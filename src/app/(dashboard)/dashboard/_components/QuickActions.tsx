// Accesos rápidos del dashboard

import {
  Users,
  BookOpen,
  Calendar,
  UserPlus,
  Clock,
} from "lucide-react";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Registrar Maestro",
    href: "/teachers/new",
    icon: <UserPlus size={20} />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    label: "Crear Grupo",
    href: "/groups/new",
    icon: <Users size={20} />,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    label: "Asignar Materias",
    href: "/teacher-subjects",
    icon: <BookOpen size={20} />,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
  },
  {
    label: "Calendario",
    href: "/calendar",
    icon: <Calendar size={20} />,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
  {
    label: "Horarios",
    href: "/schedules",
    icon: <Clock size={20} />,
    color: "text-sky-600",
    bgColor: "bg-sky-100",
  },
];

export function QuickActions() {
  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary mb-4">Accesos Rápidos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIONS.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="
              flex flex-col items-center gap-3 p-4 bg-white rounded-2xl
              border border-border shadow-sm
              hover:shadow-md hover:border-accent/30 transition-all
              text-center group
            "
          >
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl ${action.bgColor} group-hover:scale-110 transition-transform`}
            >
              <span className={action.color}>{action.icon}</span>
            </div>
            <span className="text-sm font-medium text-text-primary">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
