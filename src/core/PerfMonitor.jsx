const NUMBER = new Intl.NumberFormat('fr-FR')

export function PerfMonitor({ stats }) {
  return (
    <aside className="perf-monitor" aria-live="polite">
      <h2>Perf</h2>
      <dl>
        <div>
          <dt>FPS</dt>
          <dd>{stats.fps}</dd>
        </div>
        <div>
          <dt>CPU</dt>
          <dd>{stats.cpu.toFixed(2)} ms</dd>
        </div>
        <div>
          <dt>Calls</dt>
          <dd>{NUMBER.format(stats.calls)}</dd>
        </div>
        <div>
          <dt>Triangles</dt>
          <dd>{NUMBER.format(stats.triangles)}</dd>
        </div>
        <div>
          <dt>Geo</dt>
          <dd>{NUMBER.format(stats.geometries)}</dd>
        </div>
        <div>
          <dt>Tex</dt>
          <dd>{NUMBER.format(stats.textures)}</dd>
        </div>
      </dl>
    </aside>
  )
}
