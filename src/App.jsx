import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Check, CheckCheck,
  ChevronDown, CircleHelp, Clock3, Command, Filter, LayoutDashboard, ListTodo,
  LogOut, Menu, MessageSquareText, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Users, Workflow, X, Zap, Lock, Mail, User as UserIcon
} from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const TASKS_API = `${BASE_URL}/api/tasks`
const AUTH_API = `${BASE_URL}/api/auth`

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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hh_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  
  const [tasks, setTasks] = useState(starterTasks)
  const [connected, setConnected] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [modal, setModal] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  // Auth form state
  const [authMode, setAuthMode] = useState('signin') // 'signin' or 'signup'
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '', fullName: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  async function loadTasks() {
    try {
      const res = await fetch(TASKS_API)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (Array.isArray(data)) {
        setTasks(data)
      }
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  function handleLogout() {
    localStorage.removeItem('hh_user')
    setCurrentUser(null)
    setNotice('You have been signed out.')
  }

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    const endpoint = authMode === 'signup' ? `${AUTH_API}/signup` : `${AUTH_API}/signin`

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || (authMode === 'signup' ? 'Signup failed' : 'Invalid credentials'))
      }

      localStorage.setItem('hh_user', JSON.stringify(data))
      setCurrentUser(data)
      setModal('')
      setNotice(authMode === 'signup' ? `Welcome, ${data.fullName || data.username}! Account created.` : `Welcome back, ${data.fullName || data.username}!`)
      setAuthForm({ username: '', password: '', email: '', fullName: '' })
      loadTasks()
    } catch (err) {
      // In offline preview mode, allow quick simulated signin
      if (!connected) {
        const fallbackUser = {
          username: authForm.username,
          fullName: authForm.fullName || authForm.username,
          email: authForm.email || `${authForm.username}@example.com`
        }
        localStorage.setItem('hh_user', JSON.stringify(fallbackUser))
        setCurrentUser(fallbackUser)
        setModal('')
        setNotice(`Signed in locally as ${fallbackUser.username} (Preview Mode)`)
      } else {
        setAuthError(err.message || 'Authentication error. Please try again.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

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
    const payload = {
      ...form,
      status: 'TODO',
      priority: form.priority || 'MEDIUM',
      assignee: form.assignee || currentUser?.fullName || currentUser?.username || 'Team member'
    }
    try {
      const res = await fetch(TASKS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error()
      await loadTasks()
      setNotice('Task created and saved to MongoDB Atlas.')
    } catch {
      if (connected) {
        setNotice('Could not save task. Check the backend connection.')
        return
      }
      setTasks(prev => [{ ...payload, id: `local-${Date.now()}` }, ...prev])
      setNotice('Task added locally in preview mode.')
    }
    setModal('')
  }

  async function updateStatus(task, status) {
    if (String(task.id).startsWith('demo-') || String(task.id).startsWith('local-')) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t))
      return
    }
    try {
      const res = await fetch(`${TASKS_API}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status })
      })
      if (!res.ok) throw new Error()
      await loadTasks()
    } catch {
      setNotice('Could not update status. Check backend connection.')
    }
  }

  async function handoffTask(task, nextAssignee, note) {
    if (String(task.id).startsWith('demo-') || String(task.id).startsWith('local-')) {
      setTasks(prev => prev.map(t => t.id === task.id ? {
        ...t,
        previousOwner: t.assignee,
        assignee: nextAssignee,
        handoffNote: note,
        status: t.status === 'DONE' ? 'IN_PROGRESS' : t.status
      } : t))
      setModal('')
      setNotice(`Handoff prepared for ${nextAssignee}.`)
      return
    }
    try {
      const res = await fetch(`${TASKS_API}/${task.id}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextAssignee, note })
      })
      if (!res.ok) throw new Error()
      await loadTasks()
      setModal('')
      setNotice(`Task handed off to ${nextAssignee}.`)
    } catch {
      setNotice('Handoff failed. Check your backend connection.')
    }
  }

  async function deleteTask(task) {
    if (String(task.id).startsWith('demo-') || String(task.id).startsWith('local-')) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      setModal('')
      return
    }
    try {
      await fetch(`${TASKS_API}/${task.id}`, { method: 'DELETE' })
      await loadTasks()
      setModal('')
      setNotice('Task removed from workspace.')
    } catch {
      setNotice('Could not delete task. Check backend connection.')
    }
  }

  const displayName = currentUser ? (currentUser.fullName || currentUser.username) : 'Azar Shaik'
  const displayInitials = initials(displayName)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Workflow size={21} /></div>
          <span>handoff<span className="brand-light">hub</span><i>.</i></span>
          <button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="workspace">
          <div className="workspace-avatar">N</div>
          <div><strong>Northstar Studio</strong><small>Mongo Atlas Workspace</small></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          <button className="nav-item active"><LayoutDashboard size={18} /> Overview <span className="nav-dot" /></button>
          <button className="nav-item" onClick={() => setFilter('ALL')}><ListTodo size={18} /> All tasks <span className="nav-count">{counts.total}</span></button>
          <button className="nav-item" onClick={() => setFilter('IN_PROGRESS')}><Activity size={18} /> In progress</button>
          <button className="nav-item" onClick={() => setFilter('IN_REVIEW')}><CheckCheck size={18} /> In review</button>
        </nav>
        <div className="nav-caption second-caption">TEAM</div>
        <nav>
          <button className="nav-item" onClick={() => setNotice('Team directory: manage role-based assignments.')}><Users size={18} /> Members</button>
          <button className="nav-item" onClick={() => setNotice('Handoff history is automatically recorded in Mongo Atlas.')}><ArrowDownLeft size={18} /> Handoff history</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Sparkles size={17} /></div>
            <strong>Make work flow.</strong>
            <p>Every handoff is a fresh start, not a restart.</p>
            <button onClick={() => setNotice('Tip: click Handoff on any task to smoothly pass context.')}>Explore tips <ArrowRight size={14} /></button>
          </div>
          
          {currentUser ? (
            <div className="profile">
              <div className="avatar avatar-purple">{displayInitials}</div>
              <div className="profile-info">
                <strong>{displayName}</strong>
                <small>{currentUser.email || `@${currentUser.username}`}</small>
              </div>
              <button className="icon-logout" title="Sign out" onClick={handleLogout}><LogOut size={16} /></button>
            </div>
          ) : (
            <div className="auth-sidebar-box">
              <button className="sidebar-auth-btn" onClick={() => { setAuthMode('signin'); setModal('auth'); }}>
                <Lock size={14} /> Sign in / Register
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMobileNav(!mobileNav)}><Menu size={21} /></button>
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions">
            <div className={`connection ${connected ? 'online' : ''}`}>
              <span />{connected ? 'Mongo Atlas Connected' : 'Preview mode'}
            </div>
            {currentUser ? (
              <button className="top-user-badge" onClick={() => setNotice(`Signed in as ${displayName}`)}>
                <div className="top-avatar">{displayInitials}</div>
                <span className="top-user-name">{displayName}</span>
              </button>
            ) : (
              <button className="signin-nav-button" onClick={() => { setAuthMode('signin'); setModal('auth'); }}>
                Sign in
              </button>
            )}
            <button className="icon-button" title="Notifications" onClick={() => setNotice('All clear — no pending alerts.')}>
              <Bell size={18} /><i />
            </button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SPRING BOOT &bull; MONGO ATLAS &bull; REACT</div>
              <h1>Good afternoon, {displayName.split(' ')[0]} <span className="wave">✳</span></h1>
              <p className="welcome-sub">Here’s what’s moving in your workspace today.</p>
            </div>
            <div className="top-btns">
              {!currentUser && (
                <button className="secondary-button auth-top-btn" onClick={() => { setAuthMode('signup'); setModal('auth'); }}>
                  Create Account
                </button>
              )}
              <button className="primary-button" onClick={() => setModal('create')}>
                <Plus size={18} /> Create task
              </button>
            </div>
          </section>

          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-kicker"><Zap size={14} /> PERSISTED WITH MONGO ATLAS</div>
              <h2>Keep the momentum.<br /><span>Pass it forward.</span></h2>
              <p>Great work doesn’t stop at a handoff. Give every task the context it needs to keep moving across shifts and owners.</p>
              <button onClick={() => { setSelected(tasks.find(t => t.status !== 'DONE') || tasks[0]); setModal('handoff') }} className="hero-button">
                Make a handoff <ArrowRight size={16} />
              </button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
              <div className="float-card card-back">
                <div className="mini-icon lilac"><Check size={15} /></div>
                <div><b>MongoDB Atlas</b><small>Cluster Connected</small></div>
                <span className="mini-check"><Check size={12} /></span>
              </div>
              <div className="float-card card-front">
                <div className="mini-icon mint"><ArrowRight size={16} /></div>
                <div><b>Handoff complete</b><small>Moving to next owner</small>
                  <div className="tiny-avatars"><i>MC</i><i>JL</i><i>+2</i></div>
                </div>
                <span className="success-pill">Active</span>
              </div>
              <div className="sparkle s1">✦</div><div className="sparkle s2">✧</div><div className="sparkle s3">✦</div>
            </div>
          </section>

          <section className="stats-grid">
            <Stat icon={<ListTodo size={18} />} label="Total tasks" value={counts.total} foot="Across MongoDB Atlas" tone="violet" trend="+12%" />
            <Stat icon={<Activity size={18} />} label="In progress" value={counts.active} foot="Work happening now" tone="blue" trend="Active" />
            <Stat icon={<Clock3 size={18} />} label="In review" value={counts.review} foot="Waiting for sign-off" tone="amber" trend="Review" />
            <Stat icon={<CheckCheck size={18} />} label="Completed" value={counts.done} foot="Successfully closed" tone="green" trend={`${counts.total ? Math.round(counts.done / counts.total * 100) : 0}%`} />
          </section>

          <section className="task-section">
            <div className="section-heading">
              <div>
                <div className="section-overline">WORKSPACE TASKS</div>
                <h2>Task board <span className="task-total">{visibleTasks.length}</span></h2>
              </div>
              <button className="text-button" onClick={() => { setFilter('ALL'); setQuery('') }}>View all tasks <ArrowRight size={15} /></button>
            </div>
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, people..." />
                <kbd>⌘ K</kbd>
              </div>
              <div className="filter-wrap">
                <Filter size={16} />
                <select value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="ALL">All statuses</option>
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
              <button className="toolbar-add" onClick={() => setModal('create')}>
                <Plus size={17} /><span>New task</span>
              </button>
            </div>
            <div className="task-list">
              {visibleTasks.length ? visibleTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onHandoff={() => { setSelected(task); setModal('handoff') }}
                  onStatus={status => updateStatus(task, status)}
                  onDelete={() => { setSelected(task); setModal('delete') }}
                />
              )) : (
                <div className="empty-state">
                  <div><Search size={22} /></div>
                  <strong>No tasks found</strong>
                  <p>Try another search or create a new task in this workspace.</p>
                  <button className="primary-button" onClick={() => setModal('create')}><Plus size={16} /> Create task</button>
                </div>
              )}
            </div>
            <div className="list-footer">
              <span>Showing <b>{visibleTasks.length}</b> of <b>{tasks.length}</b> tasks</span>
              <span className="footer-status"><span /> All changes synced</span>
            </div>
          </section>

          <footer className="page-footer">
            <span>&copy; 2026 HandoffHub &bull; Spring Boot + React + MongoDB Atlas</span>
            <span>Dockerized ready for Render deployment <span className="footer-heart">&hearts;</span></span>
            <button onClick={() => setNotice('Backend running Spring Boot 3.4 on Docker with MongoDB Atlas integration.')}>
              <CircleHelp size={14} /> Status info
            </button>
          </footer>
        </div>
      </main>

      {notice && (
        <div className="toast">
          <div className="toast-check"><Check size={16} /></div>
          <span>{notice}</span>
          <button onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      {modal === 'auth' && (
        <div className="modal-backdrop" onMouseDown={() => setModal('')}>
          <div className="modal-card small-modal" onMouseDown={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal('')}><X size={18} /></button>
            <div className="modal-icon"><Lock size={20} /></div>
            <div className="modal-eyebrow">AUTHENTICATION</div>
            <h2>{authMode === 'signup' ? 'Create an account' : 'Sign in to HandoffHub'}</h2>
            <p className="modal-description">
              {authMode === 'signup' 
                ? 'Join your team workspace backed by Mongo Atlas.' 
                : 'Enter your credentials to access your tasks and handoffs.'}
            </p>

            {authError && <div className="auth-error-box">{authError}</div>}

            <form onSubmit={handleAuthSubmit} className="modal-form">
              {authMode === 'signup' && (
                <label>
                  Full name
                  <input
                    name="fullName"
                    required
                    placeholder="e.g. Azar Shaik"
                    value={authForm.fullName}
                    onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })}
                  />
                </label>
              )}

              <label>
                Username
                <input
                  name="username"
                  required
                  placeholder="Username or team handle"
                  value={authForm.username}
                  onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                />
              </label>

              {authMode === 'signup' && (
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    placeholder="you@domain.com"
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </label>
              )}

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Enter your password (min 6 chars)"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </label>

              <div className="auth-toggle-row">
                {authMode === 'signin' ? (
                  <span>Don't have an account? <button type="button" className="inline-link" onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign up</button></span>
                ) : (
                  <span>Already have an account? <button type="button" className="inline-link" onClick={() => { setAuthMode('signin'); setAuthError(''); }}>Sign in</button></span>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setModal('')}>Cancel</button>
                <button type="submit" className="primary-button" disabled={authLoading}>
                  {authLoading ? 'Authenticating...' : (authMode === 'signup' ? 'Create Account' : 'Sign in')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal && modal !== 'auth' && (
        <Modal
          type={modal}
          task={selected}
          defaultAssignee={currentUser?.fullName || currentUser?.username || ''}
          onClose={() => setModal('')}
          onCreate={createTask}
          onHandoff={handoffTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  )
}

function Stat({ icon, label, value, foot, tone, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-trend ${tone}`}>{trend}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{foot}</div>
      <div className={`stat-accent ${tone}`} />
    </div>
  )
}

function TaskRow({ task, onHandoff, onStatus, onDelete }) {
  const [menu, setMenu] = useState(false)
  return (
    <article className="task-row">
      <div className={`task-symbol ${task.status.toLowerCase()}`}>
        {task.status === 'DONE' ? <Check size={17} /> : task.status === 'IN_REVIEW' ? <Clock3 size={17} /> : task.status === 'IN_PROGRESS' ? <Activity size={17} /> : <Command size={17} />}
      </div>
      <div className="task-main">
        <div className="task-title-line">
          <h3>{task.title}</h3>
          <span className={`priority priority-${(task.priority || 'MEDIUM').toLowerCase()}`}><i />{(task.priority || 'MEDIUM').toLowerCase()}</span>
        </div>
        <p>{task.description || 'No description added yet.'}</p>
        <div className="task-meta">
          <span className="assignee">
            <span className={`avatar avatar-${(task.assignee || 'a').charCodeAt(0) % 4}`}>{initials(task.assignee)}</span>
            {task.assignee}
          </span>
          <span className="meta-divider" />
          <span className="due-date"><Clock3 size={13} /> Due {niceDate(task.dueDate)}</span>
          {task.handoffNote && <span className="handoff-tag"><ArrowDownLeft size={12} /> Handoff note</span>}
          {task.previousOwner && <span className="prev-tag">From: {task.previousOwner}</span>}
        </div>
      </div>
      <div className="task-status">
        <select aria-label="Task status" className={`status-select status-${task.status.toLowerCase()}`} value={task.status} onChange={e => onStatus(e.target.value)}>
          {Object.entries(statusLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
      </div>
      <button className="handoff-button" onClick={onHandoff}><ArrowDownLeft size={15} /><span>Handoff</span></button>
      <div className="task-menu-wrap">
        <button className="dots-button" onClick={() => setMenu(!menu)} aria-label="Task options"><MoreHorizontal size={19} /></button>
        {menu && (
          <div className="dropdown">
            <button onClick={() => { setMenu(false); onHandoff() }}><ArrowDownLeft size={14} /> Handoff task</button>
            <button className="danger-action" onClick={() => { setMenu(false); onDelete() }}><X size={14} /> Delete task</button>
          </div>
        )}
      </div>
    </article>
  )
}

function Modal({ type, task, defaultAssignee, onClose, onCreate, onHandoff, onDelete }) {
  const [form, setForm] = useState({ title: '', description: '', assignee: defaultAssignee || '', priority: 'MEDIUM', dueDate: '' })
  const [nextAssignee, setNextAssignee] = useState('')
  const [note, setNote] = useState('')
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })

  useEffect(() => {
    if (type === 'handoff' && task) setNextAssignee(task.assignee || '')
  }, [type, task])

  if (type === 'delete') {
    return (
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="modal-card small-modal" onMouseDown={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
          <div className="modal-icon danger-icon"><X size={20} /></div>
          <h2>Delete this task?</h2>
          <p className="modal-description">&ldquo;{task?.title}&rdquo; will be permanently deleted from the database.</p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="delete-button" onClick={() => onDelete(task)}>Delete task</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>
        <div className="modal-icon">{type === 'create' ? <Plus size={20} /> : <ArrowDownLeft size={20} />}</div>
        <div className="modal-eyebrow">{type === 'create' ? 'ADD TO YOUR WORKSPACE' : 'KEEP THE MOMENTUM'}</div>
        <h2>{type === 'create' ? 'Create a new task' : 'Hand off this task'}</h2>
        <p className="modal-description">{type === 'create' ? 'Assign next action with clear requirements.' : `Pass “${task?.title}” to the right owner with complete context.`}</p>

        {type === 'create' ? (
          <form onSubmit={e => { e.preventDefault(); onCreate(form); }} className="modal-form">
            <label>Task title<input name="title" required maxLength="120" value={form.title} onChange={change} placeholder="e.g. Implement authentication controller" /></label>
            <label>Description<textarea name="description" maxLength="1000" value={form.description} onChange={change} placeholder="What needs to be done?" rows="3" /></label>
            <div className="form-two">
              <label>Assignee<input name="assignee" required maxLength="100" value={form.assignee} onChange={change} placeholder="Assignee name" /></label>
              <label>Priority
                <select name="priority" value={form.priority} onChange={change}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
            </div>
            <label>Due date<input type="date" name="dueDate" value={form.dueDate} onChange={change} /></label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-button"><Plus size={16} /> Create task</button>
            </div>
          </form>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (nextAssignee.trim() && note.trim()) onHandoff(task, nextAssignee.trim(), note.trim()) }} className="modal-form">
            <div className="handoff-summary">
              <div className="summary-icon"><ArrowRight size={17} /></div>
              <div>
                <strong>{task?.title}</strong>
                <span>Currently assigned to {task?.assignee}</span>
              </div>
            </div>
            <label>Hand off to<input required maxLength="100" value={nextAssignee} onChange={e => setNextAssignee(e.target.value)} placeholder="Next team member" /></label>
            <label>Handoff notes<textarea required maxLength="1000" value={note} onChange={e => setNote(e.target.value)} placeholder="What was completed? Any blockers or links?" rows="4" /></label>
            <div className="context-tip">
              <Sparkles size={15} />
              <span>Great handoffs include status, branch name, blockers, and what to verify next.</span>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-button"><ArrowDownLeft size={16} /> Confirm handoff</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
