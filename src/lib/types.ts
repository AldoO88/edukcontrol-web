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
  // Correo opcional del Apple ID (capturado en el registro de papás;
  // es lo que consulta Sign in with Apple vía User.email). Puede venir
  // null y el User asociado puede tener el correo aunque esta ficha
  // no (vínculo manual previo por soporte).
  email?: string | null;
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
  // OJO (fix 2026-11-01): `user_id.isActive` NACE `true` en toda
  // cuenta nueva — NO indica que el tutor haya activado. Para eso
  // está `password_set` (abajo).
  user_id?: string | {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  };
  // Derivado por GET /api/guardians: true = el tutor YA fijó su
  // contraseña (activó vía OTP). false = User existe pero sin
  // password (nunca activó) o sin cuenta. Nunca viene el hash.
  password_set?: boolean;
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
    // name = `${user.name} ${user.last_name}` compuesto en el backend
    // (NO es solo el nombre de pila — el perfil usa fullName/name tal cual).
    name: string;
    fullName?: string;
    email?: string;
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

// GET /api/prefect/teachers/:id — shape VERIFICADO en prod:
// { teacher, subjects, assignedGroups } (anidado, no plano).
export interface TeacherDetailData {
  teacher: {
    _id: string;
    name: string;
    last_name: string;
    phoneNumber?: string;
    email?: string;
  };
  subjects: Array<{ _id: string; name: string; code?: string; color?: string; icon?: string }>;
  assignedGroups: Array<{ _id: string; label: string }>;
}

// Slot del HORARIO DE UN GRUPO (GET /api/groups/:id/schedule →
// { group, shift_info, schedule }). Shape plano del backend con
// start/end como "HH:MM" y materia/maestro como strings.
export interface GroupScheduleSlot {
  type?: "receso" | string; // receso = slot de descanso
  subject?: string;
  teacher?: string;
  start?: string;
  end?: string;
  // Minutos desde medianoche (07:30 → 450) — los manda el endpoint de
  // horario del grupo (verificado en prod); evitan parsear "HH:MM".
  startMinutes?: number;
  endMinutes?: number;
  color?: string;
  icon?: string;
  classroom?: string;
  block_count?: number;
  // Nombres de los módulos que abarca el slot ("Modulo 3", "Modulo 4")
  // — clave para derivar la columna "Módulo" de la tabla horaria.
  block_names?: string[];
  classificationType?: "DISCIPLINE" | "TALLER" | string;
  is_taller?: boolean;
}

export interface GroupScheduleData {
  group: {
    _id: string;
    grade: number;
    section: string;
    label: string;
    shift?: string;
    type?: string;
  };
  shift_info?: { name?: string; start?: string; end?: string };
  schedule: Record<string, GroupScheduleSlot[]>; // key = día 1..7
}

// GET /api/prefect/teacher-schedule/:id — { teacher, schedule,
// dayNames, stats }. Los slots anidan subject/group poblados.
export interface TeacherScheduleSlot {
  subject?: { _id?: string; name?: string; color?: string; icon?: string } | string;
  subject_name?: string;
  group?: { _id?: string; grade?: number; section?: string } | null;
  classroom?: string;
  startTime?: string;
  endTime?: string;
  startMinutes?: number;
  endMinutes?: number;
  timeBlocks?: Array<{ startTime?: string; endTime?: string }>;
}

export interface TeacherScheduleData {
  teacher?: { _id?: string; name?: string; last_name?: string };
  schedule?: Record<string, TeacherScheduleSlot[]>; // key = día 1..7
  dayNames?: string[];
  stats?: { weeklyHours?: number; groupsCount?: number };
}

// GET /api/prefect/school-absences (shape verificado contra el
// backend: { rank, _id, fullName, controlNumber, group, absenceCount }).
export interface SchoolAbsencesData {
  summary: { totalAbsences: number; affectedStudents: number };
  topAbsentStudents: Array<{
    rank?: number;
    _id: string;
    fullName: string;
    group?: string | null;
    controlNumber?: string | null;
    absenceCount: number;
  }>;
}

// GET /api/students (items) — ficha del alumno para el prefecto.
// Campos de persona con los nombres REALES del modelo
// (blood_type / date_of_birth en snake_case, igual que en la app).
export interface PrefectStudent {
  _id: string;
  controlNumber?: string;
  first_name: string;
  last_name: string;
  sex?: string | null;
  curp?: string;
  photoUrl?: string | null;
  status?: string;
  blood_type?: string;
  address?: string;
  date_of_birth?: string;
  medical_notes?: string;
  phone?: string;
  health_inclusion?: HealthInclusion | null;
  guardians?: PrefectStudentGuardian[];
  current_group_id?: string | { _id: string; grade?: number; section?: string } | null;
  workshop_group_id?: string | null;
  // Estado del expediente (sección web del trabajador social —
  // campos nuevos en Student; los lee GET /api/social-worker/expedientes
  // y GET /api/students/:id).
  expediente_status?: ExpedienteStatus;
  expediente_last_saved_at?: string | null;
  expediente_completed_at?: string | null;
}

// Tutor/guardián (en el modelo usan `name` + `lastname`, no
// first_name/last_name — ver ficha de la app).
export interface PrefectStudentGuardian {
  _id?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  phoneNumber?: string;
  relationship?: string;
  is_legal_tutor?: boolean;
}

// health_inclusion del alumno (modal Trabajo Social — mismos campos
// que TrabajoSocialModal.jsx de la app; la sección web del expediente
// además escribe family_socioeconomic, emergency_contacts, home_visits,
// notes y alerts — ver TAB_FIELDS de student-health/[studentId].jsx).
export interface HealthInclusion {
  learning_style?: string;
  style_hint?: string;
  diagnosis?: string;
  disability_type?: string;
  disability_severity?: string;
  medical_conditions?: string[];
  medications?: string[];
  allergies?: string;
  health_insurance?: string;
  vaccination_authorization?: boolean;
  protection_civil_authorization?: boolean;
  // Datos familiares y socioeconómicos (sección Familia)
  family_socioeconomic?: FamilySocioeconomic;
  // Contactos de emergencia (sección Emergencia)
  emergency_contacts?: EmergencyContact[];
  // Visitas domiciliarias (sección Intervenciones)
  home_visits?: HomeVisit[];
  // Notas / alertas (sección Notas)
  notes?: string;
  last_evaluation_date?: string;
  alerts?: HealthAlert[];
}

// Miembro del hogar (subdoc de family_socioeconomic.family_members).
export interface FamilyMember {
  name?: string;
  relationship?: string;
  age?: number;
  occupation?: string;
  education_level?: string;
}

export interface FamilySocioeconomic {
  family_members?: FamilyMember[];
  family_dynamics?: string;
  monthly_income?: string;
  income_sources?: string;
  housing_type?: string;
  housing_materials?: string;
  basic_services?: string;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
  is_primary?: boolean;
}

export interface HomeVisit {
  date?: string; // ISO
  observations?: string;
  // El backend admite null (visitas nuevas lo guardan así).
  conducted_by?: string | { _id: string; name?: string; last_name?: string } | null;
}

export interface HealthAlert {
  _id?: string;
  type?: "medica" | "comportamental" | "academica" | "otra" | string;
  label?: string;
  description?: string;
}

// Envoltorio paginado de GET /api/students y /api/citations,
// /api/conduct-logs, /api/announcements ({ items, total, page, limit, pages }).
export interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Registro de asistencia (GET /api/attendance/logs → { items, ... }).
// status: presente = on_time | late; falta = absent; sin registro = sin log.
export interface AttendanceLogItem {
  _id?: string;
  student_id?: PrefectStudent | string;
  event_type?: "entry" | "exit" | string;
  status: "on_time" | "late" | "absent" | string;
  timestamp?: string;
  createdAt?: string;
}

// GET /api/attendance/day-detail?date=YYYY-MM-DD — un renglón por alumno
// activo, mergeando los primeros taps entry/exit del día (shape del
// controller getDayDetailController; lo consumen el monitoreo admin y
// el drill-down "Asistencia de hoy" del prefecto en la web).
export interface AttendanceDayRow {
  student: {
    id: string;
    controlNumber?: string | null;
    first_name: string;
    last_name: string;
    photoUrl?: string | null; // URL pública de Cloudinary
  };
  group: { id: string; label: string; type: "regular" | "taller" } | null;
  entry_time: string | null; // ISO UTC — null si no hubo tap (o si fue falta del cron)
  exit_time: string | null; // ISO UTC
  status: "present" | "late" | "absent" | "no_record";
  justified: boolean;
}

export interface AttendanceDayDetail {
  date: string; // YYYY-MM-DD (día calendario usado en la query)
  summary: { present: number; late: number; absent: number; no_record: number };
  students: AttendanceDayRow[];
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
  type: "behavioral" | "administrative" | "academic" | string;
  status: "pending" | "confirmed" | "no_show" | "completed" | "cancelled" | "expired" | string;
  reason: string;
  // subject puede venir como string crudo o poblado { name } (lo lee
  // el modal de citatorios con citation.subject?.name).
  subject?: string | { name?: string } | null;
  location?: string;
  scheduledDate?: string;
  // groupName denormalizado por el backend (lo lee normalizeCitation).
  groupName?: string;
  creator?: {
    _id?: string;
    name?: string;
    last_name?: string;
    fullName?: string;
    role?: string;
    sex?: string;
  } | string;
  createdAt?: string;
  history?: Array<{
    status?: string;
    event?: string;
    timestamp?: string;
    actor?: unknown;
    note?: string;
    reason?: string;
  }>;
  // Solicitud de reagendar hecha por el tutor (banner ámbar del detalle).
  rescheduleRequested?: boolean;
  rescheduleReason?: string;
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
  sender?: { _id?: string; name?: string; last_name?: string; fullName?: string; role?: string; sex?: string } | string;
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
  // Quien registró el pase (el detalle usa created_by con su rol).
  created_by?: { _id?: string; name?: string; last_name?: string; fullName?: string; role?: string } | string;
}

// GET /api/exit-passes → envoltorio real { success, data, pagination }.
export interface ExitPassListResponse {
  success?: boolean;
  data: ExitPassItem[];
  pagination?: { total: number; page?: number; limit?: number };
}


// =====================================================================
// ÁREA DEL TRABAJADOR SOCIAL (/social-worker/*)
// =====================================================================

// Estado del expediente de un alumno (Student.expediente_status).
// "pending" nace por defecto; "in_progress" lo setea el backend solo
// al guardar datos; "completed" lo marca el trabajador social a mano.
export type ExpedienteStatus = "pending" | "in_progress" | "completed";

// GET /api/social-worker/expedientes → ítem del padrón del ciclo.
export interface ExpedienteItem {
  student_id: string;
  first_name: string;
  last_name: string;
  controlNumber?: string | null;
  photoUrl?: string | null;
  group: {
    _id: string | null;
    grade: number | null;
    section: string | null;
    label: string | null; // "1A"
  };
  expediente_status: ExpedienteStatus;
  expediente_last_saved_at?: string | null;
  expediente_completed_at?: string | null;
  alerts_count: number;
}

// Contadores globales (barra de progreso — sin filtros, siempre es
// el avance de TODA la escuela).
export interface ExpedientesSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

// GET /api/social-worker/expedientes (con ?summary_only=1 solo viene summary).
export interface ExpedientesResponse {
  items?: ExpedienteItem[];
  summary: ExpedientesSummary;
}

// PATCH /api/social-worker/students/:id/expediente-status → data.
export interface ExpedienteStatusData {
  studentId: string;
  expedienteStatus: ExpedienteStatus;
  expedienteCompletedAt?: string | null;
}

// GET /api/social-worker/dashboard — mismo shape que el del prefecto
// pero con `socialWorker` en vez de `prefect`.
export interface SocialWorkerDashboardData {
  socialWorker: {
    name: string;
    fullName?: string;
    email?: string;
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

// Acuerdo con padres (ParentAgreement — sección Intervenciones).
// GET /api/social-worker/students/:id/agreements → array plano.
export interface ParentAgreementItem {
  _id: string;
  student_id?: string;
  title: string;
  description?: string;
  agreement_type?: "conducta" | "academico" | "salud" | "inclusion" | "otro" | string;
  status?: "active" | "completed" | "cancelled" | string;
  agreed_date?: string;
  review_date?: string | null;
  notes?: string;
  reported_by?: { _id?: string; name?: string; last_name?: string; role?: string } | string;
}

// Canalización externa (InstitutionReferral — sección Intervenciones).
// GET /api/social-worker/students/:id/referrals → array plano.
export interface InstitutionReferralItem {
  _id: string;
  student_id?: string;
  institution_name: string;
  institution_type?:
    | "hospital"
    | "clinica"
    | "psicologia"
    | "terapia"
    | "trabajo_social"
    | "educacion_especial"
    | "otro"
    | string;
  contact_info?: string;
  reason: string;
  status?: "pending" | "sent" | "in_progress" | "completed" | "cancelled" | string;
  referral_date?: string;
  response_date?: string | null;
  response_notes?: string;
  reported_by?: { _id?: string; name?: string; last_name?: string; role?: string } | string;
}
