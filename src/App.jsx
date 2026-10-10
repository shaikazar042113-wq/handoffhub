import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Check, CheckCheck,
  ChevronDown, CircleHelp, Clock3, Command, Filter, LayoutDashboard, ListTodo,
  LogOut, Menu, MessageSquareText, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Users, Workflow, X, Zap
} from 'lucide-react'

const API = 'http://localhost:8080/api/tasks'
const starterTasks = [
  { id: 'demo-1', title: 'Finalize onboarding flow', description: 'Review the new member journey and polish the first-run experience.', assignee: 'Maya Chen', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-10-12', handoffNote: '' },
  { id: 'demo-2', title: 'Prepare launch checklist', description: 'Collect release requirements and confirm owners for each item.', assignee: 'Jordan Lee', status: 'TODO', priority: 'MEDIUM', dueDate: '2026-10-14', handoffNote: '' },
  { id: 'demo-3', title: 'Audit mobile components', description: 'Check responsive behavior across the main dashboard screens.', assignee: 'Alex Morgan', status: 'IN_REVIEW', priority: 'LOW', dueDate: '2026-10-11', handoffNote: 'Screenshots are in the design folder.' },
  { id: 'demo-4', title: 'Update API documentation', description: 'Document the latest task and handoff endpoints.', assignee: 'Sam Rivera', status: 'DONE', priority: 'MEDIUM', dueDate: '2026-10-09', handoffNote: '' }
]
const statusLabel = { TODO: 'To do', IN_PROGRESS: 'In progress', IN_REVIEW: 'In review', DONE: 'Done' }
const initials = name => (name || 'Team member').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
const niceDate = date => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'

export default function App() {
  const [tasks, setTasks] = useState(starterTasks)
  const [connected, setConnected] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [modal, setModal] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  async function loadTasks() {
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error()
      setTasks(await res.json())
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }
  useEffect(() => { loadTasks() }, [])

  const visibleTasks = useMemo(() => tasks.filter(t => {
    const matchesQuery = `${t.title} ${t.assignee} ${t.description || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (filter === 'ALL' || t.status === filter)
  }), [tasks, query, filter])

  const counts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    review: tasks.filter(t => t.status === 'IN_REVIEW').length,
    done: tasks.filter(t => t.status === 'DONE').length
  }), [tasks])

  async function createTask(form) {
    const payload = { ...form, status: 'TODO', priority: form.priority || 'MEDIUM' }
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      await loadTasks()
      setNotice('Task created and saved to your workspace.')
    } catch {
      if (connected) { setNotice('Could not save task. Check the backend and try again.'); return }
      setTasks(prev => [{ ...payload, id: `local-${Date.now()}` }, ...prev])
      setNotice('Demo task added locally. Start the backend to save tasks to MySQL.')
    }
    setModal('')
  }

  async function updateStatus(task, status) {
    if (String(task.id).startsWith('demo-') || String(task.id).startsWith('local-')) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t))
      return
    }
    try {
      const res = await fetch(`${API}/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...task, status }) })
      if (!res.ok) throw new Error()
      await loadTasks()
    } catch { setNotice('Could not update status. Check your backend connection.') }
  }

  async function handoffTask(task, nextAssignee, note) {
    if (String(task.id).startsWith('demo-') || String(task.id).startsWith('local-')) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, previousOwner: t.assignee, assignee: nextAssignee, handoffNote: note, status: t.status === 'DONE' ? 'IN_PROGRESS' : t.status } : t))
      setModal('')
      setNotice(`Handoff prepared for ${nextAssignee}. Start the backend to persist it.`)
      return
    }
    try {
      const res = await fetch(`${API}/${task.id}/handoff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nextAssignee, note }) })
      if (!res.ok) throw new Error()
      await loadTasks()
      setModal('')
      setNotice(`Task handed off to ${nextAssignee}.`)
    } catch { setNotice('Handoff failed. Check your backend connection.') }
  }

  async function deleteTask(task) {
    if (String(task.id).startsWith('demo-') || String(task.id).startsWith('local-')) {
      setTasks(prev => prev.filter(t => t.id !== task.id)); setModal(''); return
    }
    try {
      await fetch(`${API}/${task.id}`, { method: 'DELETE' })
      await loadTasks(); setModal('')
    } catch { setNotice('Could not delete task. Check your backend connection.') }
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Workflow size={21}/></div><span>handoff<span className="brand-light">hub</span><i>.</i></span><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace"><div className="workspace-avatar">N</div><div><strong>Northstar Studio</strong><small>Workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>
        <button className="nav-item active"><LayoutDashboard size={18}/> Overview <span className="nav-dot"/></button>
        <button className="nav-item" onClick={() => setFilter('ALL')}><ListTodo size={18}/> All tasks <span className="nav-count">{counts.total}</span></button>
        <button className="nav-item" onClick={() => setFilter('IN_PROGRESS')}><Activity size={18}/> In progress</button>
        <button className="nav-item" onClick={() => setFilter('IN_REVIEW')}><CheckCheck size={18}/> In review</button>
      </nav>
      <div className="nav-caption second-caption">TEAM</div>
      <nav>
        <button className="nav-item" onClick={() => setNotice('Team directory is a great next feature to add.')}><Users size={18}/> Members</button>
        <button className="nav-item" onClick={() => setNotice('Handoff history will be added in the next version.')}><ArrowDownLeft size={18}/> Handoff history</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><Sparkles size={17}/></div><strong>Make work flow.</strong><p>Every handoff is a fresh start, not a restart.</p><button onClick={() => setNotice('Tip: use the Handoff action to pass context to a teammate.')}>Explore tips <ArrowRight size={14}/></button></div>
        <button className="nav-item"><Settings size={18}/> Settings</button>
        <div className="profile"><div className="avatar avatar-purple">AZ</div><div className="profile-info"><strong>Azar Shaik</strong><small>Project admin</small></div><MoreHorizontal size={20}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)}><Menu size={21}/></button>
        <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
        <div className="top-actions"><div className={`connection ${connected ? 'online' : ''}`}><span/>{connected ? 'API connected' : 'Preview mode'}</div><button className="icon-button" title="Notifications" onClick={() => setNotice('You’re all caught up — no new notifications.')}><Bell size={18}/><i/></button><div className="top-avatar">AZ</div></div>
      </header>

      <div className="content">
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="eyebrow-line"/> MONDAY, OCTOBER 10, 2026</div><h1>Good afternoon, Azar <span className="wave">✳</span></h1><p className="welcome-sub">Here’s what’s moving in your workspace today.</p></div>
          <button className="primary-button" onClick={() => setModal('create')}><Plus size={18}/> Create task</button>
        </section>

        <section className="hero-card">
          <div className="hero-copy"><div className="hero-kicker"><Zap size={14}/> YOUR TEAM, IN SYNC</div><h2>Keep the momentum.<br/><span>Pass it forward.</span></h2><p>Great work doesn’t stop at a handoff. Give every task the context it needs to keep moving.</p><button onClick={() => { setSelected(tasks.find(t => t.status !== 'DONE') || tasks[0]); setModal('handoff') }} className="hero-button">Make a handoff <ArrowRight size={16}/></button></div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="float-card card-back"><div className="mini-icon lilac"><Check size={15}/></div><div><b>Design review</b><small>Context included</small></div><span className="mini-check"><Check size={12}/></span></div><div className="float-card card-front"><div className="mini-icon mint"><ArrowRight size={16}/></div><div><b>Handoff complete</b><small>Moving to next owner</small><div className="tiny-avatars"><i>MC</i><i>JL</i><i>+2</i></div></div><span className="success-pill">Smooth</span></div><div className="sparkle s1">✦</div><div className="sparkle s2">✧</div><div className="sparkle s3">✦</div></div>
        </section>

        <section className="stats-grid">
          <Stat icon={<ListTodo size={18}/>} label="Total tasks" value={counts.total} foot="Across your workspace" tone="violet" trend="+12%" />
          <Stat icon={<Activity size={18}/>} label="In progress" value={counts.active} foot="Work happening now" tone="blue" trend="Active" />
          <Stat icon={<Clock3 size={18}/>} label="In review" value={counts.review} foot="Waiting for feedback" tone="amber" trend="Review" />
          <Stat icon={<CheckCheck size={18}/>} label="Completed" value={counts.done} foot="Successfully wrapped up" tone="green" trend={`${counts.total ? Math.round(counts.done / counts.total * 100) : 0}%`} />
        </section>

        <section className="task-section">
          <div className="section-heading"><div><div className="section-overline">YOUR WORKSPACE</div><h2>Task board <span className="task-total">{visibleTasks.length}</span></h2></div><button className="text-button" onClick={() => { setFilter('ALL'); setQuery('') }}>View all tasks <ArrowRight size={15}/></button></div>
          <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, people..." /><kbd>⌘ K</kbd></div><div className="filter-wrap"><Filter size={16}/><select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">All statuses</option><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="IN_REVIEW">In review</option><option value="DONE">Done</option></select></div><button className="toolbar-add" onClick={() => setModal('create')}><Plus size={17}/><span>New task</span></button></div>
          <div className="task-list">
            {visibleTasks.length ? visibleTasks.map(task => <TaskRow key={task.id} task={task} onHandoff={() => { setSelected(task); setModal('handoff') }} onStatus={status => updateStatus(task, status)} onDelete={() => { setSelected(task); setModal('delete') }} />) : <div className="empty-state"><div><Search size={22}/></div><strong>No tasks found</strong><p>Try another search or create a new task.</p><button className="primary-button" onClick={() => setModal('create')}><Plus size={16}/> Create task</button></div>}
          </div>
          <div className="list-footer"><span>Showing <b>{visibleTasks.length}</b> of <b>{tasks.length}</b> tasks</span><span className="footer-status"><span/> All changes up to date</span></div>
        </section>
        <footer className="page-footer"><span>© 2026 HandoffHub</span><span>Built for teams that keep things moving <span className="footer-heart">♥</span></span><button onClick={() => setNotice('HandoffHub starter project · React + Spring Boot + MySQL')}><CircleHelp size={14}/> Help & feedback</button></footer>
      </div>
    </main>

    {notice && <div className="toast"><div className="toast-check"><Check size={16}/></div><span>{notice}</span><button onClick={() => setNotice('')}><X size={16}/></button></div>}
    {modal && <Modal type={modal} task={selected} onClose={() => setModal('')} onCreate={createTask} onHandoff={handoffTask} onDelete={deleteTask} />}
  </div>
}

function Stat({ icon, label, value, foot, tone, trend }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-top"><span>{label}</span><span className={`stat-trend ${tone}`}>{trend}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div><div className={`stat-accent ${tone}`}/></div>
}

function TaskRow({ task, onHandoff, onStatus, onDelete }) {
  const [menu, setMenu] = useState(false)
  return <article className="task-row">
    <div className={`task-symbol ${task.status.toLowerCase()}`}>{task.status === 'DONE' ? <Check size={17}/> : task.status === 'IN_REVIEW' ? <Clock3 size={17}/> : task.status === 'IN_PROGRESS' ? <Activity size={17}/> : <Command size={17}/>}</div>
    <div className="task-main"><div className="task-title-line"><h3>{task.title}</h3><span className={`priority priority-${(task.priority || 'MEDIUM').toLowerCase()}`}><i/>{(task.priority || 'MEDIUM').toLowerCase()}</span></div><p>{task.description || 'No description added yet.'}</p><div className="task-meta"><span className="assignee"><span className={`avatar avatar-${(task.assignee || 'a').charCodeAt(0) % 4}`}>{initials(task.assignee)}</span>{task.assignee}</span><span className="meta-divider"/><span className="due-date"><Clock3 size={13}/> Due {niceDate(task.dueDate)}</span>{task.handoffNote && <span className="handoff-tag"><ArrowDownLeft size={12}/> Handoff note</span>}</div></div>
    <div className="task-status"><select aria-label="Task status" className={`status-select status-${task.status.toLowerCase()}`} value={task.status} onChange={e => onStatus(e.target.value)}>{Object.entries(statusLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    <button className="handoff-button" onClick={onHandoff}><ArrowDownLeft size={15}/><span>Handoff</span></button>
    <div className="task-menu-wrap"><button className="dots-button" onClick={() => setMenu(!menu)} aria-label="Task options"><MoreHorizontal size={19}/></button>{menu && <div className="dropdown"><button onClick={() => { setMenu(false); onHandoff() }}><ArrowDownLeft size={14}/> Handoff task</button><button className="danger-action" onClick={() => { setMenu(false); onDelete() }}><X size={14}/> Delete task</button></div>}</div>
  </article>
}

function Modal({ type, task, onClose, onCreate, onHandoff, onDelete }) {
  const [form, setForm] = useState({ title: '', description: '', assignee: '', priority: 'MEDIUM', dueDate: '' })
  const [nextAssignee, setNextAssignee] = useState('')
  const [note, setNote] = useState('')
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  useEffect(() => { if (type === 'handoff' && task) setNextAssignee(task.assignee || '') }, [type, task])
  if (type === 'delete') return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card small-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon danger-icon"><X size={20}/></div><h2>Delete this task?</h2><p className="modal-description">“{task?.title}” will be removed from the task board. This action cannot be undone.</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="delete-button" onClick={() => onDelete(task)}>Delete task</button></div></div></div>
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon">{type === 'create' ? <Plus size={20}/> : <ArrowDownLeft size={20}/>}</div><div className="modal-eyebrow">{type === 'create' ? 'ADD TO YOUR WORKSPACE' : 'KEEP THE MOMENTUM'}</div><h2>{type === 'create' ? 'Create a new task' : 'Hand off this task'}</h2><p className="modal-description">{type === 'create' ? 'Give your team a clear next step.' : `Pass “${task?.title}” to the right person with helpful context.`}</p>
    {type === 'create' ? <form onSubmit={e => { e.preventDefault(); onCreate(form) }} className="modal-form">
      <label>Task name<input name="title" required maxLength="120" value={form.title} onChange={change} placeholder="e.g. Review homepage design"/></label>
      <label>Description<textarea name="description" maxLength="1000" value={form.description} onChange={change} placeholder="What needs to be done?" rows="3"/></label>
      <div className="form-two"><label>Assignee<input name="assignee" required maxLength="100" value={form.assignee} onChange={change} placeholder="Team member name"/></label><label>Priority<select name="priority" value={form.priority} onChange={change}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label></div>
      <label>Due date<input type="date" name="dueDate" value={form.dueDate} onChange={change}/></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={16}/> Create task</button></div>
    </form> : <form onSubmit={e => { e.preventDefault(); if (nextAssignee.trim() && note.trim()) onHandoff(task, nextAssignee.trim(), note.trim()) }} className="modal-form">
      <div className="handoff-summary"><div className="summary-icon"><ArrowRight size={17}/></div><div><strong>{task?.title}</strong><span>Currently assigned to {task?.assignee}</span></div></div>
      <label>Hand off to<input required maxLength="100" value={nextAssignee} onChange={e => setNextAssignee(e.target.value)} placeholder="Next team member"/></label>
      <label>Handoff notes<textarea required maxLength="1000" value={note} onChange={e => setNote(e.target.value)} placeholder="What have you completed? What should happen next?" rows="4"/></label>
      <div className="context-tip"><Sparkles size={15}/><span>Helpful handoffs include progress, links, blockers, and the next action.</span></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><ArrowDownLeft size={16}/> Confirm handoff</button></div>
    </form>}
  </div></div>
}
