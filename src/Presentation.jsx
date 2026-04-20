import buildInfo from './build-info.json'
import './presentation.css'

// ————— Helpers —————
function parseCommitSubject(subject) {
  // Conventional commits: type(scope)?: message
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/)
  if (!m) return { type: 'chore', scope: null, msg: subject }
  return { type: m[1], scope: m[2] ?? null, msg: m[3] }
}

function relativeTime(ts, refMs) {
  const diff = Math.max(0, refMs - ts)
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'à l’instant'
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hier'
  return `il y a ${d} j`
}

function cleanVersion(raw) {
  // "^0.183.2" → "0.183"
  if (!raw) return ''
  const v = raw.replace(/^[\^~]/, '')
  const parts = v.split('.')
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v
}

function formatBuiltAt(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ————— Derived data —————
const V = buildInfo.versions
const STACK = [
  { tool: 'Three.js', ver: cleanVersion(V.three), role: 'Moteur WebGL — scène, caméra, renderer' },
  { tool: 'React Three Fiber', ver: cleanVersion(V.fiber), role: 'Three.js en JSX déclaratif' },
  { tool: '@react-three/drei', ver: cleanVersion(V.drei), role: 'Loaders, helpers, controls' },
  { tool: 'React', ver: cleanVersion(V.react), role: 'Overlay UI sur le canvas' },
  { tool: 'Vite', ver: cleanVersion(V.vite), role: 'Bundler + HMR' },
  { tool: 'vite-plugin-glsl', ver: cleanVersion(V.glsl), role: 'Import natif de shaders .glsl' },
  { tool: 'Cinema 4D', ver: '→ .glb', role: 'Export des modèles 3D' },
  { tool: 'GLTFLoader', ver: 'runtime', role: 'Chargement des assets au runtime' },
  { tool: 'ESLint', ver: 'flat', role: 'JSX linting' },
]

const BUILT_MS = new Date(buildInfo.builtAt).getTime()
const COMMITS = buildInfo.commits.map((c) => ({
  hash: c.hash,
  when: relativeTime(c.ts, BUILT_MS),
  ...parseCommitSubject(c.subject),
}))

// Player state: lu depuis les derniers commits `chore: player height…` serait fragile.
// On garde un snapshot figé mais documenté.
const PLAYER_STATE = [
  { k: 'Height', v: '2.2', unit: 'units', delta: '← 2.1' },
  { k: 'Walk speed', v: '0.09', unit: 'u/frame', delta: '← 0.06' },
  { k: 'FOV caméra', v: '62°', unit: '', delta: 'stable' },
]

const BRANCHES = [
  { p: 'feat/', d: 'Nouvelle feature' },
  { p: 'fix/', d: 'Correction de bug' },
  { p: 'style/', d: 'CSS / animation / rendu' },
  { p: 'refactor/', d: 'Restructuration interne' },
  { p: 'devtools/', d: 'Config, build, tooling' },
  { p: 'docs/', d: 'Documentation uniquement' },
  { p: 'chore/', d: 'Maintenance, cleanup' },
]

// ————— Components —————
function TopBar() {
  return (
    <header className="topbar">
      <div className="brandmark">
        <span className="dot" />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400, letterSpacing: '-0.01em' }}>
          La Cabane
        </span>
        <span style={{ color: 'var(--ink-mute)' }}>/</span>
        <span>gobelins · 2026</span>
      </div>
      <nav>
        <a href="#pitch">Pitch</a>
        <a href="#stack">Stack</a>
        <a href="#architecture">Architecture</a>
        <a href="#devlog">Devlog</a>
        <a href="#workflow">Workflow</a>
      </nav>
      <div className="meta">
        <span>branch · <em>develop</em></span>
        <span style={{ width: 1, height: 12, background: 'var(--line)' }} />
        <span style={{ color: 'var(--accent-2)' }}>● en développement</span>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-label">Projet d'école — Gobelins · Promo 2026</div>
      <h1>
        Une <em>cabane</em>
        <br />
        à l'échelle du web.
      </h1>
      <p className="hero-lede">
        Expérience WebGL interactive explorable à la première personne, conçue en binôme.
        Une architecture 3D bâtie dans Cinema&nbsp;4D, un moteur Three.js piloté par React,
        et des shaders qui font pousser les fruits.
      </p>
      <div className="hero-grid">
        <div>
          <span className="k">Team</span>
          <span className="v">2 dev · binôme</span>
        </div>
        <div>
          <span className="k">Jury</span>
          <span className="v">3 juin 2026</span>
        </div>
        <div>
          <span className="k">Branche</span>
          <span className="v mono">develop</span>
        </div>
        <div>
          <span className="k">Statut</span>
          <span className="v">Itérations actives</span>
        </div>
      </div>
    </section>
  )
}

function Section({ num, label, title, titleEm, kicker, children }) {
  return (
    <section className="block" id={label?.toLowerCase()}>
      <div className="sec-head">
        <span className="sec-num">
          <b>{num}</b>
          {label}
        </span>
        <h2 className="sec-title">
          {title}
          {titleEm && (
            <>
              {' '}
              <em>{titleEm}</em>
            </>
          )}
        </h2>
      </div>
      <div className="sec-body">
        <p>{kicker}</p>
        <div>{children}</div>
      </div>
    </section>
  )
}

function Pitch() {
  return (
    <Section num="01" label="Pitch" title="Un espace 3D à" titleEm="habiter." kicker="Intention & cadre">
      <p className="pitch-text">
        <strong>La Cabane</strong> est une expérience WebGL navigable à la première personne.
        Le joueur découvre un environnement construit comme un décor de théâtre : une cabane
        perchée, une serre, un nid, des escaliers, un comptoir. Les objets interactifs réagissent
        à la proximité du joueur via des shaders custom et un système d'événements découplé.
      </p>
      <div className="pitch-tags">
        <span className="tag accent">WebGL</span>
        <span className="tag">Exploration à la première personne</span>
        <span className="tag">Shaders custom</span>
        <span className="tag">Audio spatialisé</span>
        <span className="tag">Cinema 4D pipeline</span>
      </div>
    </Section>
  )
}

function Stack() {
  return (
    <Section num="02" label="Stack" title="Outils" titleEm="choisis." kicker={`${STACK.length} dépendances clés`}>
      <div className="stack-grid">
        {STACK.map((s, i) => (
          <div className="stack-cell" key={s.tool}>
            <span className="idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="tool">{s.tool}</span>
            <span className="ver">{s.ver}</span>
            <span className="role">{s.role}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Architecture() {
  return (
    <Section num="03" label="Architecture" title="Deux couches," titleEm="zéro fuite." kicker="React ↔ Three.js">
      <pre className="arch-diagram">
{`index.html
  └── #root  ────────────────────────────  React DOM
        ├── App.jsx                          entrée React, monte le canvas
        │     └── [UI components]            pure DOM / React state
        └── <canvas>                         appartient à Three.js

`}
        <span className="hl">WebGL layer</span>
{`  src/core/
        SceneManager                         scène, renderer, caméra
        Loop                                 requestAnimationFrame, delta
        Loader                               GLTF · Audio · Texture
        World.js                             orchestre toutes les entités

`}
        <span className="hl2">Content layer</span>
{`  src/world/
        entities/                            une classe par objet 3D
        materials/                           matériaux / shaders

`}
        <span className="comment">{`// Communication exclusive via EventEmitter :
// React → emit() → handler Three.js
// Three.js → emit() → React setState`}</span>
      </pre>

      <div className="arch-rules">
        <div className="arch-rule">
          <h4>Règle 1 — Isolation</h4>
          <p>
            <code>core/</code> est agnostique du contenu. C'est un moteur générique sans aucune
            logique propre au projet.
          </p>
        </div>
        <div className="arch-rule">
          <h4>Règle 2 — Entités</h4>
          <p>
            Chaque fichier de <code>world/entities/</code> expose exactement <code>init()</code>{' '}
            et <code>update(delta)</code>.
          </p>
        </div>
        <div className="arch-rule">
          <h4>Règle 3 — Utils</h4>
          <p>
            <code>utils/</code> est stateless et n'importe jamais Three.js. L'EventEmitter vit ici.
          </p>
        </div>
        <div className="arch-rule">
          <h4>Règle 4 — Assets</h4>
          <p>
            <code>public/</code> est servi statiquement et chargé au runtime. Jamais bundlé par Vite.
          </p>
        </div>
      </div>
    </Section>
  )
}

function DevLog() {
  const head = COMMITS[0]?.hash ?? '—'
  return (
    <Section
      num="04"
      label="Devlog"
      title="Derniers"
      titleEm="commits."
      kicker={`source · ${buildInfo.sourceRef}`}
    >
      <div className="devlog-head">
        <span className="branch">{buildInfo.sourceRef}</span>
        <span>
          {COMMITS.length} commits · HEAD @ {head}
        </span>
      </div>
      <ul className="commit-list">
        {COMMITS.map((c, i) => (
          <li className="commit" key={c.hash}>
            <span className="graph">{i === 0 ? '●' : '○'}</span>
            <span className="hash">{c.hash}</span>
            <span className="msg">
              <span className="type">{c.type}</span>
              {c.scope && <span className="scope">({c.scope})</span>}
              <span className="scope">: </span>
              {c.msg}
            </span>
            <span className="when">{c.when}</span>
          </li>
        ))}
      </ul>

      <div className="player-state">
        {PLAYER_STATE.map((p) => (
          <div className="ps-cell" key={p.k}>
            <div className="k">{p.k}</div>
            <div className="v">
              {p.v}
              {p.unit && <small>{p.unit}</small>}
            </div>
            <div className="delta">{p.delta}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Workflow() {
  return (
    <Section num="05" label="Workflow" title="Git" titleEm="discipline." kicker="Conventions partagées">
      <div className="workflow-grid">
        <div className="wf-col">
          <h4>Préfixes de branches</h4>
          <ul className="branch-list">
            {BRANCHES.map((b) => (
              <li key={b.p}>
                <span className="prefix">{b.p}</span>
                <span className="desc">{b.d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="wf-col">
          <h4>Format de commit</h4>
          <pre className="commit-example">{`<type>(<scope>): <description ≤ 72>

<body: quoi, pourquoi, comment>`}</pre>
          <pre className="commit-example" style={{ marginTop: 12 }}>
            <span className="type">feat</span>(<span className="scope">entities</span>): add TribeTree class with init + update{'\n'}
            <span className="type">fix</span>(<span className="scope">loader</span>): correct Draco decoder path in prod{'\n'}
            <span className="type">style</span>(<span className="scope">ui</span>): update overlay opacity transition
          </pre>
          <p className="workflow-note">
            ⛔ Jamais de commit direct sur <b>main</b>. Release via PR <code>develop → main</code>,
            puis tag <code>v0.x.y</code>.
          </p>
        </div>
      </div>
    </Section>
  )
}

function StatusStrip() {
  const modelCount = 3
  return (
    <section className="status-strip">
      <div>
        <div className="k">Jury</div>
        <div className="v">
          <span className="countdown-dot" />3 juin 2026
        </div>
      </div>
      <div>
        <div className="k">Temps restant</div>
        <div className="v">≈ {buildInfo.daysUntilJury} jours</div>
      </div>
      <div>
        <div className="k">Modèles actifs</div>
        <div className="v">{modelCount} · counter · growingfruit · hut</div>
      </div>
      <div>
        <div className="k">Version</div>
        <div className="v">v0.0.0-dev</div>
      </div>
    </section>
  )
}

function Foot() {
  return (
    <footer>
      <div>
        <div className="sig">« On finit toujours par habiter les endroits qu'on construit. »</div>
        <div style={{ marginTop: 12 }}>La Cabane · Projet d'école · Gobelins · Promo 2026</div>
      </div>
      <div className="legal">
        binôme · develop · eslint flat
        <br />
        dernière mise à jour · {formatBuiltAt(buildInfo.builtAt)}
      </div>
    </footer>
  )
}

export default function Presentation() {
  return (
    <div className="presentation">
      <div className="shell">
        <TopBar />
        <Hero />
      </div>
      <div className="shell"><Pitch /></div>
      <div className="shell"><Stack /></div>
      <div className="shell"><Architecture /></div>
      <div className="shell"><DevLog /></div>
      <div className="shell"><Workflow /></div>
      <div className="shell"><StatusStrip /></div>
      <div className="shell"><Foot /></div>
    </div>
  )
}
