import PersonCard from './PersonCard'

export default function DetectedPersons({
  persons,
  loading,
  onView,
  onDelete,
  onNameChange,
  onPriorityChange,
  onDeleteAll,
  sortBy,
  onSortChange,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Survivor Records</p>
          <h2>Detected Persons</h2>
        </div>
        <div className="panel-actions">
          <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="priority-select compact">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
          </select>
          {persons.length > 0 ? (
            <button type="button" className="btn danger" onClick={onDeleteAll}>Delete All</button>
          ) : null}
        </div>
      </div>
      {loading ? <p className="loading-text">Loading persons...</p> : null}
      <div className="person-grid">
        {persons.length ? persons.map((person) => (
          <PersonCard
            key={`${person.person_id}-${person.id}`}
            person={person}
            onView={onView}
            onDelete={onDelete}
            onNameChange={onNameChange}
            onPriorityChange={onPriorityChange}
          />
        )) : (
          <p className="empty-state">No persons detected yet.</p>
        )}
      </div>
    </section>
  )
}
