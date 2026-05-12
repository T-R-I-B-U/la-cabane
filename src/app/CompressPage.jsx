import { useState, useEffect, useCallback } from 'react'
import './CompressPage.css'

const SIZE_OPTIONS = ['256', '512', '1024', '2048', 'original']
const DEFAULT_SIZE = '1024'

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function ktx2BaseName(url) {
  const name = url.split('/').at(-1)
  return name.replace(/\.(png|jpe?g)$/i, '.ktx2')
}

export default function CompressPage() {
  const [textures, setTextures] = useState([])
  const [ktx2Set, setKtx2Set] = useState(new Set())
  const [sizes, setSizes] = useState({})
  const [globalSize, setGlobalSize] = useState(DEFAULT_SIZE)
  const [status, setStatus] = useState({}) // url → 'idle' | 'running' | 'done' | 'error'
  const [logs, setLogs] = useState({}) // url → string (last log line)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.getElementById('root').style.overflow = 'auto'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.getElementById('root').style.overflow = ''
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [texRes, ktx2Res] = await Promise.all([
        fetch('/api/compress/textures'),
        fetch('/api/compress/ktx2-status'),
      ])
      if (!texRes.ok) throw new Error(`/api/compress/textures → ${texRes.status}`)
      const texList = await texRes.json()
      const ktx2List = await ktx2Res.json()

      setTextures(texList)
      setKtx2Set(new Set(ktx2List.map((url) => url.split('/').at(-1))))
      setSizes(Object.fromEntries(texList.map((t) => [t.url, DEFAULT_SIZE])))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const convert = useCallback(async (url, size) => {
    setStatus((s) => ({ ...s, [url]: 'running' }))
    setLogs((l) => ({ ...l, [url]: '' }))

    try {
      const res = await fetch('/api/compress/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texture: url, size }),
      })

      if (!res.ok) {
        const text = await res.text()
        let msg = text
        try {
          msg = JSON.parse(text).error ?? text
        } catch {
          /* empty */
        }
        throw new Error(msg)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let evt
          try {
            evt = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          if (evt.type === 'log') {
            setLogs((l) => ({ ...l, [url]: evt.text.trim() }))
          } else if (evt.type === 'done') {
            setStatus((s) => ({ ...s, [url]: 'done' }))
            setKtx2Set((prev) => {
              const next = new Set(prev)
              next.add(ktx2BaseName(url))
              return next
            })
          } else if (evt.type === 'error') {
            throw new Error(evt.text)
          }
        }
      }
    } catch (err) {
      setStatus((s) => ({ ...s, [url]: 'error' }))
      setLogs((l) => ({ ...l, [url]: err.message }))
    }
  }, [])

  const convertAll = useCallback(async () => {
    for (const t of textures) {
      if (status[t.url] === 'running') continue
      await convert(t.url, sizes[t.url] ?? globalSize)
    }
  }, [textures, sizes, globalSize, status, convert])

  const doneCount = textures.filter((t) => ktx2Set.has(ktx2BaseName(t.url))).length
  const filtered = search
    ? textures.filter((t) => t.url.split('/').at(-1).toLowerCase().includes(search.toLowerCase()))
    : textures

  return (
    <div className="cp-root">
      <header className="cp-header">
        <h1 className="cp-title">Texture Compressor</h1>
        <input
          className="cp-search"
          type="search"
          placeholder="filter by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="cp-controls">
          <label className="cp-label">
            Global size
            <select
              className="cp-select"
              value={globalSize}
              onChange={(e) => {
                const val = e.target.value
                setGlobalSize(val)
                setSizes((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, val])))
              }}
            >
              {SIZE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === 'original' ? 'original' : `${o}px`}
                </option>
              ))}
            </select>
          </label>
          <button className="cp-btn cp-btn--primary" onClick={convertAll}>
            Convert all
          </button>
          <span className="cp-count">
            {doneCount} / {textures.length} converted
            {search ? ` · ${filtered.length} shown` : ''}
          </span>
        </div>
      </header>

      {loading && <p className="cp-msg">Loading textures…</p>}
      {error && <p className="cp-msg cp-msg--error">Error: {error}</p>}

      {!loading && !error && (
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Dims</th>
                <th>Original</th>
                <th>KTX2</th>
                <th>Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const name = t.url.split('/').at(-1)
                const ktx2Done = ktx2Set.has(ktx2BaseName(t.url))
                const st = status[t.url] ?? 'idle'
                const log = logs[t.url] ?? ''
                return (
                  <tr key={t.url} className={`cp-row cp-row--${st}`}>
                    <td className="cp-thumb">
                      <img src={t.url} alt="" loading="lazy" className="cp-thumb-img" />
                    </td>
                    <td className="cp-name" title={t.url}>
                      {name}
                    </td>
                    <td className="cp-dims">
                      {t.width && t.height ? `${t.width}×${t.height}` : '—'}
                    </td>
                    <td className="cp-size">{t.size ? formatBytes(t.size) : '—'}</td>
                    <td className="cp-badge">
                      {ktx2Done ? (
                        <span className="cp-badge--done">✓ ktx2</span>
                      ) : (
                        <span className="cp-badge--none">—</span>
                      )}
                    </td>
                    <td className="cp-sel">
                      <select
                        className="cp-select cp-select--sm"
                        value={sizes[t.url] ?? DEFAULT_SIZE}
                        onChange={(e) => setSizes((prev) => ({ ...prev, [t.url]: e.target.value }))}
                        disabled={st === 'running'}
                      >
                        {SIZE_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o === 'original' ? 'orig' : `${o}px`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="cp-action">
                      <button
                        className="cp-btn"
                        onClick={() => convert(t.url, sizes[t.url] ?? DEFAULT_SIZE)}
                        disabled={st === 'running'}
                      >
                        {st === 'running' ? '…' : 'Convert'}
                      </button>
                      {log && <span className="cp-log">{log}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
