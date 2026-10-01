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
