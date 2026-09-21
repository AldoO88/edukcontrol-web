// Configuración de la API y endpoints
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Endpoints del backend
export const ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  VERIFY: "/auth/verify",
  LOGOUT: "/auth/logout",
  SIGNUP: "/auth/signup",
  CHANGE_PASSWORD: "/auth/change-password",

  // Schools (super_admin)
  SCHOOLS: "/api/schools",
  SCHOOL_LOGO: (id: string) => `/api/schools/${id}/logo`,

  // School Years
  SCHOOL_YEARS: "/api/school-years",
  SCHOOL_YEAR_ACTIVATE: (id: string) => `/api/school-years/${id}/activate`,

  // Groups
  GROUPS: "/api/groups",
  GROUP_STUDENTS: (id: string) => `/api/groups/${id}/students`,
  GROUP_SCHEDULE: (id: string) => `/api/groups/${id}/schedule`,

  // Subjects
  SUBJECTS: "/api/subjects",

  // Teachers (via signup)
  TEACHERS: "/api/teacher-subjects",

  // Teacher-Subjects
  TEACHER_SUBJECTS: "/api/teacher-subjects",

  // Students
  STUDENTS: "/api/students",
  STUDENT_PHOTO: (id: string) => `/api/students/${id}/photo`,
  STUDENT_PROMOTE: (id: string) => `/api/students/${id}/promote`,
  STUDENT_ENROLLMENTS: (id: string) => `/api/students/${id}/enrollments`,

  // Enrollments
  ENROLLMENTS: "/api/enrollments",
  ENROLLMENTS_IMPORT: "/api/enrollments/import",

  // School Shifts
  SCHOOL_SHIFTS: "/api/school-shifts",

  // Class Schedules
  CLASS_SCHEDULES: "/api/class-schedules",

  // Grading Periods
  GRADING_PERIODS: "/api/grading-periods",

  // School Calendar
  SCHOOL_CALENDAR: "/api/school-calendar",
  SCHOOL_CALENDAR_WEEKENDS: "/api/school-calendar/weekends",

  // Attendance
  ATTENDANCE_LOGS: "/api/attendance/logs",

  // Credentials
  CREDENTIALS_PDF: (schoolYearId: string, ids?: string) =>
    `/api/students/credentials?school_year_id=${schoolYearId}${
      ids ? `&ids=${ids}` : ""
    }`,

  // Dashboard
  DASHBOARD_SUPER_ADMIN: "/api/dashboard/super-admin",
  DASHBOARD_SETUP_STATUS: (schoolId: string) =>
    `/api/dashboard/super-admin/schools/${schoolId}/setup-status`,
  DASHBOARD_TEACHERS: (schoolId: string) =>
    `/api/dashboard/super-admin/schools/${schoolId}/teachers`,
  DASHBOARD_GROUPS: (schoolId: string) =>
    `/api/dashboard/super-admin/schools/${schoolId}/groups`,
  DASHBOARD_TEACHER_SUBJECTS: (schoolId: string) =>
    `/api/dashboard/super-admin/schools/${schoolId}/teacher-subjects`,
  DASHBOARD_PENDING_TASKS: "/api/dashboard/super-admin/pending-tasks",
} as const;

// Días de la semana (convención JavaScript: 0=domingo)
export const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
] as const;

// Colores de estado (consistencia con app móvil)
export const STATUS_COLORS = {
  success: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  warning: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  error: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  info: { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  neutral: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
} as const;

// Roles del sistema
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  PRINCIPAL: "principal",
  REGISTRAR: "registrar",
  TEACHER: "teacher",
  PREFECT: "prefect",
  SOCIAL_WORKER: "social_worker",
  TUTOR: "tutor",
} as const;

// Turnos
export const SHIFTS = {
  MATUTINO: "matutino",
  VESPERTINO: "vespertino",
} as const;
