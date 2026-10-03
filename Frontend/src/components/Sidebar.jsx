import {
  Camera,
  ClipboardList,
  Gauge,
  History,
  LayoutDashboard,
  Map,
  Settings,
  Users,
  ListOrdered,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'camera', label: 'Live Camera', icon: Camera },
  { id: 'persons', label: 'Detected Persons', icon: Users },
  { id: 'queue', label: 'Priority Queue', icon: ListOrdered },
  { id: 'triage', label: 'Survivor Triage', icon: ClipboardList },
  { id: 'map', label: 'Mission Map', icon: Map },
  { id: 'log', label: 'Mission Log', icon: History },
  { id: 'rover', label: 'Rover Status', icon: Gauge },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeSection, onNavigate, mobileOpen, onClose }) {
  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-title">Navigation</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-link ${activeSection === id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(id)
                onClose?.()
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      {mobileOpen ? <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close menu" /> : null}
    </>
  )
}

export { NAV_ITEMS }
