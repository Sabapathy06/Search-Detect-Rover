import { Search } from 'lucide-react'

export default function SearchFilter({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  date,
  onDateChange,
  source,
  onSourceChange,
  dates,
  sources,
}) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <label className="filter-field">
          <span>Search Person</span>
          <div className="search-input">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search Person ID or Name"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </label>
        <label className="filter-field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => onPriorityChange(event.target.value)}>
            <option value="ALL">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Date</span>
          <select value={date} onChange={(event) => onDateChange(event.target.value)}>
            <option value="ALL">All Dates</option>
            {dates.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Source</span>
          <select value={source} onChange={(event) => onSourceChange(event.target.value)}>
            <option value="ALL">All</option>
            {sources.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
