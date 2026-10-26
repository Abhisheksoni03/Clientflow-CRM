import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  Download,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Sun,
  UsersRound,
  X,
} from 'lucide-react';
import { authApi, clientsApi, dashboardApi, tokenStore } from './api.js';

const SOURCES = ['Referral', 'Website', 'LinkedIn', 'Event', 'Cold outreach', 'Other'];
const initialForm = {
  name: '', company: '', email: '', phone: '', status: 'Lead', source: 'Other',
  dealValue: 0, expectedCloseDate: '', followUpDate: '', followUpCompleted: false, notes: '',
};

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function formatCurrency(value = 0) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, options);
}

function StatusBadge({ status }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}><span />{status}</span>;
}

function StatCard({ title, value, icon: Icon, tone, caption = 'in your workspace' }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-copy"><span>{title}</span><strong>{value}</strong></div>
      <span className="stat-caption">{caption}</span>
    </article>
  );
}

function AuthScreen({ onAuthenticate }) {
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).has('resetToken') ? 'reset' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const registering = mode === 'register';

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('resetToken')) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    if (nextMode !== 'reset') setResetToken('');
    setForm((current) => ({ ...current, password: '' }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'forgot') {
        const result = await authApi.forgotPassword({ email: form.email });
        setNotice(result.message);
      } else if (mode === 'reset') {
        const result = await authApi.resetPassword({ token: resetToken, password: form.password });
        setNotice(result.message);
        changeMode('login');
      } else {
        const result = registering ? await authApi.register(form) : await authApi.login(form);
        onAuthenticate(result);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const title = {
    register: 'Create your account',
    forgot: 'Forgot your password?',
    reset: 'Set a new password',
    login: 'Welcome back',
  }[mode];
  const intro = {
    register: 'Set up your secure workspace to manage client relationships.',
    forgot: 'Enter your account email and we’ll send a secure reset link.',
    reset: 'Choose a new password for your ClientFlow account.',
    login: 'Sign in to pick up where your client relationships left off.',
  }[mode];

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <a className="brand auth-brand" href="#" aria-label="ClientFlow home">
          <span className="brand-mark"><span /></span><span>client<span className="brand-light">flow</span></span>
        </a>
        <span className="eyebrow auth-eyebrow">YOUR CLIENT WORKSPACE</span>
        <h1>{title}</h1>
        <p className="auth-intro">{intro}</p>
        <form className="auth-form" onSubmit={submit}>
          {registering && <label>Your name<input required name="name" autoComplete="name" minLength="2" maxLength="80" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jordan Lee" /></label>}
          {mode !== 'reset' && <label>Email address<input required type="email" name="email" autoComplete="email" maxLength="254" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></label>}
          {(registering || mode === 'login' || mode === 'reset') && (
            <label>{mode === 'reset' ? 'New password' : 'Password'}<input required type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={registering || mode === 'reset' ? 10 : 1} maxLength="72" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === 'login' ? 'Your password' : 'At least 10 characters'} /></label>
          )}
          {mode === 'login' && <button className="auth-link auth-forgot" type="button" onClick={() => changeMode('forgot')}>Forgot password?</button>}
          {error && <p className="inline-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="button button-primary auth-submit" disabled={busy} type="submit">{busy ? 'Please wait...' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : registering ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
        </form>
        {mode === 'login' || mode === 'register' ? (
          <div className="auth-switch">{registering ? 'Already have an account?' : 'New to ClientFlow?'} <button type="button" onClick={() => changeMode(registering ? 'login' : 'register')}>{registering ? 'Sign in' : 'Create an account'}</button></div>
        ) : (
          <div className="auth-switch"><button type="button" onClick={() => changeMode('login')}>Back to sign in</button></div>
        )}
        <div className="auth-security"><Database size={14} /> Your client data is private to your account.</div>
      </section>
    </main>
  );
}

function ClientModal({ client, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(() => {
    if (!client) return initialForm;
    return {
      ...initialForm,
      ...client,
      expectedCloseDate: dateInputValue(client.expectedCloseDate),
      followUpDate: dateInputValue(client.followUpDate),
    };
  });

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === 'dealValue' ? value : value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave({
      ...form,
      dealValue: Number(form.dealValue) || 0,
      expectedCloseDate: form.expectedCloseDate || null,
      followUpDate: form.followUpDate || null,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal client-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div><span className="eyebrow">{client ? 'UPDATE RELATIONSHIP' : 'NEW RELATIONSHIP'}</span><h2 id="modal-title">{client ? 'Edit client' : 'Add a client'}</h2><p>Keep the details and next steps for this relationship together.</p></div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        <form className="client-form" onSubmit={submit}>
          <div className="form-row"><label>Full name<input name="name" value={form.name} onChange={change} placeholder="Jordan Lee" required maxLength="100" autoFocus /></label><label>Company<input name="company" value={form.company} onChange={change} placeholder="Company name" required maxLength="120" /></label></div>
          <div className="form-row"><label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="jordan@company.com" required maxLength="254" /></label><label>Phone <span className="optional">(optional)</span><input name="phone" type="tel" value={form.phone || ''} onChange={change} placeholder="+1 555 000 0000" maxLength="40" /></label></div>
          <div className="form-row"><label>Relationship status<select name="status" value={form.status} onChange={change}><option>Lead</option><option>Active</option><option>Inactive</option></select></label><label>Lead source<select name="source" value={form.source || 'Other'} onChange={change}>{SOURCES.map((source) => <option key={source}>{source}</option>)}</select></label></div>
          <div className="form-row"><label>Deal value <span className="optional">(USD)</span><input type="number" name="dealValue" value={form.dealValue ?? 0} onChange={change} min="0" max="100000000000" step="0.01" /></label><label>Expected close date<input type="date" name="expectedCloseDate" value={form.expectedCloseDate || ''} onChange={change} /></label></div>
          <label>Next follow-up<input type="date" name="followUpDate" value={form.followUpDate || ''} onChange={change} /></label>
          <label>Notes <span className="optional">(optional)</span><textarea name="notes" value={form.notes || ''} onChange={change} rows="3" placeholder="Anything useful to remember..." maxLength="1000" /></label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving...' : client ? 'Save changes' : 'Add client'} <ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function ClientDetail({ client, onClose, onEdit, onRefresh, onToast }) {
  const [record, setRecord] = useState(client);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    clientsApi.get(client._id).then((result) => { if (active) setRecord(result); }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [client._id]);

  async function addNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    setError('');
    try {
      await clientsApi.addActivity(record._id, note.trim());
      setNote('');
      const updated = await clientsApi.get(record._id);
      setRecord(updated);
      onRefresh();
      onToast('Note added to the activity timeline.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleFollowUp() {
    setBusy(true);
    setError('');
    try {
      const updated = await clientsApi.completeFollowUp(record._id, !record.followUpCompleted);
      setRecord(updated);
      onRefresh();
      onToast(updated.followUpCompleted ? 'Follow-up completed.' : 'Follow-up reopened.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const timeline = [...(record.activity || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <div className="modal-backdrop detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="detail-header">
          <div><span className="eyebrow">CLIENT PROFILE</span><h2>Relationship details</h2></div>
          <div className="detail-header-actions"><button className="button button-outline" type="button" onClick={() => onEdit(record)}>Edit client</button><button className="icon-button" type="button" aria-label="Close client details" onClick={onClose}><X size={18} /></button></div>
        </header>
        {error && <p className="inline-error detail-error" role="alert">{error}</p>}
        <div className="detail-scroll">
          <section className="profile-card">
            <div className="client-avatar avatar-0 profile-large">{initials(record.name)}</div>
            <div className="profile-copy"><span className="eyebrow">CLIENT</span><h1 id="detail-title">{record.name}</h1><p>{record.company}</p></div>
            <StatusBadge status={record.status} />
          </section>
          <section className="detail-section"><span className="eyebrow">CONTACT</span><div className="detail-grid"><div><span>Email</span><a href={`mailto:${record.email}`}>{record.email}</a></div><div><span>Phone</span><strong>{record.phone || 'Not provided'}</strong></div><div><span>Lead source</span><strong>{record.source || 'Other'}</strong></div><div><span>Added</span><strong>{formatDate(record.createdAt)}</strong></div></div></section>
          <section className="detail-section pipeline-detail"><span className="eyebrow">OPPORTUNITY</span><div className="detail-grid"><div><span>Deal value</span><strong>{formatCurrency(record.dealValue)}</strong></div><div><span>Expected close</span><strong>{formatDate(record.expectedCloseDate)}</strong></div></div></section>
          <section className="detail-section followup-detail"><div className="detail-section-title"><span className="eyebrow">NEXT STEP</span>{record.followUpDate && <button type="button" className="followup-done" disabled={busy} onClick={toggleFollowUp}><CheckCheck size={14} />{record.followUpCompleted ? 'Reopen follow-up' : 'Mark complete'}</button>}</div>{record.followUpDate ? <div className={`followup-callout ${new Date(record.followUpDate) < new Date() && !record.followUpCompleted ? 'is-overdue' : ''}`}><CalendarClock size={17} /><div><strong>{record.followUpCompleted ? 'Follow-up completed' : formatDate(record.followUpDate)}</strong><span>{record.followUpCompleted ? 'This reminder is complete.' : new Date(record.followUpDate) < new Date() ? 'This follow-up is overdue.' : 'Remember to reconnect with this client.'}</span></div></div> : <p className="detail-muted">No follow-up scheduled. Edit this client to add a reminder.</p>}</section>
          {record.notes && <section className="detail-section"><span className="eyebrow">CLIENT NOTES</span><p className="client-notes">{record.notes}</p></section>}
          <section className="detail-section timeline-section">
            <div className="timeline-heading"><div><span className="eyebrow">RELATIONSHIP HISTORY</span><h3>Activity timeline</h3></div><span>{timeline.length} updates</span></div>
            <form className="activity-note-form" onSubmit={addNote}><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note to the timeline..." maxLength="500" aria-label="Add activity note" /><button className="button button-primary" disabled={busy || !note.trim()} type="submit">Add note</button></form>
            {timeline.length ? <div className="timeline-list">{timeline.map((entry) => <article className="timeline-item" key={entry._id}><span className={`timeline-dot timeline-${entry.type}`} /><div><p>{entry.message}</p><time>{formatDate(entry.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time></div></article>)}</div> : <p className="detail-muted">Activity will appear here as this relationship grows.</p>}
          </section>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ summary, loading, onAddClient, onViewClients, onOpenClient }) {
  const metrics = summary?.metrics || {};
  const weeklyActivity = summary?.activity || [];
  const maxActivity = Math.max(1, ...weeklyActivity.map((day) => day.count));
  const sources = summary?.sources || [];
  const sourceMax = Math.max(1, ...sources.map((item) => item.count));
  const pipeline = metrics.pipelineValue || 0;

  return (
    <div className="dashboard-view">
      <section className="welcome-banner"><div className="welcome-copy"><span className="eyebrow"><SparklesIcon /> YOUR CRM AT A GLANCE</span><h1>Good to see you.</h1><p>Your relationships, pipeline, and next steps — all in one place.</p><button className="button welcome-button" type="button" onClick={onViewClients}>Explore your clients <ArrowRight size={15} /></button></div><div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-star"><BriefcaseBusiness size={28} /></div><div className="art-node node-one"><UsersRound size={17} /></div><div className="art-node node-two"><CalendarClock size={16} /></div><div className="art-node node-three"><Check size={16} /></div></div><span className="welcome-decoration welcome-decoration-one" /><span className="welcome-decoration welcome-decoration-two" /></section>
      <div className="dashboard-section-heading"><div><span className="eyebrow">THE BIG PICTURE</span><h2>Workspace overview</h2></div><span className="live-database"><span className="secure-dot" /> Live database totals</span></div>
      <section className="stats-grid dashboard-stats" aria-label="Client totals">
        <StatCard title="Total clients" value={loading ? '—' : metrics.total || 0} icon={UsersRound} tone="purple" />
        <StatCard title="Active clients" value={loading ? '—' : metrics.active || 0} icon={Check} tone="green" />
        <StatCard title="Open leads" value={loading ? '—' : metrics.leads || 0} icon={BriefcaseBusiness} tone="orange" />
        <StatCard title="Follow-ups due" value={loading ? '—' : (metrics.overdueFollowUps || 0) + (metrics.upcomingFollowUps || 0)} icon={Bell} tone="blue" caption={`${metrics.overdueFollowUps || 0} overdue`} />
      </section>
      <section className="dashboard-panels">
        <article className="dashboard-panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">CLIENT ACQUISITION</span><h2>New clients</h2><p>Records created in the last 7 days</p></div><div className="panel-total"><strong>{loading ? '—' : weeklyActivity.reduce((sum, day) => sum + day.count, 0)}</strong><span>this week</span></div></div><div className="activity-chart" role="img" aria-label="New client records created on each of the last seven days">{weeklyActivity.map((day) => <div className="chart-column" key={day.date} title={`${formatDate(day.date, { month: 'short', day: 'numeric' })}: ${day.count} clients`}><span className="chart-value">{day.count || ''}</span><div className="chart-track"><span className="chart-bar" style={{ height: `${day.count ? Math.max(10, (day.count / maxActivity) * 100) : 3}%` }} /></div><span className="chart-label">{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span></div>)}</div><div className="chart-footnote"><span className="chart-legend-dot" /> New client records <span>Actual database records</span></div></article>
        <article className="dashboard-panel portfolio-panel"><div className="panel-heading"><div><span className="eyebrow">PIPELINE</span><h2>Opportunity value</h2><p>Lead value in your pipeline</p></div><div className="pipeline-count">{loading ? '—' : metrics.pipelineDeals || 0} leads</div></div><div className="pipeline-value">{loading ? '—' : formatCurrency(pipeline)}</div><div className="pipeline-note"><BriefcaseBusiness size={14} /> Based on deal values you entered</div><div className="source-heading"><span className="eyebrow">LEAD SOURCES</span><button type="button" onClick={onViewClients}>View clients <ArrowRight size={12} /></button></div><div className="source-bars">{loading ? <span className="detail-muted">Loading real lead sources...</span> : sources.length ? sources.slice(0, 4).map((item) => <div className="source-row" key={item.source}><span>{item.source}</span><div><i style={{ width: `${Math.max(4, (item.count / sourceMax) * 100)}%` }} /></div><strong>{item.count}</strong></div>) : <span className="detail-muted">Lead source totals appear as you add clients.</span>}</div></article>
      </section>
      <section className="dashboard-panel followups-panel"><div className="recent-heading"><div><span className="eyebrow">DON'T LET A LEAD GO COLD</span><h2>Follow-ups</h2><p>Reminders from your actual client records.</p></div><span className="followup-summary"><span className="overdue-dot" />{loading ? '—' : metrics.overdueFollowUps || 0} overdue</span></div>      {loading ? <div className="dashboard-loading"><span className="spinner" />Loading reminders...</div> : summary?.followUps?.length ? <div className="followup-list">{summary.followUps.map((client) => <button className="followup-row" type="button" key={client._id} onClick={() => onOpenClient(client)}><span className="followup-datebox"><strong>{new Date(client.followUpDate).toLocaleDateString(undefined, { day: 'numeric' })}</strong><small>{new Date(client.followUpDate).toLocaleDateString(undefined, { month: 'short' })}</small></span><span className="followup-name"><strong>{client.name}</strong><small>{client.company}</small></span><StatusBadge status={client.status} /><span className={`followup-due ${new Date(client.followUpDate) < new Date() ? 'due-overdue' : ''}`}>{new Date(client.followUpDate) < new Date() ? 'Overdue' : formatDate(client.followUpDate, { month: 'short', day: 'numeric' })}</span><ArrowUpRight className="recent-client-arrow" size={15} /></button>)}</div> : <div className="dashboard-empty compact-empty"><div className="empty-icon"><CalendarClock size={19} /></div><strong>No follow-ups scheduled</strong><span>Add a reminder to any client to keep your next steps visible here.</span><button className="button button-outline empty-add" type="button" onClick={onViewClients}>Open client directory <ArrowRight size={13} /></button></div>}</section>
      <section className="dashboard-panel recent-panel"><div className="recent-heading"><div><span className="eyebrow">KEEP IN THE LOOP</span><h2>Recently updated</h2><p>Your latest client records, straight from the database.</p></div><button className="button button-outline" type="button" onClick={onViewClients}>View all clients <ArrowRight size={14} /></button></div>{loading ? <div className="dashboard-loading"><span className="spinner" />Loading real client records...</div> : summary?.recentClients?.length ? <div className="recent-list">{summary.recentClients.map((client, index) => <button className="recent-client" type="button" key={client._id} onClick={() => onOpenClient(client)}><span className={`client-avatar avatar-${index % 5}`}>{initials(client.name)}</span><span className="recent-client-name"><strong>{client.name}</strong><span>{client.company}</span></span><StatusBadge status={client.status} /><span className="recent-client-date">{formatDate(client.updatedAt, { month: 'short', day: 'numeric' })}</span><ArrowUpRight className="recent-client-arrow" size={16} /></button>)}</div> : <div className="dashboard-empty"><div className="empty-icon"><UsersRound size={20} /></div><strong>Your dashboard is ready for its first client</strong><span>Add a real client to see your portfolio and recent updates here.</span><button className="button button-primary empty-add" type="button" onClick={onAddClient}><Plus size={15} /> Add your first client</button></div>}</section>
    </div>
  );
}

function SparklesIcon() {
  return <span className="sparkles-inline">✦</span>;
}

function App() {
  const [token, setToken] = useState(() => tokenStore.get());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [clients, setClients] = useState([]);
  const [totalClients, setTotalClients] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All clients');
  const [sourceFilter, setSourceFilter] = useState('All sources');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modalClient, setModalClient] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  const [theme, setTheme] = useState(() => window.localStorage.getItem('clientflow-theme') || 'dark');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await clientsApi.list({
        page,
        limit: 10,
        q: query.trim(),
        status: statusFilter,
        source: sourceFilter,
        sort: sortNewestFirst ? 'newest' : 'oldest',
      });
      setClients(result.clients);
      setTotalClients(result.total);
      setPages(Math.max(1, result.pages));
      if (page > Math.max(1, result.pages)) setPage(Math.max(1, result.pages));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, query, sourceFilter, sortNewestFirst, statusFilter]);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await dashboardApi.get());
    } catch (error) {
      setLoadError(error.message);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    await Promise.all([loadClients(), loadDashboard()]);
    setLoading(false);
  }, [loadClients, loadDashboard, token]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('clientflow-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token) { setAuthLoading(false); return undefined; }
    let active = true;
    setAuthLoading(true);
    authApi.me().then(({ user: currentUser }) => {
      if (active) setUser(currentUser);
    }).catch(() => {
      tokenStore.clear();
      if (active) { setToken(null); setUser(null); }
    }).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user, loadDashboard]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => loadClients(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [user, loadClients]);

  useEffect(() => {
    function handleUnauthorized() {
      tokenStore.clear();
      setToken(null);
      setUser(null);
      setClients([]);
      setDashboard(null);
      setToast('Your session ended. Please sign in again.');
    }
    window.addEventListener('clientflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('clientflow:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setModalOpen(false);
        setDetailClient(null);
        setSidebarOpen(false);
        setWorkspaceOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('[aria-label="Search clients"]')?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const metrics = dashboard?.metrics || {};

  function handleAuthenticate(result) {
    tokenStore.set(result.token);
    setUser(result.user);
    setToken(result.token);
    setCurrentView('overview');
    setToast(`Welcome, ${result.user.name}.`);
  }

  function signOut() {
    tokenStore.clear();
    setToken(null);
    setUser(null);
    setClients([]);
    setDashboard(null);
    setTotalClients(0);
    setCurrentView('overview');
    setToast('You have been signed out.');
  }

  function openCreate() {
    setModalClient(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(client) {
    setDetailClient(null);
    setModalClient(client);
    setFormError('');
    setModalOpen(true);
  }

  function showView(view) {
    setCurrentView(view);
    setSidebarOpen(false);
    setWorkspaceOpen(false);
  }

  async function saveClient(form) {
    setSaving(true);
    setFormError('');
    try {
      if (modalClient) await clientsApi.update(modalClient._id, form);
      else await clientsApi.create(form);
      setModalOpen(false);
      setToast(modalClient ? 'Client changes saved.' : 'Client added to your workspace.');
      await refreshWorkspace();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(client) {
    if (!window.confirm(`Delete ${client.name} from your client list? This cannot be undone.`)) return;
    try {
      await clientsApi.remove(client._id);
      setDetailClient(null);
      setToast('Client removed.');
      await refreshWorkspace();
    } catch (error) {
      setLoadError(error.message);
    }
  }

  async function exportClients() {
    setExporting(true);
    try {
      const blob = await clientsApi.exportCsv({ q: query.trim(), status: statusFilter, source: sourceFilter });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'clientflow-clients.csv';
      anchor.click();
      URL.revokeObjectURL(url);
      setToast('Filtered client list exported as CSV.');
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setExporting(false);
    }
  }

  const activePage = page > pages ? pages : page;
  const pageStart = totalClients ? (activePage - 1) * 10 + 1 : 0;
  const pageEnd = Math.min(activePage * 10, totalClients);

  if (authLoading) {
    return <main className="auth-screen"><div className="auth-loading"><span className="spinner" /> Checking your secure workspace...</div></main>;
  }
  if (!user) {
    return <><AuthScreen onAuthenticate={handleAuthenticate} />{toast && <div className="toast" role="status">{toast}</div>}</>;
  }

  return (
    <div className={`app-shell ${theme === 'light' ? 'theme-light' : ''}`}>
      {sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" aria-label="ClientFlow home"><span className="brand-mark"><span /></span><span>client<span className="brand-light">flow</span></span></a>
        <button className="workspace-switch" type="button" aria-expanded={workspaceOpen} aria-haspopup="menu" onClick={() => setWorkspaceOpen((open) => !open)}><div className="workspace-avatar">CF</div><div><strong>My workspace</strong><span>{user.email}</span></div><ChevronDown className={workspaceOpen ? 'chevron-open' : ''} size={15} /></button>
        {workspaceOpen && <div className="workspace-menu" role="menu" aria-label="Workspace menu"><span className="workspace-menu-label">CURRENT WORKSPACE</span><div className="workspace-menu-current"><div className="workspace-avatar">CF</div><div><strong>My workspace</strong><span>{user.name}</span></div><Check size={15} /></div><div className="workspace-menu-divider" /><button type="button" role="menuitem" onClick={() => showView('clients')}><UsersRound size={15} /> Open client directory <ArrowRight size={14} /></button><button type="button" role="menuitem" onClick={() => { setWorkspaceOpen(false); refreshWorkspace(); }}><Database size={15} /> Refresh database data <ArrowRight size={14} /></button><button type="button" role="menuitem" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} Switch to {theme === 'dark' ? 'light' : 'dark'} theme <ArrowRight size={14} /></button><button type="button" role="menuitem" onClick={signOut}><LogOut size={15} /> Sign out <ArrowRight size={14} /></button></div>}
        <span className="nav-caption">WORKSPACE</span>
        <nav className="main-nav" aria-label="Main navigation"><button className={`nav-item ${currentView === 'overview' ? 'active' : ''}`} type="button" onClick={() => showView('overview')}><LayoutDashboard size={18} />Overview</button><button className={`nav-item ${currentView === 'clients' ? 'active' : ''}`} type="button" onClick={() => showView('clients')}><UsersRound size={18} />Clients<span className="nav-count">{totalClients}</span></button><button className="nav-item" type="button" onClick={() => { setSortNewestFirst(true); showView('clients'); }}><Clock3 size={18} />Recently updated</button></nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Private by design</strong><p>Your account only sees its own client records.</p></div><div className="user-profile"><div className="profile-avatar">{initials(user.name)}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><button type="button" className="profile-menu-button" aria-label="Sign out" onClick={signOut}><MoreHorizontal size={19} /></button></div></div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar"><button className="mobile-menu icon-button" type="button" aria-label="Open navigation menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><Menu size={19} /></button><div className="breadcrumb">My workspace <span>/</span> <strong>{currentView === 'overview' ? 'Overview' : 'Clients'}</strong></div><div className="topbar-right"><button className="theme-toggle icon-button" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button><span className="theme-indicator"><span className="theme-indicator-dot" />{theme === 'dark' ? 'Dark theme' : 'Light theme'}</span><span className="secure-label"><span className={`secure-dot ${loadError ? 'disconnected-dot' : ''}`} />{loading ? 'Syncing' : loadError ? 'Offline' : 'Database connected'}</span><div className="top-avatar">{initials(user.name)}</div></div></header>
        <div className="page-content">
          {loadError && <div className="error-banner" role="alert"><span>{loadError}</span><button type="button" className="button button-quiet" onClick={refreshWorkspace}>Try again</button></div>}
          {currentView === 'overview' ? (
            <><div className="dashboard-title-row"><div><span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span><h1>Overview</h1><p>Here's what’s happening across your client relationships.</p></div><button className="button button-primary add-button" type="button" onClick={openCreate}><Plus size={16} /> Add client</button></div><Dashboard summary={dashboard} loading={loading} onAddClient={openCreate} onViewClients={() => showView('clients')} onOpenClient={setDetailClient} /></>
          ) : (
            <div className="clients-page" id="clients">
              <div className="page-heading"><div><span className="eyebrow">YOUR RELATIONSHIPS</span><h1>Clients <span className="title-count">{totalClients}</span></h1><p>Search, organize, and keep every next step moving.</p></div><div className="client-page-actions"><button className="button button-outline" type="button" disabled={exporting || totalClients === 0} onClick={exportClients}><Download size={15} />{exporting ? 'Exporting...' : 'Export CSV'}</button><button className="button button-primary add-button" type="button" onClick={openCreate}><Plus size={17} /> Add client</button></div></div>
              <section className="stats-grid" aria-label="Client totals"><StatCard title="All clients" value={loading ? '—' : metrics.total ?? totalClients} icon={UsersRound} tone="purple" /><StatCard title="Active clients" value={loading ? '—' : metrics.active ?? 0} icon={Check} tone="green" /><StatCard title="Open leads" value={loading ? '—' : metrics.leads ?? 0} icon={BriefcaseBusiness} tone="orange" /><StatCard title="Pipeline value" value={loading ? '—' : formatCurrency(metrics.pipelineValue || 0)} icon={Database} tone="blue" caption="open lead opportunities" /></section>
              <section className="list-panel" aria-label="Client directory">
                <div className="list-heading"><div><h2>Client directory</h2><p>Search and filter your account’s client records.</p></div><div className="list-actions"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search clients..." aria-label="Search clients" /><kbd>Ctrl K</kbd></label><label className="filter-select"><ListFilter size={15} /><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter by status"><option>All clients</option><option>Active</option><option>Lead</option><option>Inactive</option></select><ChevronDown size={13} /></label><label className="filter-select source-filter"><BriefcaseBusiness size={14} /><select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }} aria-label="Filter by lead source"><option>All sources</option>{SOURCES.map((source) => <option key={source}>{source}</option>)}</select><ChevronDown size={13} /></label><button className="icon-button sort-button" type="button" aria-label={`Sort ${sortNewestFirst ? 'oldest' : 'newest'} first`} title="Change sort order" onClick={() => setSortNewestFirst((current) => !current)}><ArrowDownUp size={16} /></button></div></div>
                <div className="table-scroll"><table><thead><tr><th>CLIENT</th><th>STATUS</th><th>LEAD SOURCE</th><th>DEAL VALUE</th><th>NEXT FOLLOW-UP</th><th>EMAIL</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
                  {loading && <tr><td colSpan="7" className="table-message"><span className="spinner" />Loading your clients...</td></tr>}
                  {!loading && !loadError && clients.map((client, index) => <tr key={client._id}><td><button className="client-cell client-open-button" type="button" onClick={() => setDetailClient(client)}><span className={`client-avatar avatar-${index % 5}`}>{initials(client.name)}</span><span className="client-name"><strong>{client.name}</strong><span>{client.company}</span></span></button></td><td><StatusBadge status={client.status} /></td><td className="muted-cell">{client.source || 'Other'}</td><td className="deal-cell">{formatCurrency(client.dealValue || 0)}</td><td className="muted-cell">{client.followUpDate ? <span className={new Date(client.followUpDate) < new Date() && !client.followUpCompleted ? 'due-overdue' : ''}>{client.followUpCompleted ? 'Completed' : formatDate(client.followUpDate, { month: 'short', day: 'numeric' })}</span> : '—'}</td><td><a className="email-link" href={`mailto:${client.email}`}>{client.email}</a></td><td><div className="row-actions"><button className="text-action" type="button" onClick={() => openEdit(client)}>Edit</button><button className="delete-action" type="button" aria-label={`Delete ${client.name}`} onClick={() => deleteClient(client)}><X size={15} /></button></div></td></tr>)}
                  {!loading && !loadError && clients.length === 0 && <tr><td colSpan="7" className="empty-cell"><div className="empty-icon"><UsersRound size={21} /></div><strong>{totalClients ? 'No matching clients' : 'Your client list starts here'}</strong><span>{totalClients ? 'Try a different search or filter.' : 'Add your first client to start building your workspace.'}</span>{!totalClients && <button type="button" className="button button-primary empty-add" onClick={openCreate}><Plus size={15} /> Add your first client</button>}</td></tr>}
                </tbody></table></div>
                <footer className="table-footer"><span>Showing <strong>{pageStart}–{pageEnd}</strong> of <strong>{totalClients}</strong> clients</span><div className="pagination"><button className="button button-quiet" type="button" disabled={activePage <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page <strong>{activePage}</strong> of <strong>{pages}</strong></span><button className="button button-quiet" type="button" disabled={activePage >= pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
              </section>
            </div>
          )}
          <footer className="page-footer"><span>Made for better client relationships.</span><span>ClientFlow <span className="footer-separator">·</span> Private by design</span></footer>
        </div>
      </main>
      {modalOpen && <ClientModal key={modalClient?._id || 'new-client'} client={modalClient} onClose={() => setModalOpen(false)} onSave={saveClient} saving={saving} error={formError} />}
      {detailClient && <ClientDetail key={detailClient._id} client={detailClient} onClose={() => setDetailClient(null)} onEdit={openEdit} onRefresh={refreshWorkspace} onToast={setToast} />}
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  );
}

export default App;
