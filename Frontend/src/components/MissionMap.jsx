import { MapPin } from 'lucide-react'

export default function MissionMap({ persons, systemStatus }) {
  const hasGps = systemStatus?.gps?.locked
  const locatedPersons = persons.filter((person) => person.latitude != null && person.longitude != null)

  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Geospatial View</p>
          <h2>Mission Map</h2>
        </div>
      </div>
      {!hasGps ? (
        <div className="map-placeholder">
          <MapPin size={42} />
          <h3>GPS / Mapping module not connected</h3>
          <p>Map view will activate when rover GPS telemetry becomes available.</p>
        </div>
      ) : (
        <div className="map-canvas">
          <p>Rover position and {locatedPersons.length} located detections will render here.</p>
        </div>
      )}
    </section>
  )
}
