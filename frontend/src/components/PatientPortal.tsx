import React, { useState, useEffect, useCallback } from 'react';
import {
  authAPI, portalAPI, appointmentAPI, providerAPI,
  User, Appointment, Prescription, Provider, PatientDashboard, LoginResponse,
} from '../services/api';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDatetime(dt: string) {
  try {
    return new Date(dt).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function fmtDate(d: string) {
  try {
    // Handle both date-only "2026-04-02" and full datetime "2026-04-02T16:30:00"
    const dt = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtTime(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

type View = 'dashboard' | 'appointments' | 'prescriptions';

// ── Component ──────────────────────────────────────────────────────────────

const PatientPortal: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');

  // Data
  const [dashboard, setDashboard] = useState<PatientDashboard | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Booking modal
  const [showBooking, setShowBooking] = useState(false);
  const [bookProvider, setBookProvider] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookRepeat, setBookRepeat] = useState('none');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // ── Auth persistence ────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setLoggedIn(true);
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  // ── Load data when logged in ────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await portalAPI.getDashboard());
    } catch {}
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      setProviders(await providerAPI.getAll());
    } catch {}
  }, []);

  useEffect(() => {
    if (loggedIn) {
      loadDashboard();
      loadProviders();
    }
  }, [loggedIn, loadDashboard, loadProviders]);

  const loadAppointments = async () => {
    try {
      setAppointments(await portalAPI.getAppointments());
    } catch {}
  };

  const loadPrescriptions = async () => {
    try {
      setPrescriptions(await portalAPI.getPrescriptions());
    } catch {}
  };

  const handleViewChange = (v: View) => {
    setView(v);
    if (v === 'appointments') loadAppointments();
    if (v === 'prescriptions') loadPrescriptions();
  };

  // ── Login ────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res: LoginResponse = await authAPI.login(loginEmail, loginPassword);
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      setLoggedIn(true);
    } catch (err: any) {
      setLoginError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedIn(false);
    setUser(null);
    setDashboard(null);
    setView('dashboard');
  };

  // ── Appointment booking ───────────────────────────────────────────────────

  const loadSlots = async (provider: string, date: string) => {
    if (!provider || !date) return;
    setSlotsLoading(true);
    setAvailableSlots([]);
    setBookTime('');
    try {
      const res = await appointmentAPI.getAvailability(provider, date);
      setAvailableSlots(res.available_slots);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleProviderChange = (v: string) => {
    setBookProvider(v);
    loadSlots(v, bookDate);
  };

  const handleDateChange = (v: string) => {
    setBookDate(v);
    loadSlots(bookProvider, v);
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBookingLoading(true);
    setBookingError('');

    const datetime = `${bookDate}T${bookTime}`;

    try {
      // Use the admin create endpoint on behalf of the current user
      await appointmentAPI.create(user.id, {
        provider: bookProvider,
        datetime,
        repeat: bookRepeat,
      });
      setShowBooking(false);
      setBookProvider(''); setBookDate(''); setBookTime(''); setBookRepeat('none');
      setAvailableSlots([]);
      loadDashboard();
      if (view === 'appointments') loadAppointments();
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || 'Could not book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const openBooking = () => {
    setShowBooking(true);
    setBookProvider(''); setBookDate(''); setBookTime(''); setBookRepeat('none');
    setAvailableSlots([]); setBookingError('');
  };

  // ── Login page ────────────────────────────────────────────────────────────

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <img src="/zealthy-logo.svg" alt="Zealthy" style={{ height: 30, marginBottom: 16 }} />
            <p>Patient Portal — sign in to your account</p>
          </div>

          <form onSubmit={handleLogin}>
            {loginError && <div className="alert alert-error">⚠ {loginError}</div>}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-control"
                type="email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loginLoading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 4 }}>
            <a href="/admin" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
              Admin Portal →
            </a>
          </div>

          <div className="demo-creds">
            <strong>Demo Credentials</strong>
            {[
              ['Mark Johnson', 'mark@some-email-provider.net'],
              ['Lisa Smith', 'lisa@some-email-provider.net'],
            ].map(([name, email]) => (
              <div className="demo-cred-row" key={email}>
                <span>{name}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <code>{email}</code>
                  <span>/</span>
                  <code>Password123!</code>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => { setLoginEmail(email); setLoginPassword('Password123!'); }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard content ─────────────────────────────────────────────────────

  const upcomingApts  = dashboard?.upcoming_appointments ?? [];
  const upcomingRefills = dashboard?.upcoming_refills ?? [];

  return (
    <div>
      {/* Nav */}
      <nav className="top-nav">
        <div className="brand">
          <img src="/zealthy-logo.svg" alt="Zealthy" style={{ height: 18, width: 'auto' }} />
        </div>
        <div className="nav-divider" />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['dashboard', 'appointments', 'prescriptions'] as View[]).map(v => (
            <button
              key={v}
              className={`nav-tab ${view === v ? 'active' : ''}`}
              onClick={() => handleViewChange(v)}
            >
              {v === 'dashboard' ? '🏠 Dashboard'
                : v === 'appointments' ? '📅 Appointments'
                : '💊 Prescriptions'}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="nav-actions">
          <button className="btn btn-primary btn-sm" onClick={openBooking}>
            + Book Appointment
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-content">

        {/* ── Dashboard view ─────────────────────────────── */}
        {view === 'dashboard' && (
          <>
            <div className="page-header">
              <div className="page-header-left">
                <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p>Here's a summary of your upcoming health schedule.</p>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">📅</div>
                <div className="stat-info">
                  <div className="stat-value">{upcomingApts.length}</div>
                  <div className="stat-label">Appointments in next 7 days</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">💊</div>
                <div className="stat-info">
                  <div className="stat-value">{upcomingRefills.length}</div>
                  <div className="stat-label">Refills due in next 7 days</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">👤</div>
                <div className="stat-info">
                  <div className="stat-value" style={{ fontSize: 16, fontWeight: 600 }}>{user?.name}</div>
                  <div className="stat-label">{user?.email}</div>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="dashboard-grid">
              {/* Upcoming appointments */}
              <div className="card">
                <div className="card-header">
                  <h3>📅 Upcoming Appointments</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleViewChange('appointments')}>
                    View all →
                  </button>
                </div>
                {upcomingApts.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <p>No appointments in the next 7 days.</p>
                    <button className="btn btn-primary btn-sm" onClick={openBooking} style={{ marginTop: 12 }}>
                      Book Now
                    </button>
                  </div>
                ) : (
                  <div className="upcoming-list">
                    {upcomingApts.map(apt => (
                      <div key={apt.id} className="upcoming-item">
                        <div className="upcoming-item-icon blue">📅</div>
                        <div className="upcoming-item-body">
                          <div className="upcoming-item-title">{apt.provider}</div>
                          <div className="upcoming-item-sub">{fmtDatetime(apt.datetime)}</div>
                        </div>
                        {apt.repeat !== 'none' && (
                          <span className="badge badge-blue">{apt.repeat}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming refills */}
              <div className="card">
                <div className="card-header">
                  <h3>💊 Upcoming Refills</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleViewChange('prescriptions')}>
                    View all →
                  </button>
                </div>
                {upcomingRefills.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <p>No refills due in the next 7 days.</p>
                  </div>
                ) : (
                  <div className="upcoming-list">
                    {upcomingRefills.map(rx => (
                      <div key={rx.id} className="upcoming-item">
                        <div className="upcoming-item-icon amber">💊</div>
                        <div className="upcoming-item-body">
                          <div className="upcoming-item-title">{rx.medication} {rx.dosage}</div>
                          <div className="upcoming-item-sub">Refill by {fmtDate(rx.refill_on)}</div>
                        </div>
                        <span className="badge badge-amber">{rx.refill_schedule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Appointments view ───────────────────────────── */}
        {view === 'appointments' && (
          <>
            <div className="page-header">
              <div className="page-header-left">
                <h1>Appointment Schedule</h1>
                <p>Your upcoming appointments for the next 3 months (including recurring series)</p>
              </div>
              <button className="btn btn-primary" onClick={openBooking}>
                + Book Appointment
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <p>No upcoming appointments in the next 3 months.</p>
                  <button className="btn btn-primary btn-sm" onClick={openBooking} style={{ marginTop: 12 }}>
                    Book an Appointment
                  </button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(apt => (
                        <tr key={apt.id}>
                          <td style={{ fontWeight: 500 }}>{apt.provider}</td>
                          <td>{fmtDate(apt.datetime)}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{fmtTime(apt.datetime)}</td>
                          <td>
                            <span className={`badge ${apt.repeat === 'none' ? 'badge-gray' : 'badge-blue'}`}>
                              {apt.repeat === 'none' ? 'One-time' : `Recurring (${apt.repeat})`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Prescriptions view ──────────────────────────── */}
        {view === 'prescriptions' && (
          <>
            <div className="page-header">
              <div className="page-header-left">
                <h1>My Prescriptions</h1>
                <p>Active prescriptions with upcoming refill dates</p>
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">💊</div>
                  <p>No active prescriptions in the next 3 months.</p>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Quantity</th>
                        <th>Next Refill</th>
                        <th>Schedule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(rx => (
                        <tr key={rx.id}>
                          <td style={{ fontWeight: 500 }}>{rx.medication}</td>
                          <td><span className="badge badge-purple">{rx.dosage}</span></td>
                          <td>{rx.quantity} units</td>
                          <td>
                            <span style={{ fontWeight: 500 }}>{fmtDate(rx.refill_on)}</span>
                          </td>
                          <td>
                            <span className="badge badge-amber">{rx.refill_schedule}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Booking Modal ───────────────────────────────────── */}
      {showBooking && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBooking(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>📅 Book Appointment</h2>
              <button className="modal-close" onClick={() => setShowBooking(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleBookAppointment}>
                {bookingError && <div className="alert alert-error">⚠ {bookingError}</div>}

                <div className="form-group">
                  <label className="form-label">Provider *</label>
                  <select className="form-control" required value={bookProvider}
                    onChange={e => handleProviderChange(e.target.value)}>
                    <option value="">Select a provider…</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.name}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    className="form-control"
                    type="date"
                    required
                    value={bookDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => handleDateChange(e.target.value)}
                  />
                </div>

                {bookProvider && bookDate && (
                  <div className="form-group">
                    <label className="form-label">Available Time Slot *</label>
                    {slotsLoading ? (
                      <div className="loading-wrapper" style={{ padding: '12px 0', justifyContent: 'flex-start' }}>
                        <div className="spinner" /> Loading slots…
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="alert alert-info" style={{ marginBottom: 0 }}>
                        No available slots for {bookProvider} on this date.
                      </div>
                    ) : (
                      <select className="form-control" required value={bookTime}
                        onChange={e => setBookTime(e.target.value)}>
                        <option value="">Select a time…</option>
                        {availableSlots.map(slot => (
                          <option key={slot} value={slot.slice(11, 16)}>
                            {fmtTime(slot + ':00')}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Repeat</label>
                  <select className="form-control" value={bookRepeat}
                    onChange={e => setBookRepeat(e.target.value)}>
                    <option value="none">One-time appointment</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBooking(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={bookingLoading || !bookProvider || !bookDate || !bookTime}
                  >
                    {bookingLoading ? 'Booking…' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPortal;
