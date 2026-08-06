import api from "../lib/api";

export type NonAcademicDesignation =
  | "lab_assistant"
  | "librarian"
  | "office_staff"
  | "development_officer"
  | "it_officer"
  | "security"
  | "minor_employee";

export type NonAcademicEmploymentStatus = "active" | "resigned" | "transferred";

export const NON_ACADEMIC_DESIGNATIONS: { value: NonAcademicDesignation; label: string }[] = [
  { value: "lab_assistant", label: "Lab Assistant" },
  { value: "librarian", label: "Librarian" },
  { value: "office_staff", label: "Office Staff" },
  { value: "development_officer", label: "Development Officer" },
  { value: "it_officer", label: "IT Officer" },
  { value: "security", label: "Security" },
  { value: "minor_employee", label: "Minor Employee" },
];

// Matches db.NonAcademicStaff JSON shape returned by the backend
export interface NonAcademicStaff {
  id: string;
  full_name: string;
  employee_number: string;
  designation: NonAcademicDesignation;
  phone: string | null;
  joined_date: string | null;
  gender: "male" | "female" | null;
  house_id: string | null;
  employment_status: NonAcademicEmploymentStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateNonAcademicStaffRequest {
  full_name: string;
  designation: NonAcademicDesignation;
  phone?: string;
  joined_date: string; // RFC3339 timestamp
  gender?: "male" | "female";
  house_id?: string;
}

export interface UpdateNonAcademicStaffRequest {
  full_name: string;
  designation: NonAcademicDesignation;
  phone?: string;
  gender?: "male" | "female";
}

export const nonAcademicStaffApi = {
  list: (search?: string, designation?: string) =>
    api
      .get<NonAcademicStaff[]>("/non-academic-staff", {
        params: {
          ...(search ? { search } : {}),
          ...(designation ? { designation } : {}),
        },
      })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<NonAcademicStaff>(`/non-academic-staff/${id}`).then((r) => r.data),

  create: (data: CreateNonAcademicStaffRequest) =>
    api.post<NonAcademicStaff>("/non-academic-staff", data).then((r) => r.data),

  update: (id: string, data: UpdateNonAcademicStaffRequest) =>
    api.put<NonAcademicStaff>(`/non-academic-staff/${id}`, data).then((r) => r.data),

  updateEmploymentStatus: (id: string, status: NonAcademicEmploymentStatus) =>
    api
      .put<NonAcademicStaff>(`/non-academic-staff/${id}/employment-status`, { status })
      .then((r) => r.data),

  updateHouse: (id: string, houseId: string) =>
    api
      .put<NonAcademicStaff>(`/non-academic-staff/${id}/house`, { house_id: houseId })
      .then((r) => r.data),

  remove: (id: string) => api.delete(`/non-academic-staff/${id}`).then((r) => r.data),
};
