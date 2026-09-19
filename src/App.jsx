import { useEffect, useMemo, useState } from 'react';
import { authApi, modelApi } from './api';

const stages = ['Company profile', 'Industry scan', 'Select focus', 'Market evidence', 'Competitive map', 'Gap analysis', 'Opportunities', 'Report'];
const demoOptions = [
  { domain: 'Clinical workflow intelligence', score: 91, rationale: 'High-value workflows have measurable time savings and a growing need for evidence-aware automation.' },
  { domain: 'Provider revenue operations', score: 84, rationale: 'Fragmented tools and administrative friction create a clear adjacency for intelligent automation.' },
  { domain: 'Population health analytics', score: 78, rationale: 'Data interoperability and proactive-care needs offer a defensible research opportunity.' },
];

function Mark() { return <div className="mark"><span>m</span></div>; }
function Icon({ name }) { return <span className={`icon icon-${name}`} aria-hidden="true" />; }

function App() {
  const [view, setView] = useState('login');
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => { const saved = sessionStorage.getItem('marketscout-user'); if (saved) { setSession(JSON.parse(saved)); setView('dashboard'); } }, []);
  const enter = (user) => { sessionStorage.setItem('marketscout-user', JSON.stringify(user)); setSession(user); setView('dashboard'); };
  const signOut = () => { sessionStorage.removeItem('marketscout-user'); setSession(null); setView('login'); };

  if (view === 'dashboard' && session) return <Dashboard user={session} onSignOut={signOut} toast={toast} setToast={setToast} />;
  return <AuthScreen mode={view} setMode={setView} onSuccess={enter} toast={toast} setToast={setToast} />;
}

function AuthScreen({ mode, setMode, onSuccess, toast, setToast }) {
  const signup = mode === 'signup';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const submit = async (event) => {
    event.preventDefault(); setLoading(true);
    try {
      const result = signup ? await authApi.signUp(form.name, form.email, form.password) : await authApi.signIn(form.email, form.password);
      onSuccess({ name: result.user?.name || form.name || form.email.split('@')[0], email: form.email });
    } catch (error) {
      // Auth is intentionally an independent service. A local preview remains usable before it is connected.
      if (error instanceof TypeError) { onSuccess({ name: form.name || form.email.split('@')[0], email: form.email }); setToast('Preview mode: connect your auth service to enable production sign-in.'); }
      else setToast(error.message);
    } finally { setLoading(false); }
  };
  return <main className="auth-shell">
    <section className="auth-story"><div className="story-top"><Mark /><span>MarketScout</span></div><div className="orb orb-one" /><div className="orb orb-two" />
      <div className="story-copy"><p className="eyebrow">RESEARCH, WITH JUDGMENT</p><h1>Move from market noise to a decision you can defend.</h1><p>MarketScout coordinates specialized AI researchers, keeps evidence visible, and calls on human judgment at exactly the right moment.</p></div>
      <div className="signal-card"><span className="signal-dot" /> HUMAN + AI INTELLIGENCE <strong>Every recommendation carries its reasoning.</strong></div>
    </section>
    <section className="auth-panel"><div className="auth-card"><div className="mobile-brand"><Mark /> MarketScout</div><p className="eyebrow">{signup ? 'CREATE YOUR WORKSPACE' : 'WELCOME BACK'}</p><h2>{signup ? 'Start seeing the signal.' : 'Your research room awaits.'}</h2><p className="muted">{signup ? 'Create an account to build a more confident market thesis.' : 'Sign in to continue your market intelligence work.'}</p>
      <form onSubmit={submit}>{signup && <label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Avery Morgan" /></label>}<label>Work email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></label><label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>{!signup && <button type="button" className="text-button">Forgot password?</button>}<button className="primary wide" disabled={loading}>{loading ? 'Please wait…' : signup ? 'Create workspace →' : 'Enter MarketScout →'}</button></form>
      <p className="switch">{signup ? 'Already have an account?' : 'New to MarketScout?'} <button onClick={() => setMode(signup ? 'login' : 'signup')}>{signup ? 'Sign in' : 'Create an account'}</button></p></div></section>{toast && <Toast text={toast} close={() => setToast('')} />}
  </main>;
}

function Dashboard({ user, onSignOut, toast, setToast }) {
  const [company, setCompany] = useState(''); const [domain, setDomain] = useState(''); const [busy, setBusy] = useState(false); const [modal, setModal] = useState(null); const [run, setRun] = useState(null); const [reports, setReports] = useState([]); const [status, setStatus] = useState('checking');
  useEffect(() => { modelApi.health().then(r => setStatus(r.status === 'healthy' ? 'online' : 'offline')).catch(() => setStatus('offline')); }, []);
  const activeStage = run?.status === 'completed' ? 8 : run?.status === 'interrupted' ? 3 : busy ? 2 : 0;
  const initiate = async (e) => { e.preventDefault(); if (!company.trim()) return; setBusy(true); setRun({ company, status: 'working' });
    try { const result = await modelApi.startResearch(company.trim(), domain.trim()); handleResult(result); }
    catch (error) { if (error instanceof TypeError) { const localRun = { status: 'interrupted', thread_id: 'preview-run', interrupt: { options: demoOptions } }; setRun({ company, ...localRun }); setModal(localRun); setToast('Preview mode: domain choices shown with sample research data.'); } else { setRun(null); setToast(error.message); } }
    finally { setBusy(false); }
  };
  const handleResult = (result) => { setRun({ company, ...result }); if (result.status === 'interrupted') setModal(result); else if (result.status === 'completed') complete(result); else setToast((result.errors || ['Research could not be completed.']).join(' ')); };
  const complete = (result) => { const report = { id: result.thread_id, company, domain: result.data?.selected_domain || domain, createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), data: result.data }; setReports(p => [report, ...p]); setRun({ company, ...result }); setModal(null); setToast('Research report completed and saved to this session.'); };
  const selectDomain = async (choice, index) => { setModal(null); setBusy(true); try { if (run.thread_id === 'preview-run') { const result = { status: 'completed', thread_id: run.thread_id, data: { selected_domain: choice.domain } }; complete(result); } else handleResult(await modelApi.resumeResearch(run.thread_id, index + 1)); } catch (error) { setToast(error.message); } finally { setBusy(false); } };
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><Mark /><span>MarketScout</span></div><nav><button className="nav-item active"><Icon name="grid" /> Research room</button><button className="nav-item"><Icon name="file" /> My reports <span>{reports.length}</span></button><button className="nav-item"><Icon name="book" /> Evidence library</button></nav><div className="sidebar-bottom"><div className="api-status"><i className={status} /> Model API <b>{status}</b></div><button className="user-row" onClick={onSignOut}><div className="avatar">{user.name[0]?.toUpperCase()}</div><span><strong>{user.name}</strong><small>Sign out</small></span><Icon name="more" /></button></div></aside>
    <main className="workspace"><header><div><p className="eyebrow">INTELLIGENCE WORKSPACE</p><h1>What would you like to understand?</h1></div><button className="help">How it works <span>↗</span></button></header><section className="hero-panel"><div className="hero-grid"><div><span className="pill">✦ Evidence-aware research</span><h2>A clear view of<br /><em>where to go next.</em></h2><p>Give MarketScout a company. Its specialized agents map the landscape, find evidence, surface gaps, and assemble a decision-ready thesis.</p></div><div className="research-illustration"><div className="radar"><i /><i /><i /><b>✦</b></div><span className="tag one">market signal</span><span className="tag two">evidence</span></div></div></section>
    <section className="compose"><div className="section-label"><span>01</span><h3>Begin a research brief</h3></div><form onSubmit={initiate} className="brief-form"><label>Company or organization<input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Philips, OpenAI, Stripe" autoFocus /></label><label>Known focus area <small>optional — skips review</small><input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. Healthcare AI" /></label><button className="primary" disabled={busy || !company.trim()}>{busy ? 'Researching…' : 'Launch research'} <span>→</span></button></form></section>
    {(busy || run) && <section className="run-card"><div className="run-heading"><div><p className="eyebrow">LIVE RESEARCH RUN</p><h3>{run?.company || company}</h3></div><span className={`run-badge ${busy ? 'working' : run?.status}`}>{busy ? 'In progress' : run?.status === 'completed' ? 'Complete' : 'Awaiting review'}</span></div><div className="stage-track">{stages.map((s, i) => <div className={i < activeStage ? 'done' : i === activeStage ? 'current' : ''} key={s}><i>{i < activeStage ? '✓' : i + 1}</i><span>{s}</span></div>)}</div>{run?.status === 'completed' && <div className="run-result"><span>✓</span><div><strong>Research is ready</strong><p>{run.data?.selected_domain || domain} selected as the research focus.</p></div><button onClick={() => setToast('Report data is available in this session. PDF export will be enabled when the report backend is connected.')}>View report →</button></div>}</section>}
    <section className="recent"><div className="section-label"><span>02</span><h3>Recent intelligence</h3>{reports.length > 0 && <button>View all</button>}</div>{reports.length ? <div className="report-list">{reports.map(r => <article key={r.id}><div className="report-icon">↗</div><div><strong>{r.company}</strong><p>{r.domain} · {r.createdAt}</p></div><span className="complete-dot">Complete</span></article>)}</div> : <div className="empty-state"><span>◇</span><p>Your finished reports will live here.</p><small>Start with a company above to create your first intelligence brief.</small></div>}</section></main>
    {modal && <HumanReview options={modal.interrupt?.options || demoOptions} company={company} choose={selectDomain} close={() => setModal(null)} />}{toast && <Toast text={toast} close={() => setToast('')} />}</div>;
}

function HumanReview({ options, company, choose, close }) { const [selected, setSelected] = useState(0); return <div className="modal-backdrop"><div className="review-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={close}>×</button><div className="review-icon">✦</div><p className="eyebrow">HUMAN JUDGMENT REQUESTED</p><h2>Choose the direction worth pursuing.</h2><p className="modal-copy">The research agents found promising expansion domains for <strong>{company}</strong>. Your selection determines the evidence and opportunities investigated next.</p><div className="choice-list">{options.map((option, index) => <button className={selected === index ? 'choice selected' : 'choice'} onClick={() => setSelected(index)} key={option.domain}><span className="radio" /><div><strong>{option.domain}</strong><p>{option.rationale}</p></div><b>{Math.round(option.score || 0)}<small>/100</small></b></button>)}</div><div className="review-footer"><span>Why ask me? <button>Human review keeps the thesis aligned with your strategy.</button></span><button className="primary" onClick={() => choose(options[selected], selected)}>Continue with this focus →</button></div></div></div> }
function Toast({ text, close }) { useEffect(() => { const timer = setTimeout(close, 5200); return () => clearTimeout(timer); }, [close]); return <div className="toast"><span>✦</span>{text}<button onClick={close}>×</button></div>; }
export default App;
