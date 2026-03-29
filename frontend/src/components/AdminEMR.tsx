import React, { useState, useEffect, useCallback } from 'react';
import {
  patientAPI, appointmentAPI, prescriptionAPI, providerAPI, medicationAPI,
  User, Provider, Medication,
} from '../services/api';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDatetime(dt: string) {
  try {
    return new Date(dt).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function fmtDate(d: string) {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit';
type ModalKind = 'patient' | 'appointment' | 'prescription' | 'provider' | 'medication';

interface PatientForm { name: string; email: string; password: string }
interface AptForm     { provider: string; datetime: string; repeat: string; series_end_date: string }
interface RxForm      { medication: string; dosage: string; quantity: number; refill_on: string; refill_schedule: string }
interface ProvForm    { name: string; specialty: string }
interface MedForm     { name: string; dosages: string }  // dosages as comma-sep string

const emptyPatient: PatientForm = { name: '', email: '', password: '' };
const emptyApt: AptForm     = { provider: '', datetime: '', repeat: 'none', series_end_date: '' };
const emptyRx: RxForm       = { medication: '', dosage: '', quantity: 1, refill_on: '', refill_schedule: 'monthly' };
const emptyProv: ProvForm   = { name: '', specialty: '' };
const emptyMed: MedForm     = { name: '', dosages: '' };

const SPECIALTIES = [
  'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
  'General Practice', 'Neurology', 'Oncology', 'Orthopedics',
  'Pediatrics', 'Psychiatry', 'Urology',
];

// Global dosage list from the official sample data
const DOSAGES = ['1mg', '2mg', '3mg', '5mg', '10mg', '25mg', '50mg',
                 '100mg', '250mg', '500mg', '1000mg'];

// ── Admin credentials (demo) ───────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@zealthy.com';
const ADMIN_PASSWORD = 'Admin123!';

// ── Main Component ─────────────────────────────────────────────────────────

const AdminEMR: React.FC = () => {
  // Auth
  const [adminLoggedIn, setAdminLoggedIn] = useState(
    () => localStorage.getItem('adminLoggedIn') === 'true'
  );
  const [adminEmail, setAdminEmail]       = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  // View
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);

  // Data
  const [patients, setPatients] = useState<User[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  // UI
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalKind, setModalKind] = useState<ModalKind>('patient');
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Forms
  const [patientForm, setPatientForm] = useState<PatientForm>(emptyPatient);
  const [aptForm, setAptForm]         = useState<AptForm>(emptyApt);
  const [rxForm, setRxForm]           = useState<RxForm>(emptyRx);
  const [provForm, setProvForm]       = useState<ProvForm>(emptyProv);
  const [medForm, setMedForm]         = useState<MedForm>(emptyMed);

  // ── Admin auth ───────────────────────────────────────────────────────────

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === ADMIN_EMAIL && adminPassword === ADMIN_PASSWORD) {
      localStorage.setItem('adminLoggedIn', 'true');
      setAdminLoggedIn(true);
      setAdminLoginError('');
    } else {
      setAdminLoginError('Invalid admin credentials.');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    setAdminLoggedIn(false);
    setView('list');
  };

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      setPatients(await patientAPI.getAll());
      setError('');
    } catch {
      setError('Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProviders = useCallback(async () => {
    try { setProviders(await providerAPI.getAll()); } catch {}
  }, []);

  const loadMedications = useCallback(async () => {
    try { setMedications(await medicationAPI.getAll()); } catch {}
  }, []);

  const loadPatientDetail = useCallback(async (id: string) => {
    try {
      const p = await patientAPI.getById(id);
      setSelectedPatient(p);
    } catch {
      setError('Failed to load patient details.');
    }
  }, []);

  useEffect(() => {
    loadPatients();
    loadProviders();
    loadMedications();
  }, [loadPatients, loadProviders, loadMedications]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openModal = (kind: ModalKind, item?: any) => {
    setModalKind(kind);
    setModalMode(item ? 'edit' : 'create');
    setEditingId(item?.id ?? null);
    setModalError('');

    if (kind === 'patient') {
      setPatientForm(item
        ? { name: item.name, email: item.email, password: '' }
        : emptyPatient);
    } else if (kind === 'appointment') {
      setAptForm(item
        ? { provider: item.provider, datetime: item.datetime.slice(0, 16), repeat: item.repeat, series_end_date: item.series_end_date || '' }
        : emptyApt);
    } else if (kind === 'prescription') {
      setRxForm(item
        ? { medication: item.medication, dosage: item.dosage, quantity: item.quantity, refill_on: item.refill_on, refill_schedule: item.refill_schedule }
        : emptyRx);
    } else if (kind === 'provider') {
      setProvForm(emptyProv);
    } else if (kind === 'medication') {
      setMedForm(emptyMed);
    }

    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setModalError(''); };

  const modalTitle = () => {
    const kindLabel: Record<ModalKind, string> = {
      patient: 'Patient', appointment: 'Appointment',
      prescription: 'Prescription', provider: 'Provider', medication: 'Medication',
    };
    return `${modalMode === 'create' ? 'Add' : 'Edit'} ${kindLabel[modalKind]}`;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm('Delete this patient? This cannot be undone.')) return;
    try {
      await patientAPI.delete(id);
      loadPatients();
    } catch {
      setError('Failed to delete patient.');
    }
  };

  const handleDeactivateAppointment = async (aptId: string) => {
    if (!selectedPatient) return;
    if (!window.confirm('Deactivate this appointment?')) return;
    try {
      await appointmentAPI.deactivate(selectedPatient.id, aptId);
      loadPatientDetail(selectedPatient.id);
    } catch {
      setError('Failed to deactivate appointment.');
    }
  };

  const handleDeletePrescription = async (presId: string) => {
    if (!selectedPatient) return;
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await prescriptionAPI.delete(selectedPatient.id, presId);
      loadPatientDetail(selectedPatient.id);
    } catch {
      setError('Failed to delete prescription.');
    }
  };

  // ── Form submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      if (modalKind === 'patient') {
        if (modalMode === 'create') {
          await patientAPI.create(patientForm);
        } else if (editingId) {
          const upd: any = { name: patientForm.name, email: patientForm.email };
          if (patientForm.password) upd.password = patientForm.password;
          await patientAPI.update(editingId, upd);
          if (selectedPatient?.id === editingId) loadPatientDetail(editingId);
        }
        loadPatients();

      } else if (modalKind === 'appointment' && selectedPatient) {
        const payload = {
          provider: aptForm.provider,
          datetime: aptForm.datetime,
          repeat: aptForm.repeat as 'weekly' | 'monthly' | 'none',
          series_end_date: aptForm.series_end_date || undefined,
        };
        if (modalMode === 'create') {
          await appointmentAPI.create(selectedPatient.id, payload);
        } else if (editingId) {
          await appointmentAPI.update(selectedPatient.id, editingId, payload);
        }
        loadPatientDetail(selectedPatient.id);

      } else if (modalKind === 'prescription' && selectedPatient) {
        const payload = { ...rxForm };
        if (modalMode === 'create') {
          await prescriptionAPI.create(selectedPatient.id, payload);
        } else if (editingId) {
          await prescriptionAPI.update(selectedPatient.id, editingId, payload);
        }
        loadPatientDetail(selectedPatient.id);

      } else if (modalKind === 'provider') {
        await providerAPI.create({ name: provForm.name, specialty: provForm.specialty || undefined });
        loadProviders();

      } else if (modalKind === 'medication') {
        const dosages = medForm.dosages.split(',').map(d => d.trim()).filter(Boolean);
        await medicationAPI.create({ name: medForm.name, dosages });
        loadMedications();
      }

      closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Filtered patients ────────────────────────────────────────────────────

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Render: Admin Login ───────────────────────────────────────────────────

  if (!adminLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="brand-mark">⚕</div>
            <h1>Zealthy</h1>
            <p>Admin Portal — sign in to continue</p>
          </div>

          <form onSubmit={handleAdminLogin}>
            {adminLoginError && <div className="alert alert-error">⚠ {adminLoginError}</div>}
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input
                className="form-control"
                type="email"
                required
                autoComplete="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@zealthy.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                required
                autoComplete="current-password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              Sign In to Admin
            </button>
          </form>

          <div className="demo-creds">
            <strong>Demo Admin Credentials</strong>
            <div className="demo-cred-row">
              <span>Admin</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <code>{ADMIN_EMAIL}</code>
                <span>/</span>
                <code>{ADMIN_PASSWORD}</code>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => { setAdminEmail(ADMIN_EMAIL); setAdminPassword(ADMIN_PASSWORD); }}
                >
                  Use
                </button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a href="/" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              ← Back to Patient Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Patient List View ─────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div>
        {/* Nav */}
        <nav className="top-nav">
          <div className="brand">
            <div className="brand-icon">⚕</div>
            Zealthy
          </div>
          <div className="nav-divider" />
          <span className="page-title">Mini EMR</span>
          <div className="spacer" />
          <div className="nav-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('medication')}>
              + Medication
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => openModal('provider')}>
              + Provider
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => openModal('patient')}>
              + New Patient
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleAdminLogout}>
              Sign Out
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="page-content">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          <div className="page-header">
            <div className="page-header-left">
              <h1>Patients</h1>
              <p className="text-muted">Manage patient records, appointments, and prescriptions</p>
            </div>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /> Loading patients…</div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <p>{searchTerm ? 'No patients match your search.' : 'No patients yet. Add your first patient.'}</p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Email</th>
                      <th>Appointments</th>
                      <th>Prescriptions</th>
                      <th>Next Appointment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(patient => (
                      <tr key={patient.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: 'var(--primary-light)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 600, color: 'var(--primary)', flexShrink: 0,
                            }}>
                              {patient.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500 }}>{patient.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{patient.email}</td>
                        <td>
                          <span className="badge badge-blue">{patient.total_appointments ?? 0}</span>
                        </td>
                        <td>
                          <span className="badge badge-green">{patient.total_prescriptions ?? 0}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {patient.next_appointment
                            ? fmtDatetime(patient.next_appointment.datetime)
                            : <span style={{ color: 'var(--text-light)' }}>None scheduled</span>}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { loadPatientDetail(patient.id); setView('detail'); }}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeletePatient(patient.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {showModal && <Modal title={modalTitle()} onClose={closeModal}>
          {renderForm(modalKind)}
        </Modal>}
      </div>
    );
  }

  // ── Render: Patient Detail View ───────────────────────────────────────────

  if (view === 'detail' && selectedPatient) {
    return (
      <div>
        {/* Nav */}
        <nav className="top-nav">
          <div className="brand">
            <div className="brand-icon">⚕</div>
            Zealthy
          </div>
          <div className="nav-divider" />
          <span className="page-title">Patient Record</span>
          <div className="spacer" />
          <div className="nav-actions">
            <button className="btn btn-ghost btn-sm" onClick={handleAdminLogout}>
              Sign Out
            </button>
          </div>
        </nav>

        <div className="page-content">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          <button className="back-link" onClick={() => { setView('list'); setError(''); }}>
            ← Back to Patients
          </button>

          {/* Patient info */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--primary-light)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: 'var(--primary)',
                }}>
                  {selectedPatient.name.charAt(0).toUpperCase()}
                </div>
                {selectedPatient.name}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => openModal('patient', selectedPatient)}>
                ✏ Edit Patient
              </button>
            </div>
            <div className="info-grid">
              <span className="info-label">Name</span>
              <span className="info-value">{selectedPatient.name}</span>
              <span className="info-label">Email</span>
              <span className="info-value">{selectedPatient.email}</span>
            </div>
          </div>

          {/* Appointments */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>📅 Appointments</h3>
              <button className="btn btn-primary btn-sm" onClick={() => openModal('appointment')}>
                + Add Appointment
              </button>
            </div>

            {!selectedPatient.appointments?.length ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>No appointments yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Date & Time</th>
                      <th>Repeat</th>
                      <th>Series End</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPatient.appointments.map(apt => (
                      <tr key={apt.id}>
                        <td style={{ fontWeight: 500 }}>{apt.provider}</td>
                        <td>{fmtDatetime(apt.datetime)}</td>
                        <td>
                          <span className={`badge ${apt.repeat === 'none' ? 'badge-gray' : 'badge-blue'}`}>
                            {apt.repeat}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {apt.series_end_date ? fmtDate(apt.series_end_date) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${apt.is_active ? 'badge-green' : 'badge-gray'}`}>
                            {apt.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => openModal('appointment', apt)}>
                              Edit
                            </button>
                            {apt.is_active && (
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeactivateAppointment(apt.id)}>
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Prescriptions */}
          <div className="card">
            <div className="card-header">
              <h3>💊 Prescriptions</h3>
              <button className="btn btn-primary btn-sm" onClick={() => openModal('prescription')}>
                + Add Prescription
              </button>
            </div>

            {!selectedPatient.prescriptions?.length ? (
              <div className="empty-state">
                <div className="empty-icon">💊</div>
                <p>No prescriptions yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Qty</th>
                      <th>Next Refill</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPatient.prescriptions.map(rx => (
                      <tr key={rx.id}>
                        <td style={{ fontWeight: 500 }}>{rx.medication}</td>
                        <td><span className="badge badge-purple">{rx.dosage}</span></td>
                        <td>{rx.quantity}</td>
                        <td>{fmtDate(rx.refill_on)}</td>
                        <td>
                          <span className="badge badge-amber">{rx.refill_schedule}</span>
                        </td>
                        <td>
                          <span className={`badge ${rx.is_active ? 'badge-green' : 'badge-gray'}`}>
                            {rx.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => openModal('prescription', rx)}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeletePrescription(rx.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showModal && <Modal title={modalTitle()} onClose={closeModal}>
          {renderForm(modalKind)}
        </Modal>}
      </div>
    );
  }

  return null;

  // ── Form renderers ─────────────────────────────────────────────────────────

  function renderForm(kind: ModalKind) {
    return (
      <form onSubmit={handleSubmit}>
        {modalError && <div className="alert alert-error">⚠ {modalError}</div>}

        {kind === 'patient' && (
          <>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" required value={patientForm.name}
                onChange={e => setPatientForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-control" type="email" required value={patientForm.email}
                onChange={e => setPatientForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{modalMode === 'create' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
              <input className="form-control" type="password" required={modalMode === 'create'}
                value={patientForm.password}
                onChange={e => setPatientForm(p => ({ ...p, password: e.target.value }))} />
            </div>
          </>
        )}

        {kind === 'appointment' && (
          <>
            <div className="form-group">
              <label className="form-label">Provider *</label>
              <select className="form-control" required value={aptForm.provider}
                onChange={e => setAptForm(a => ({ ...a, provider: e.target.value }))}>
                <option value="">Select provider…</option>
                {providers.map(p => (
                  <option key={p.id} value={p.name}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input className="form-control" type="datetime-local" required value={aptForm.datetime}
                onChange={e => setAptForm(a => ({ ...a, datetime: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Repeat Schedule</label>
                <select className="form-control" value={aptForm.repeat}
                  onChange={e => setAptForm(a => ({ ...a, repeat: e.target.value }))}>
                  <option value="none">One-time</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Series End Date</label>
                <input className="form-control" type="date" value={aptForm.series_end_date}
                  onChange={e => setAptForm(a => ({ ...a, series_end_date: e.target.value }))}
                  placeholder="Leave empty for ongoing" />
              </div>
            </div>
          </>
        )}

        {kind === 'prescription' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Medication *</label>
                <select className="form-control" required value={rxForm.medication}
                  onChange={e => setRxForm(r => ({ ...r, medication: e.target.value, dosage: '' }))}>
                  <option value="">Select medication…</option>
                  {medications.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dosage *</label>
                <select className="form-control" required value={rxForm.dosage}
                  onChange={e => setRxForm(r => ({ ...r, dosage: e.target.value }))}>
                  <option value="">Select dosage…</option>
                  {DOSAGES.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-control" type="number" min={1} required value={rxForm.quantity}
                  onChange={e => setRxForm(r => ({ ...r, quantity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Refill Date *</label>
                <input className="form-control" type="date" required value={rxForm.refill_on}
                  onChange={e => setRxForm(r => ({ ...r, refill_on: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Refill Schedule</label>
              <select className="form-control" value={rxForm.refill_schedule}
                onChange={e => setRxForm(r => ({ ...r, refill_schedule: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </>
        )}

        {kind === 'provider' && (
          <>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" required placeholder="e.g. Dr Jane Smith"
                value={provForm.name}
                onChange={e => setProvForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Specialty</label>
              <select className="form-control" value={provForm.specialty}
                onChange={e => setProvForm(p => ({ ...p, specialty: e.target.value }))}>
                <option value="">Select specialty…</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {kind === 'medication' && (
          <>
            <div className="form-group">
              <label className="form-label">Medication Name *</label>
              <input className="form-control" required placeholder="e.g. Aspirin"
                value={medForm.name}
                onChange={e => setMedForm(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Dosages (comma-separated) *</label>
              <input className="form-control" required placeholder="e.g. 81mg, 325mg, 500mg"
                value={medForm.dosages}
                onChange={e => setMedForm(m => ({ ...m, dosages: e.target.value }))} />
              <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
                Enter multiple dosages separated by commas
              </p>
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={modalLoading}>
            {modalLoading ? 'Saving…' : (modalMode === 'create' ? 'Create' : 'Save Changes')}
          </button>
        </div>
      </form>
    );
  }
};

// ── Modal wrapper ──────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal">
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

export default AdminEMR;
