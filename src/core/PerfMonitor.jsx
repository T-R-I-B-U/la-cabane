const N = new Intl.NumberFormat('fr-FR')

function Row({ label, value, unit }) {
  return (
    <div className="pm-row">
      <dt className="pm-label">{label}</dt>
      <dd className="pm-value">
        {value}
        {unit && <span className="pm-unit"> {unit}</span>}
      </dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="pm-section">
      <p className="pm-section-title">{title}</p>
      <dl className="pm-grid">{children}</dl>
    </div>
  )
}

/**
 * @param {{ fps, frameMs, calls, triangles, geometries, textures }} stats
 * @param {{ meshes, pivots } | null} scene
 * @param {'loading'|'ok'|'error'} status
 */
export function PerfMonitor({ stats, scene, status }) {
  const fpsColor =
    stats.fps === 0
      ? '#8899aa'
      : stats.fps >= 55
        ? '#22dd88'
        : stats.fps >= 30
          ? '#f5a623'
          : '#e0443a'

  return (
    <aside className="perf-monitor">
      <header className="pm-header">
        <span className="pm-title">Scene Debug</span>
        <span className="pm-status" data-status={status}>
          {status === 'loading' ? 'chargement…' : status === 'error' ? 'erreur' : 'ok'}
        </span>
      </header>

      <Section title="Rendu">
        <Row label="FPS" value={<span style={{ color: fpsColor }}>{stats.fps}</span>} />
        <Row label="Frame" value={stats.frameMs.toFixed(2)} unit="ms" />
        <Row label="Draw calls" value={N.format(stats.calls)} />
        <Row label="Triangles" value={N.format(stats.triangles)} />
      </Section>

      <Section title="Mémoire GPU">
        <Row label="Géométries" value={N.format(stats.geometries)} />
        <Row label="Textures" value={N.format(stats.textures)} />
      </Section>

      <Section title="Scène">
        <Row label="Meshes" value={scene ? N.format(scene.meshes) : '—'} />
        <Row label="Pivots vides" value={scene ? N.format(scene.pivots) : '—'} />
      </Section>
    </aside>
  )
}
