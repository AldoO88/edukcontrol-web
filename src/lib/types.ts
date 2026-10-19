// TypeScript types para EdukControl Web
// Tipos base del backend

export interface AcademicRecord {
  type: "Licenciatura" | "Especialidad" | "Maestría" | "Doctorado" | "Posdoctorado";
  careerName: string;
  institution: string;
  status: "pasante" | "titulado";
}

export interface User {
  _id: string;
  email?: string;
  name: string;
  last_name?: string;
  role: UserRole;
  phoneNumber: string;
  school?: string | School;
  isActive: boolean;
  sex?: string | null;
  academicPreparation?: AcademicRecord[];
  notification_prefs?: {
    whatsapp?: {
      opted_in?: boolean;
      opted_in_at?: string | null;
      source?: string | null;
    };
  };
}

export type UserRole =
  | "super_admin"
  | "admin"
  | "principal"
  | "registrar"
  | "teacher"
  | "prefect"
  | "social_worker"
  | "tutor";

export interface School {
  _id: string;
  name: string;
  cct: string;
  logoUrl?: string;
  isActive: boolean;
  current_school_year_id?: string;
  educationalLevels?: string[];
  honoraryName?: string;
  address?: string;
  phoneNumber?: string;
}

export interface SchoolYear {
  _id: string;
  school: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  workingDays?: number[];
}

export interface Student {
  _id: string;
  school: string;
  curp?: string;
  controlNumber?: string;
  first_name: string;
  last_name: string;
  sex?: string;
  rfid_card?: string;
  biometricId?: string;
  isFaceEnrolled?: boolean;
  photoUrl?: string;
  guardians?: string[] | Guardian[];
  current_group_id?: string | Group;
  workshop_group_id?: string;
  status: "active" | "withdrawn_temp" | "withdrawn_permanent";
  blood_type?: string;
  address?: string;
  phone?: string;
  date_of_birth?: string;
  medical_notes?: string;
}

export interface Guardian {
  _id: string;
  name: string;
  lastname?: string;
  phone: string;
  relationship: string;
  // `false` = dado de baja (registro conservado como historial pero
  // sin vínculos a estudiantes y con la cuenta User tutor
  // desactivada). Ausente/null cuenta como activo (backfill
  // backfill-guardian-active.js normaliza a `true`).
  isActive?: boolean;
  // Cuando el backend detecta que el celular ya está registrado con
  // otro perfil (teacher/admin/etc) devuelve la respuesta 201 con
  // `warning` para que la UI lo muestre al administrador.
  warning?: string;
  // Estudiantes vinculados (populado en GET /api/guardians y en
  // POST /api/guardians/:id/students). Usado por la modal "Buscar
  // tutor existente" para mostrar el conteo "N alumno(s)".
  students?: Array<{
    _id: string;
    controlNumber?: string;
    first_name?: string;
    last_name?: string;
  }>;
  // User tutor asociado (populado por GET /api/guardians y detail).
  // Si está presente, se considera "Cuenta activa" solo si
  // user_id.isActive === true.
  user_id?: string | {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  };
}

export interface Group {
  _id: string;
  school: string;
  grade: number;
  section: string;
  type: "regular" | "taller";
  school_year_id: string | SchoolYear;
  shift: "matutino" | "vespertino";
  head_teacher_id?: string | User;
}

export interface GroupTemplate {
  _id: string;
  school: string;
  grade: number;
  section: string;
  shift: "matutino" | "vespertino";
  type: "regular" | "taller";
}

export interface Subject {
  _id: string;
  school: string;
  code: string;
  name: string;
  grade?: number;
  description?: string;
  educationalLevel?: string;
  macroCategory?: string;
  classificationType?: string;
  credits?: number;
  isActive: boolean;
  isTutoria?: boolean;
  color?: string;
  icon?: string;
  workshops?: { name: string }[];
}

export interface TeacherSubject {
  _id: string;
  school: string;
  teacher_id: string | User;
  subject_id: string | Subject;
  group_id: string | Group;
  school_year_id: string | SchoolYear;
}

export interface Enrollment {
  _id: string;
  school: string;
  student_id: string | Student;
  group_id: string | Group;
  school_year_id: string | SchoolYear;
  cycle_status: "enrolled" | "withdrawn" | "graduated" | "transferred";
}

export interface SchoolShift {
  _id: string;
  school: string;
  school_year_id: string | SchoolYear;
  name: string;
  shift: "matutino" | "vespertino";
  startTime: string;
  endTime: string;
  moduleDurationMinutes: number;
  timeBlocks: TimeBlock[];
  gracePeriodMinutes: number;
  isActive: boolean;
}

export interface ShiftTemplate {
  _id: string;
  school: string;
  name: string;
  shift: "matutino" | "vespertino";
  startTime: string;
  endTime: string;
  moduleDurationMinutes: number;
  timeBlocks: TimeBlock[];
  gracePeriodMinutes: number;
  isActive: boolean;
}

export interface TimeBlock {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  order: number;
}

export interface ClassSchedule {
  _id: string;
  school: string;
  school_year_id: string | SchoolYear;
  group_id: string | Group;
  subject_id: string | Subject;
  teacher_id: string | User;
  school_shift_id: string | SchoolShift;
  scheduleSlots: ScheduleSlot[];
  classroom?: string;
  isActive: boolean;
}

export interface ScheduleSlot {
  dayOfWeek: number;
  timeBlockRefs: string[];
  classroom?: string;
}

export interface GradingPeriod {
  _id: string;
  school: string;
  school_year_id: string | SchoolYear;
  name: string;
  order: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface SchoolCalendarEntry {
  _id: string;
  school: string;
  school_year_id: string | SchoolYear;
  date: string;
  type:
    | "holiday"
    | "vacation"
    | "suspension"
    | "non_lectivo"
    | "special_schedule";
  name?: string;
  is_active: boolean;
  // Solo aplican cuando type === "special_schedule" (día lectivo con horario
  // modificado). El cron usa estos valores para ajustar el cutoff de entrada
  // y el chequeo de salida. Al menos uno de los dos debe estar presente.
  special_entry_time?: string | null; // "HH:mm"
  special_exit_time?: string | null; // "HH:mm"
}

// Auth types
export interface AuthResponse {
  user: User;
  authToken: string;
  refreshToken?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  reason?: string;
  errors?: Record<string, string[]>;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  pages?: number;
}

// API Error
export interface ApiError {
  status: number;
  message: string;
  reason?: string;
}

// =====================================================================
// Área del prefecto (/prefect/*)
// Shapes verificados contra prod (2026-10-19) con la cuenta prefect.
// =====================================================================

// GET /api/prefect/dashboard (shape verificado en prod).
export interface PrefectDashboardData {
  prefect: {
    name: string;
    fullName?: string;
    phoneNumber?: string;
    role: string;
    sex?: string | null;
  };
  school: {
    name: string;
    cct?: string;
    logoUrl?: string | null;
    cycle?: string;
    school_year_id?: string;
  };
  currentDate: string;
  stats: {
    totalStudents: number;
    maleCount: number;
    femaleCount: number;
    totalGroups: number;
    dayPresent: number;
    dayRetard: number;
    dayAbsent: number;
    dayTotal: number;
  };
  recentAnnouncements: DashboardAnnouncementItem[];
  pendingCitationsCount: number;
  recentConductLogs: DashboardConductLogItem[];
}

export interface DashboardAnnouncementItem {
  _id: string;
  title: string;
  message: string;
  sender?: string;
  priority: "informative" | "urgent";
}

export interface DashboardConductLogItem {
  _id?: string;
  studentName?: string;
  eventType: string;
  description: string;
  createdAt?: string;
}

// GET /api/prefect/groups-summary → { groups: GroupSummaryItem[] }
// (shape verificado en prod: label "1°A", demeritCount/meritCount).
export interface GroupSummaryItem {
  _id: string;
  label: string;
  grade: number;
  section: string;
  shift?: string;
  studentCount: number;
  maleCount: number;
  femaleCount: number;
  conductReportCount: number;
  demeritCount: number;
  meritCount: number;
  attendedToday: number;
  attendanceRate: number;
}

// GET /api/prefect/teachers → { teachers: TeacherListItem[] }
// (shape verificado en prod).
export interface TeacherListItem {
  _id: string;
  name: string;
  last_name: string;
  phoneNumber?: string;
  totalHours?: number;
}

// GET /api/prefect/teachers/:id — detalle (teacher + subjects +
// assignedGroups). Campos con `?` donde el shape puede variar.
export interface TeacherDetailItem {
  _id: string;
  name: string;
  last_name: string;
  phoneNumber?: string;
  email?: string;
  totalHours?: number;
  subjects?: Array<{ _id?: string; name?: string; color?: string; icon?: string }>;
  assignedGroups?: Array<{ _id: string; grade?: number; section?: string; label?: string }>;
}

// GET /api/prefect/teacher-schedule/:id → horario semanal.
export interface TeacherScheduleData {
  schedule?: Record<string, ScheduleSlotItem[]>;
  weeklyHours?: number;
  groupsCount?: number;
}

export interface ScheduleSlotItem {
  subject?: string;
  group?: string;
  startTime?: string;
  endTime?: string;
  classroom?: string;
}

// GET /api/prefect/school-absences (shape verificado en prod).
export interface SchoolAbsencesData {
  summary: { totalAbsences: number; affectedStudents: number };
  topAbsentStudents: Array<{
    rank?: number;
    fullName: string;
    group?: string;
    controlNumber?: string;
    absenceCount: number;
  }>;
}

// GET /api/students (items) — ficha del alumno para el prefecto.
// (El student trae guardians/health_inclusion/current_group_id — el
// current_group_id puede venir poblado o como id crudo según el
// endpoint; los consumidores toleran ambos.)
export interface PrefectStudent {
  _id: string;
  controlNumber?: string;
  first_name: string;
  last_name: string;
  sex?: string | null;
  curp?: string;
  photoUrl?: string | null;
  status?: string;
  bloodType?: string;
  address?: string;
  birthDate?: string;
  medical_notes?: string;
  health_inclusion?: unknown;
  guardians?: PrefectStudentGuardian[];
  current_group_id?: string | { _id: string; grade?: number; section?: string } | null;
  workshop_group_id?: string | null;
}

export interface PrefectStudentGuardian {
  _id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phoneNumber?: string;
  relationship?: string;
  is_legal_tutor?: boolean;
}

// GET /api/conduct-config → pesos para el score de conducta.
export interface ConductConfig {
  weights?: Record<string, number>;
  merit_points?: number;
  baseline: number;
  floor?: number;
}

// GET /api/conduct-logs (items) — reportes de conducta.
export interface ConductLogItem {
  _id: string;
  student_id?: PrefectStudent | string;
  eventType: "demerit" | "merit" | string;
  severity?: string;
  description: string;
  points_impact?: number;
  status?: "active" | "cancelled" | string;
  reported_by?: { _id?: string; name?: string; last_name?: string; role?: string } | string;
  school_year_id?: string;
  createdAt?: string;
}

// GET /api/citations (items) — citatorios.
export interface CitationItem {
  _id: string;
  student?: PrefectStudent | string;
  group?: string | { _id: string; grade?: number; section?: string };
  subject?: string | null;
  type: "behavioral" | "administrative" | "academic" | string;
  status: "pending" | "confirmed" | "no_show" | "completed" | "cancelled" | "expired" | string;
  reason: string;
  location?: string;
  scheduledDate?: string;
  creator?: { _id?: string; name?: string; last_name?: string; role?: string } | string;
  createdAt?: string;
  history?: Array<{
    status?: string;
    event?: string;
    timestamp?: string;
    actor?: unknown;
    note?: string;
    reason?: string;
  }>;
}

// GET /api/announcements (items) — avisos.
export interface AnnouncementItem {
  _id: string;
  title: string;
  message: string;
  priority: "informative" | "urgent" | string;
  targetType?: "general" | "group" | "student" | string;
  targetGroups?: Array<string | { _id: string; grade?: number; section?: string }>;
  targetStudents?: Array<string | PrefectStudent>;
  sender?: { _id?: string; name?: string; last_name?: string; role?: string } | string;
  createdAt?: string;
  expiresAt?: string | null;
  readCount?: number;
  totalRecipients?: number;
}

// GET /api/exit-passes → { success, data: ExitPassItem[], pagination }.
export interface ExitPassItem {
  _id: string;
  student?: PrefectStudent | string;
  guardian_name: string;
  relationship?: string;
  reason: string;
  reason_detail?: string;
  createdAt?: string;
  exit_time?: string;
  registered_by?: { _id?: string; name?: string; last_name?: string; role?: string } | string;
}

