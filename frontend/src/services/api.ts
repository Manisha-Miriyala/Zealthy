import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  total_appointments?: number;
  total_prescriptions?: number;
  next_appointment?: Appointment;
  appointments?: Appointment[];
  prescriptions?: Prescription[];
}

export interface Appointment {
  id: string;
  user_id: string;
  provider: string;
  datetime: string;
  repeat: 'weekly' | 'monthly' | 'none';
  is_active: boolean;
  series_end_date?: string | null;
}

export interface Prescription {
  id: string;
  user_id: string;
  medication: string;
  dosage: string;
  quantity: number;
  refill_on: string;
  refill_schedule: string;
  is_active: boolean;
}

export interface Provider {
  id: string;
  name: string;
  specialty?: string;
  is_active: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosages: string[];
  is_active: boolean;
}

export interface PatientDashboard {
  patient: User;
  upcoming_appointments: Appointment[];
  upcoming_refills: Prescription[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
};

// ── Patient (admin) ───────────────────────────────────────────────────────────

export const patientAPI = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get('/admin/patients');
    return res.data;
  },

  getById: async (id: string): Promise<User> => {
    const res = await api.get(`/admin/patients/${id}`);
    return res.data;
  },

  create: async (data: { name: string; email: string; password: string }): Promise<User> => {
    const res = await api.post('/admin/patients', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; email?: string; password?: string }): Promise<User> => {
    const res = await api.put(`/admin/patients/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/patients/${id}`);
  },
};

// ── Appointments (admin) ──────────────────────────────────────────────────────

export const appointmentAPI = {
  create: async (userId: string, data: { provider: string; datetime: string; repeat: string; series_end_date?: string }): Promise<Appointment> => {
    const res = await api.post(`/admin/patients/${userId}/appointments`, data);
    return res.data;
  },

  update: async (userId: string, aptId: string, data: Partial<Appointment>): Promise<Appointment> => {
    const res = await api.put(`/admin/patients/${userId}/appointments/${aptId}`, data);
    return res.data;
  },

  deactivate: async (userId: string, aptId: string): Promise<void> => {
    await api.delete(`/admin/patients/${userId}/appointments/${aptId}`);
  },

  getAvailability: async (provider: string, date: string): Promise<{ provider: string; date: string; available_slots: string[] }> => {
    const res = await api.get(`/appointments/availability/${encodeURIComponent(provider)}?date=${date}`);
    return res.data;
  },
};

// ── Prescriptions (admin) ─────────────────────────────────────────────────────

export const prescriptionAPI = {
  create: async (userId: string, data: { medication: string; dosage: string; quantity: number; refill_on: string; refill_schedule: string }): Promise<Prescription> => {
    const res = await api.post(`/admin/patients/${userId}/prescriptions`, data);
    return res.data;
  },

  update: async (userId: string, presId: string, data: Partial<Prescription>): Promise<Prescription> => {
    const res = await api.put(`/admin/patients/${userId}/prescriptions/${presId}`, data);
    return res.data;
  },

  delete: async (userId: string, presId: string): Promise<void> => {
    await api.delete(`/admin/patients/${userId}/prescriptions/${presId}`);
  },
};

// ── Providers ─────────────────────────────────────────────────────────────────

export const providerAPI = {
  getAll: async (): Promise<Provider[]> => {
    const res = await api.get('/admin/providers');
    return res.data;
  },

  create: async (data: { name: string; specialty?: string }): Promise<Provider> => {
    const res = await api.post('/admin/providers', data);
    return res.data;
  },
};

// ── Medications ───────────────────────────────────────────────────────────────

export const medicationAPI = {
  getAll: async (): Promise<Medication[]> => {
    const res = await api.get('/admin/medications');
    return res.data;
  },

  create: async (data: { name: string; dosages: string[] }): Promise<Medication> => {
    const res = await api.post('/admin/medications', data);
    return res.data;
  },
};

// ── Patient portal (JWT-protected) ───────────────────────────────────────────

export const portalAPI = {
  getDashboard: async (): Promise<PatientDashboard> => {
    const res = await api.get('/patient/dashboard');
    return res.data;
  },

  getAppointments: async (): Promise<Appointment[]> => {
    const res = await api.get('/patient/appointments');
    return res.data;
  },

  getPrescriptions: async (): Promise<Prescription[]> => {
    const res = await api.get('/patient/prescriptions');
    return res.data;
  },
};

export default api;
