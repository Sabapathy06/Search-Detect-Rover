import { useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import Sidebar, { NAV_ITEMS } from './components/Sidebar'
import DashboardOverview from './components/DashboardOverview'
import LiveCamera from './components/LiveCamera'
import DetectedPersons from './components/DetectedPersons'
import PriorityQueue from './components/PriorityQueue'
import SurvivorTriage from './components/SurvivorTriage'
import SearchFilter from './components/SearchFilter'
import MissionLog from './components/MissionLog'
import RoverStatus from './components/RoverStatus'
import SensorPanel from './components/SensorPanel'
import MissionMap from './components/MissionMap'
import AlertsPanel from './components/AlertsPanel'
import MissionStatistics from './components/MissionStatistics'
import PersonDetailsModal from './components/PersonDetailsModal'
import { usePersons } from './hooks/usePersons'
import { useBackendHealth } from './hooks/useBackendHealth'
import { useCameraHealth } from './hooks/useCameraHealth'
import { useDemoBattery } from './hooks/useDemoBattery'
import { api } from './api/client'
import { normalizePriority, sortPersons } from './utils/priority'
import { displayPersonName } from './utils/format'

function App() {
  const { persons, active, stats, loading, refreshing, error, reload } = usePersons()
  const { online, status, missionLog } = useBackendHealth()
  const cameraConnected = useCameraHealth()
  const batteryLevel = useDemoBattery()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')

  const dates = useMemo(() => [...new Set(persons.map((person) => person.date).filter(Boolean))], [persons])
  const sources = useMemo(() => [...new Set(persons.map((person) => person.source).filter(Boolean))], [persons])

  const filteredPersons = useMemo(() => {
    let next = [...persons]
    if (search.trim()) {
      const query = search.trim().toLowerCase()
      next = next.filter((person) =>
        person.person_id?.toLowerCase().includes(query) ||
        displayPersonName(person).toLowerCase().includes(query),
      )
    }
    if (priorityFilter !== 'ALL') {
      next = next.filter((person) => normalizePriority(person.priority_level) === priorityFilter)
    }
    if (dateFilter !== 'ALL') {
      next = next.filter((person) => person.date === dateFilter)
    }
    if (sourceFilter !== 'ALL') {
      next = next.filter((person) => person.source === sourceFilter)
    }
    if (sortBy === 'priority') {
      next = sortPersons(next)
    } else if (sortBy === 'oldest') {
      next.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    } else {
      next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    }
    return next
  }, [persons, search, priorityFilter, dateFilter, sourceFilter, sortBy])

  const handlePriorityChange = async (person, level) => {
    setActionBusy(true)
    try {
      await api.updatePriority(person.person_id, { level })
      await reload(true)
      if (selectedPerson?.person_id === person.person_id) {
        setSelectedPerson((current) => current ? { ...current, priority_level: level } : current)
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async (person) => {
    const identifier = person.person_id || person.filename || person.id
    if (!window.confirm(`Delete person ${identifier}?`)) return
    setActionBusy(true)
    try {
      await api.deletePerson(identifier)
      if (selectedPerson?.person_id === person.person_id) setSelectedPerson(null)
      await reload(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setActionBusy(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all detected persons and images?')) return
    setActionBusy(true)
    try {
      await api.deleteAllPersons()
      setSelectedPerson(null)
      await reload(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setActionBusy(false)
    }
  }

  const handleNameChange = async (person, name) => {
    setActionBusy(true)
    try {
      await api.updatePersonName(person.person_id, name)
      await reload(true)
      if (selectedPerson?.person_id === person.person_id) {
        setSelectedPerson((current) => current ? { ...current, name: name.trim() } : current)
      }
    } catch (err) {
      alert(err.message)
      throw err
    } finally {
      setActionBusy(false)
    }
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="section-stack">
            <DashboardOverview stats={stats} backendOnline={online} />
            <div className="two-column">
              <MissionStatistics stats={stats} />
              <AlertsPanel events={missionLog} />
            </div>
            <LiveCamera onCaptured={() => reload(true)} backendOnline={online} />
          </div>
        )
      case 'camera':
        return <LiveCamera onCaptured={() => reload(true)} backendOnline={online} />
      case 'persons':
        return (
          <div className="section-stack">
            <SearchFilter
              search={search}
              onSearchChange={setSearch}
              priority={priorityFilter}
              onPriorityChange={setPriorityFilter}
              date={dateFilter}
              onDateChange={setDateFilter}
              source={sourceFilter}
              onSourceChange={setSourceFilter}
              dates={dates}
              sources={sources}
            />
            <DetectedPersons
              persons={filteredPersons}
              loading={loading}
              onView={setSelectedPerson}
              onDelete={handleDelete}
              onNameChange={handleNameChange}
              onPriorityChange={handlePriorityChange}
              onDeleteAll={handleDeleteAll}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        )
      case 'queue':
        return <PriorityQueue persons={active} onView={setSelectedPerson} onPriorityChange={handlePriorityChange} />
      case 'triage':
        return <SurvivorTriage persons={active} onPriorityChange={handlePriorityChange} />
      case 'map':
        return <MissionMap persons={persons} systemStatus={status} />
      case 'log':
        return <MissionLog events={missionLog} loading={refreshing} />
      case 'rover':
        return (
          <div className="two-column">
            <RoverStatus systemStatus={status} backendOnline={online} cameraConnected={cameraConnected} batteryLevel={batteryLevel} />
            <SensorPanel systemStatus={status} batteryLevel={batteryLevel} />
          </div>
        )
      case 'settings':
        return (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Configuration</p>
                <h2>Settings</h2>
              </div>
            </div>
            <div className="settings-grid">
              <article className="settings-card">
                <h3>Camera Source</h3>
                <p>Use Local Webcam for development. Switch to Backend Stream when ESP32-CAM is connected through the rescue server.</p>
              </article>
              <article className="settings-card">
                <h3>Backend Proxy</h3>
                <p>Frontend communicates with <code>http://127.0.0.1:8000</code> through the Vite dev proxy.</p>
              </article>
              <article className="settings-card">
                <h3>Upload Directory</h3>
                <p>Images are stored in <code>static/uploads/</code> and indexed automatically on refresh.</p>
              </article>
            </div>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <div className="command-center">
      <Header backendOnline={online} systemStatus={status} cameraConnected={cameraConnected} batteryLevel={batteryLevel} />
      <div className="command-layout">
        <button type="button" className="mobile-nav-toggle" onClick={() => setMobileNavOpen(true)}>
          <Menu size={18} /> Menu
        </button>
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <main className="command-main">
          {error ? <div className="banner error">{error}</div> : null}
          {actionBusy ? <div className="banner info">Processing request...</div> : null}
          {renderSection()}
        </main>
      </div>
      <nav className="mobile-bottom-nav">
        {NAV_ITEMS.slice(0, 5).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={activeSection === id ? 'active' : ''}
            onClick={() => setActiveSection(id)}
          >
            <Icon size={16} />
            <span>{label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
      <PersonDetailsModal
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onDelete={handleDelete}
        onPriorityChange={handlePriorityChange}
        busy={actionBusy}
      />
    </div>
  )
}

export default App
