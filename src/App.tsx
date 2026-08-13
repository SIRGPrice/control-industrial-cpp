import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  createInitialPlantState,
  defaultPlantConfig,
  setEmergencyStop,
  simulatedCode,
  stepPlant,
  togglePlant,
  type PlantConfig,
  type PlantState,
  type StationState,
  type StationStatus,
} from './simulator'

type IconName =
  | 'activity'
  | 'alert'
  | 'arrow'
  | 'book'
  | 'check'
  | 'check-circle'
  | 'chevron'
  | 'clock'
  | 'close'
  | 'code'
  | 'command'
  | 'copy'
  | 'flow'
  | 'grid'
  | 'layers'
  | 'link'
  | 'lock'
  | 'menu'
  | 'pause'
  | 'play'
  | 'queue'
  | 'reset'
  | 'search'
  | 'semaphore'
  | 'shield'
  | 'sliders'
  | 'step'
  | 'terminal'
  | 'thread'
  | 'users'
  | 'zap'

type SectionId =
  | 'overview'
  | 'learn'
  | 'lab'
  | 'semaphores'
  | 'queues'
  | 'threads'
  | 'patterns'
  | 'strategies'
  | 'reference'

interface NavItem {
  id: SectionId
  label: string
  description: string
  icon: IconName
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Ruta de aprendizaje',
    items: [
      { id: 'overview', label: 'Centro de control', description: 'Mapa general y punto de partida', icon: 'grid' as IconName },
      { id: 'learn', label: 'Ruta guiada', description: 'Aprende por capas', icon: 'book' as IconName },
      { id: 'lab', label: 'Laboratorio de planta', description: 'Simulación paso a paso', icon: 'activity' as IconName },
    ],
  },
  {
    label: 'Primitivas C++20',
    items: [
      { id: 'semaphores', label: 'Semáforos', description: 'Permisos y recursos limitados', icon: 'semaphore' as IconName },
      { id: 'queues', label: 'Queues', description: 'Buffers, flujo y backpressure', icon: 'queue' as IconName },
      { id: 'threads', label: 'Hilos y señales', description: 'Ciclo de vida y cancelación', icon: 'thread' as IconName },
    ],
  },
  {
    label: 'Diseño de sistemas',
    items: [
      { id: 'patterns', label: 'Patrones de control', description: 'Componer una línea robusta', icon: 'flow' as IconName },
      { id: 'strategies', label: 'Estrategias', description: 'Decisiones para una planta real', icon: 'layers' as IconName },
      { id: 'reference', label: 'Referencia rápida', description: 'Consulta mientras programas', icon: 'code' as IconName },
    ],
  },
]

const allNavItems = navGroups.flatMap((group) => group.items)

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'activity':
      return <svg {...common}><path d="M3 12h4l2.2-7 4.6 14L16 12h5" /></svg>
    case 'alert':
      return <svg {...common}><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v4M12 16h.01" /></svg>
    case 'arrow':
      return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
    case 'book':
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></svg>
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
    case 'check-circle':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></svg>
    case 'chevron':
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>
    case 'close':
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
    case 'code':
      return <svg {...common}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" /></svg>
    case 'command':
      return <svg {...common}><path d="M18 9V6a3 3 0 1 0-3-3h-3v6h6ZM9 6V3a3 3 0 1 0-3 3v3h6V3M6 15v3a3 3 0 1 0 3 3h3v-6H6ZM15 18v3a3 3 0 1 0 3-3v-3h-6v6" /></svg>
    case 'copy':
      return <svg {...common}><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></svg>
    case 'flow':
      return <svg {...common}><rect x="3" y="4" width="6" height="5" rx="1" /><rect x="15" y="15" width="6" height="5" rx="1" /><rect x="15" y="4" width="6" height="5" rx="1" /><path d="M9 6.5h6M6 9v5a3 3 0 0 0 3 3h6M18 9v6" /></svg>
    case 'grid':
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
    case 'layers':
      return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>
    case 'link':
      return <svg {...common}><path d="M10 13.8a4 4 0 0 0 5.8.2l2-2a4 4 0 0 0-5.7-5.6l-1.1 1.1" /><path d="M14 10.2a4 4 0 0 0-5.8-.2l-2 2a4 4 0 0 0 5.7 5.6l1.1-1.1" /></svg>
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>
    case 'menu':
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
    case 'pause':
      return <svg {...common}><path d="M8 5v14M16 5v14" /></svg>
    case 'play':
      return <svg {...common}><path d="m8 5 11 7-11 7V5Z" /></svg>
    case 'queue':
      return <svg {...common}><rect x="4" y="4" width="5" height="5" rx="1" /><rect x="4" y="10" width="5" height="5" rx="1" /><rect x="4" y="16" width="5" height="4" rx="1" /><path d="M13 6h7M13 12h7M13 18h7" /></svg>
    case 'reset':
      return <svg {...common}><path d="M4 5v5h5" /><path d="M5.5 15a8 8 0 1 0 .3-8.7L4 10" /></svg>
    case 'search':
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
    case 'semaphore':
      return <svg {...common}><path d="M6 21h12M9 18h6M12 3v15M7 6h10v8H7z" /><circle cx="9.5" cy="10" r="1" /><circle cx="14.5" cy="10" r="1" /></svg>
    case 'shield':
      return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>
    case 'sliders':
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></svg>
    case 'step':
      return <svg {...common}><path d="M5 5v14M9 12h10M15 8l4 4-4 4" /></svg>
    case 'terminal':
      return <svg {...common}><path d="m5 7 5 5-5 5M12 17h7" /></svg>
    case 'thread':
      return <svg {...common}><circle cx="7" cy="6" r="3" /><circle cx="17" cy="18" r="3" /><path d="M9.5 8.5 14.5 15.5M17 5v6M14 8h6" /></svg>
    case 'users':
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" /></svg>
    case 'zap':
      return <svg {...common}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></svg>
    default:
      return null
  }
}

function getInitialSection(): SectionId {
  const hash = window.location.hash.replace('#', '') as SectionId
  return allNavItems.some((item) => item.id === hash) ? hash : 'overview'
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>(getInitialSection)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleHash = () => {
      const next = window.location.hash.replace('#', '') as SectionId
      if (allNavItems.some((item) => item.id === next)) setActiveSection(next)
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const goTo = (section: SectionId) => {
    setActiveSection(section)
    setMobileOpen(false)
    setQuery('')
    window.history.replaceState(null, '', `#${section}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentItem = allNavItems.find((item) => item.id === activeSection) ?? allNavItems[0]
  const results = query.trim()
    ? allNavItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>CI</span><i /></div>
          <div>
            <strong>Control Industrial</strong>
            <span>C++20 / concurrencia aplicada</span>
          </div>
        </div>

        <div className="sidebar-system">
          <span className="status-dot" />
          <span>Entorno de aprendizaje</span>
          <span className="system-code">v1.0</span>
        </div>

        <nav className="side-nav" aria-label="Secciones de la documentación">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  key={item.id}
                  onClick={() => goTo(item.id)}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {item.id === 'lab' && <em>LIVE</em>}
                  {activeSection === item.id && <Icon name="chevron" size={14} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Icon name="terminal" size={16} />
            <div>
              <strong>Atajo rápido</strong>
              <span>Pulsa <kbd>/</kbd> para buscar</span>
            </div>
          </div>
          <span className="sidebar-credit">DOCUMENTACIÓN ABIERTA · 2025</span>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}>
              <Icon name="menu" size={21} />
            </button>
            <div className="breadcrumb"><span>DOCS</span><Icon name="chevron" size={13} /><strong>{currentItem.label}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="search-wrap">
              <Icon name="search" size={17} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en la guía..."
                aria-label="Buscar en la guía"
              />
              <kbd>/</kbd>
              {query && (
                <div className="search-results">
                  {results.length > 0 ? results.map((item) => (
                    <button key={item.id} onClick={() => goTo(item.id)}>
                      <Icon name={item.icon} size={16} />
                      <span><strong>{item.label}</strong><small>{item.description}</small></span>
                      <Icon name="arrow" size={15} />
                    </button>
                  )) : <span className="search-empty">No hay coincidencias. Prueba con “queue” o “deadlock”.</span>}
                </div>
              )}
            </div>
            <a className="github-link" href="https://github.com/SIRGPrice/control-industrial-cpp" target="_blank" rel="noreferrer">
              <span className="github-icon">●</span><span className="github-text">GitHub</span><Icon name="link" size={14} />
            </a>
          </div>
        </header>

        <main className="main-content">
          {activeSection === 'overview' && <OverviewPage goTo={goTo} />}
          {activeSection === 'learn' && <LearnPage goTo={goTo} />}
          {activeSection === 'lab' && <LabPage />}
          {activeSection === 'semaphores' && <SemaphoresPage goTo={goTo} />}
          {activeSection === 'queues' && <QueuesPage goTo={goTo} />}
          {activeSection === 'threads' && <ThreadsPage goTo={goTo} />}
          {activeSection === 'patterns' && <PatternsPage goTo={goTo} />}
          {activeSection === 'strategies' && <StrategiesPage goTo={goTo} />}
          {activeSection === 'reference' && <ReferencePage />}
        </main>

        <footer className="site-footer">
          <span><span className="footer-pulse" /> Diseñado para pensar en sistemas, no solo en APIs.</span>
          <span>CONTROL INDUSTRIAL / C++20</span>
        </footer>
      </div>
    </div>
  )
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: ReactNode; description: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow"><span className="eyebrow-line" />{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow"><span className="eyebrow-line" />{children}</span>
}

function PrimaryButton({ children, onClick, icon = 'arrow' as IconName }: { children: ReactNode; onClick?: () => void; icon?: IconName }) {
  return <button className="btn btn-primary" onClick={onClick}>{children}<Icon name={icon} size={16} /></button>
}

function SecondaryButton({ children, onClick, icon = 'chevron' as IconName }: { children: ReactNode; onClick?: () => void; icon?: IconName }) {
  return <button className="btn btn-secondary" onClick={onClick}>{children}<Icon name={icon} size={16} /></button>
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-title-row">
      <div><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2></div>
      {children && <div>{children}</div>}
    </div>
  )
}

function Metric({ value, label, detail, tone = 'blue', icon }: { value: string; label: string; detail: string; tone?: 'blue' | 'green' | 'amber' | 'red'; icon: IconName }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-top"><span>{label}</span><Icon name={icon} size={17} /></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function OverviewPage({ goTo }: { goTo: (section: SectionId) => void }) {
  return (
    <div className="page overview-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <Eyebrow>MANUAL DE CAMPO · EDICIÓN 01</Eyebrow>
          <h1>Coordina una planta.<br /><span>Domina el tiempo.</span></h1>
          <p className="hero-lead">Semáforos, queues y programación multihilo explicados desde la línea de producción hasta el último `join`.</p>
          <div className="hero-actions">
            <PrimaryButton onClick={() => goTo('lab')} icon="activity">Abrir laboratorio</PrimaryButton>
            <SecondaryButton onClick={() => goTo('learn')} icon="book">Empezar la ruta</SecondaryButton>
          </div>
          <div className="hero-note"><span className="hero-note-mark">↳</span><span>Una guía para ingenieros de control que necesitan convertir eventos físicos en un sistema concurrente predecible.</span></div>
        </div>
        <PlantHeroGraphic />
      </section>

      <section className="metric-grid">
        <Metric value="03" label="Primitivas núcleo" detail="Semáforos · queues · hilos" icon="semaphore" />
        <Metric value="08" label="Patrones de diseño" detail="Del buffer al shutdown" tone="green" icon="flow" />
        <Metric value="01" label="Planta simulada" detail="Ciclo reproducible y trazable" tone="amber" icon="activity" />
        <Metric value="C++20" label="Estándar base" detail="RAII · jthread · stop_token" tone="red" icon="code" />
      </section>

      <section className="signal-banner">
        <div className="signal-icon"><Icon name="zap" size={20} /></div>
        <div><strong>Principio de diseño</strong><span>El hilo que cambia una salida debe poder explicar por qué, cuándo y bajo qué permiso lo hizo.</span></div>
        <button onClick={() => goTo('strategies')}>Ver estrategias <Icon name="arrow" size={15} /></button>
      </section>

      <section className="home-section">
        <SectionTitle kicker="RUTA DE TRABAJO" title="Una planta en cuatro capas">
          <button className="text-link" onClick={() => goTo('learn')}>Ver ruta completa <Icon name="arrow" size={15} /></button>
        </SectionTitle>
        <div className="route-grid">
          <RouteCard number="01" title="Entender" copy="Modela recursos, eventos y límites antes de escribir un hilo." icon="book" tone="blue" onClick={() => goTo('learn')} />
          <RouteCard number="02" title="Sincronizar" copy="Usa permisos explícitos para que las estaciones no compitan a ciegas." icon="semaphore" tone="green" onClick={() => goTo('semaphores')} />
          <RouteCard number="03" title="Transportar" copy="Diseña queues con capacidad, ownership y una política de presión." icon="queue" tone="amber" onClick={() => goTo('queues')} />
          <RouteCard number="04" title="Operar" copy="Supervisa, cancela y recupera sin dejar hilos huérfanos." icon="shield" tone="red" onClick={() => goTo('strategies')} />
        </div>
      </section>

      <section className="home-section home-bottom-grid">
        <div className="principles-panel panel">
          <SectionTitle kicker="ANTES DEL CÓDIGO" title="Tres preguntas de ingeniería" />
          <div className="principle-list">
            <Principle index="01" title="¿Qué recurso se limita?" copy="Un permiso representa una capacidad real: válvulas, robots, slots o personas." />
            <Principle index="02" title="¿Dónde espera el trabajo?" copy="La espera debe ser visible, acotada y cancelable. Nunca escondida en un busy loop." />
            <Principle index="03" title="¿Cómo se detiene?" copy="Una parada segura forma parte del diseño normal, no es un parche de emergencia." />
          </div>
        </div>
        <div className="terminal-panel panel">
          <div className="terminal-head"><span><i /> <i /> <i /></span><small>plant_controller.cpp</small><span className="terminal-state">● LIVE TRACE</span></div>
          <div className="terminal-code">
            <span><b>01</b><em>std::counting_semaphore</em><i>&lt;3&gt; permits&#123;2&#125;;</i></span>
            <span><b>02</b><em>BoundedQueue</em><i>&lt;Batch&gt; buffer&#123;6&#125;;</i></span>
            <span><b>03</b><em>std::jthread</em><i> feeder&#123;run_feeder&#125;;</i></span>
            <span><b>04</b><em>std::jthread</em><i> station&#123;run_station&#125;;</i></span>
            <span><b>05</b><em>permits.acquire</em><i>();</i></span>
            <span><b>06</b><em>process</em><i>(buffer.pop());</i></span>
            <span><b>07</b><em>permits.release</em><i>();</i></span>
          </div>
          <div className="terminal-foot"><span className="pulse-mini" /> <span>7 líneas · 1 flujo coordinado</span><button onClick={() => goTo('lab')}>Ejecutar <Icon name="play" size={12} /></button></div>
        </div>
      </section>
    </div>
  )
}

function PlantHeroGraphic() {
  return (
    <div className="hero-graphic" aria-label="Esquema de una planta industrial coordinada">
      <div className="graphic-head"><span><i className="live-dot" /> PLANTA / LINEA 04</span><span>09:42:18 UTC</span></div>
      <div className="graphic-canvas">
        <div className="graphic-grid-lines" />
        <div className="graphic-route route-a" />
        <div className="graphic-route route-b" />
        <div className="graphic-route route-c" />
        <div className="graphic-node node-source"><span className="node-symbol">↗</span><small>INPUT</small><strong>Materia</strong></div>
        <div className="graphic-node node-buffer"><span className="node-symbol">≋</span><small>QUEUE / 06</small><strong>Buffer</strong></div>
        <div className="graphic-node node-core"><span className="node-symbol">◈</span><small>PERMITS / 02</small><strong>Core line</strong></div>
        <div className="graphic-node node-output"><span className="node-symbol">✓</span><small>OUTPUT</small><strong>Pack</strong></div>
        <div className="graphic-readout readout-top"><span>THROUGHPUT</span><strong>84.6 <small>u/h</small></strong><i>+12.8%</i></div>
        <div className="graphic-readout readout-bottom"><span>THREADS ACTIVE</span><strong>04</strong><div className="mini-bars"><i /><i /><i /><i /><i /></div></div>
        <div className="graphic-crosshair" />
      </div>
      <div className="graphic-foot"><span><i className="legend-dot green" /> FLOW</span><span><i className="legend-dot amber" /> WAIT</span><span><i className="legend-dot blue" /> SYNC</span><span className="graphic-foot-right">SYS / NOMINAL</span></div>
    </div>
  )
}

function RouteCard({ number, title, copy, icon, tone, onClick }: { number: string; title: string; copy: string; icon: IconName; tone: string; onClick: () => void }) {
  return <button className={`route-card route-${tone}`} onClick={onClick}><span className="route-number">{number}</span><span className="route-icon"><Icon name={icon} size={19} /></span><strong>{title}</strong><p>{copy}</p><span className="route-arrow"><Icon name="arrow" size={15} /></span></button>
}

function Principle({ index, title, copy }: { index: string; title: string; copy: string }) {
  return <div className="principle"><span>{index}</span><div><strong>{title}</strong><p>{copy}</p></div><Icon name="check-circle" size={17} /></div>
}

function LearnPage({ goTo }: { goTo: (section: SectionId) => void }) {
  const modules = [
    { number: '01', title: 'El mapa mental', subtitle: 'Eventos, recursos y ownership', duration: '20 min', copy: 'Antes de sincronizar, aprende a separar el mundo físico del flujo de datos. Esta capa evita que un mutex termine haciendo de PLC.', icon: 'book' as IconName, state: 'BASE', action: () => goTo('threads') },
    { number: '02', title: 'Permisos con semáforos', subtitle: 'Capacidad finita, espera justa', duration: '25 min', copy: 'Un semáforo cuenta permisos, no protege memoria. Verás cuándo usar binario, cuándo contar y cómo devolver el permiso incluso ante errores.', icon: 'semaphore' as IconName, state: 'NÚCLEO', action: () => goTo('semaphores') },
    { number: '03', title: 'Queues que no desbordan', subtitle: 'Productor-consumidor y presión', duration: '30 min', copy: 'Una cola industrial necesita tamaño, política y señal de parada. Construiremos un buffer bloqueante y luego uno cancelable.', icon: 'queue' as IconName, state: 'NÚCLEO', action: () => goTo('queues') },
    { number: '04', title: 'Hilos que terminan bien', subtitle: 'jthread, stop_token y lifecycle', duration: '25 min', copy: 'Arrancar hilos es sencillo. Cerrarlos sin perder lotes, dejar locks tomados o bloquear el proceso es la habilidad que importa.', icon: 'thread' as IconName, state: 'NÚCLEO', action: () => goTo('threads') },
    { number: '05', title: 'Componer la planta', subtitle: 'Patrones, telemetría y safety', duration: '35 min', copy: 'Lleva todo a una arquitectura por capas y prueba las decisiones en la planta simulada. El objetivo es que cada espera tenga un motivo medible.', icon: 'shield' as IconName, state: 'CAMPO', action: () => goTo('lab') },
  ]

  return (
    <div className="page">
      <PageHeader eyebrow="RUTA GUIADA / 5 MÓDULOS" title={<>Aprender <span className="title-accent">por capas.</span></>} description="Una secuencia de estudio diseñada para pasar de la intuición de una línea industrial a un controlador concurrente que puedas inspeccionar y mantener." action={<span className="progress-chip"><span className="progress-ring">0%</span><span><strong>Progreso recomendado</strong><small>Empieza por el módulo 01</small></span></span>} />
      <section className="learning-layout">
        <div className="learning-timeline">
          {modules.map((module, index) => (
            <article className={`module-card ${index === 0 ? 'module-current' : ''}`} key={module.number}>
              <div className="module-rail"><span>{module.number}</span>{index < modules.length - 1 && <i />}</div>
              <div className="module-body">
                <div className="module-top"><span className="module-icon"><Icon name={module.icon} size={18} /></span><span className="module-state">{module.state}</span><span className="module-duration"><Icon name="clock" size={14} />{module.duration}</span></div>
                <h3>{module.title}</h3><span className="module-subtitle">{module.subtitle}</span><p>{module.copy}</p>
                <button className="module-link" onClick={module.action}>Abrir módulo <Icon name="arrow" size={15} /></button>
              </div>
            </article>
          ))}
        </div>
        <aside className="study-aside">
          <div className="study-card panel">
            <Eyebrow>PROTOCOLO DE ESTUDIO</Eyebrow>
            <h3>Lee. Ejecuta. Cuestiona.</h3>
            <p>La documentación funciona mejor como una consola de consulta. Cada módulo mezcla una regla, un ejemplo y una decisión que debes poder defender.</p>
            <div className="study-steps"><span><b>01</b>Lee la regla</span><span><b>02</b>Ejecuta el caso</span><span><b>03</b>Rompe el diseño</span><span><b>04</b>Corrige con datos</span></div>
          </div>
          <div className="standards-card panel"><span className="standards-icon"><Icon name="check" size={18} /></span><div><strong>Estándar de referencia</strong><p>C++20 con notas de compatibilidad para C++17 cuando la primitive lo permita.</p></div></div>
        </aside>
      </section>
      <section className="callout callout-blue"><div className="callout-icon"><Icon name="terminal" size={20} /></div><div><strong>Consejo para controlistas</strong><p>Si no puedes dibujar quién produce, quién consume y quién posee cada recurso, todavía no necesitas más threads. Necesitas un modelo mejor.</p></div><button onClick={() => goTo('lab')}>Probar el modelo <Icon name="arrow" size={15} /></button></section>
    </div>
  )
}

function DocLayout({ children, side }: { children: ReactNode; side: ReactNode }) {
  return <div className="doc-layout"><div className="doc-main">{children}</div><aside className="doc-side">{side}</aside></div>
}

function DocSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="doc-section"><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{children}</section>
}

function InfoCard({ icon, title, children, tone = 'blue' }: { icon: IconName; title: string; children: ReactNode; tone?: string }) {
  return <div className={`info-card info-${tone}`}><span className="info-icon"><Icon name={icon} size={18} /></span><div><strong>{title}</strong><p>{children}</p></div></div>
}

function RuleGrid({ rules }: { rules: { title: string; copy: string; icon: IconName; tone?: string }[] }) {
  return <div className="rule-grid">{rules.map((rule) => <InfoCard key={rule.title} icon={rule.icon} title={rule.title} tone={rule.tone}>{rule.copy}</InfoCard>)}</div>
}

function CodeBlock({ title, code, activeLines = [] }: { title: string; code: string; activeLines?: number[] }) {
  const [copied, setCopied] = useState(false)
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  const lines = code.trimEnd().split('\n')
  return (
    <div className="code-block">
      <div className="code-head"><span><i className="code-dot red" /><i className="code-dot amber" /><i className="code-dot green" /></span><strong>{title}</strong><span className="code-lang">C++20</span><button onClick={copyCode}><Icon name={copied ? 'check' : 'copy'} size={14} />{copied ? 'Copiado' : 'Copiar'}</button></div>
      <div className="code-body">{lines.map((line, index) => <div className={`code-line ${activeLines.includes(index + 1) ? 'code-line-active' : ''}`} key={`${index}-${line}`}><span className="code-number">{String(index + 1).padStart(2, '0')}</span><code className={line.trimStart().startsWith('//') ? 'comment' : ''}>{line || ' '}</code></div>)}</div>
    </div>
  )
}

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cellIndex === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table></div>
}

function SemaphoresPage({ goTo }: { goTo: (section: SectionId) => void }) {
  const code = `#include <semaphore>
#include <thread>

std::counting_semaphore<3> permits{2};

void station(std::stop_token stop) {
  while (!stop.stop_requested()) {
    permits.acquire();       // espera sin busy-loop
    try {
      process_batch();
    } catch (...) {
      permits.release();     // no perder capacidad ante un error
      throw;
    }
    permits.release();
  }
}`

  return <div className="page">
    <PageHeader eyebrow="PRIMITIVAS C++20 / 01" title={<>Semáforos: <span className="title-accent">permisos</span>, no candados.</>} description="Un semáforo expresa cuántas unidades de un recurso pueden entrar en una sección de trabajo. En una planta, ese número suele ser una capacidad física." action={<button className="header-index">01 <span>/ 03</span></button>} />
    <DocLayout side={<DocSideNav items={[['Idea central', 'semaphore-idea'], ['API mínima', 'semaphore-api'], ['Patrón seguro', 'semaphore-pattern'], ['Límites', 'semaphore-limits']]} />}>
      <DocSection eyebrow="IDEA CENTRAL" title="Cuenta permisos disponibles">
        <p className="doc-lead">Un mutex responde “¿quién puede tocar este dato?”. Un semáforo responde “¿cuántos trabajos pueden consumir este recurso a la vez?”. Esa diferencia cambia cómo modelas una línea.</p>
        <div className="semaphore-visual panel" id="semaphore-idea"><div className="sem-visual-copy"><span className="visual-label">RECURSO / VÁLVULAS DE LLENADO</span><strong>2 de 3 permisos<br />están disponibles</strong><p>Cada trabajador debe adquirir un permiso antes de usar la capacidad compartida y devolverlo al terminar.</p></div><div className="sem-balls"><span className="sem-ball filled">T1</span><span className="sem-ball filled">T2</span><span className="sem-ball empty">+</span><div className="sem-counter"><strong>02</strong><small>AVAILABLE</small></div></div></div>
      </DocSection>
      <DocSection eyebrow="API MÍNIMA" title="Las cuatro operaciones que importan">
        <MiniTable headers={['Operación', 'Comportamiento', 'Uso en planta']} rows={[
          ['acquire()', 'Bloquea hasta obtener un permiso.', 'Esperar una válvula o slot libre.'],
          ['try_acquire()', 'No bloquea; devuelve bool.', 'Tomar una decisión alternativa.'],
          ['try_acquire_for()', 'Espera con timeout.', 'No dejar un hilo sin diagnóstico.'],
          ['release()', 'Devuelve uno o más permisos.', 'Liberar capacidad al finalizar.'],
        ]} />
        <div id="semaphore-api" className="api-pills"><span><code>binary_semaphore</code><small>capacidad fija de 0/1</small></span><span><code>counting_semaphore&lt;N&gt;</code><small>hasta N permisos</small></span><span><code>max()</code><small>límite compile-time</small></span></div>
      </DocSection>
      <DocSection eyebrow="PATRÓN SEGURO" title="Adquirir, trabajar, devolver">
        <p>El permiso debe vivir alrededor del uso real del recurso. Si lo adquieres demasiado pronto, reduces el throughput; si lo devuelves demasiado tarde, creas una cola artificial.</p>
        <CodeBlock title="station_worker.cpp" code={code} activeLines={[4, 8, 9, 12]} />
        <div className="inline-warning" id="semaphore-pattern"><Icon name="alert" size={18} /><span><strong>Regla de oro:</strong> un camino de error que no hace <code>release()</code> convierte un fallo de proceso en un agotamiento silencioso de la planta.</span></div>
      </DocSection>
      <DocSection eyebrow="LÍMITES DE LA PRIMITIVA" title="Lo que un semáforo no resuelve">
        <RuleGrid rules={[{ icon: 'lock', title: 'No protege datos', copy: 'Dos hilos pueden adquirir permisos y seguir modificando el mismo objeto sin exclusión mutua.', tone: 'red' }, { icon: 'flow', title: 'No define fairness', copy: 'La implementación no promete un orden FIFO entre los hilos que esperan.', tone: 'amber' }, { icon: 'shield', title: 'No es un safety interlock', copy: 'La seguridad funcional necesita hardware, PLC de seguridad y una evaluación independiente.', tone: 'blue' }]} />
        <div className="next-link" onClick={() => goTo('queues')} role="button" tabIndex={0}><span><small>SIGUIENTE CAPA</small><strong>Queues y backpressure</strong></span><Icon name="arrow" size={18} /></div>
      </DocSection>
    </DocLayout>
  </div>
}

function QueuesPage({ goTo }: { goTo: (section: SectionId) => void }) {
  const code = `template<class T>
class BoundedQueue {
  std::mutex mutex_;
  std::condition_variable not_empty_, not_full_;
  std::queue<T> items_;
  const std::size_t capacity_;

public:
  void push(T item, std::stop_token stop) {
    std::unique_lock lock{mutex_};
    not_full_.wait(lock, stop, [&] {
      return items_.size() < capacity_;
    });
    items_.push(std::move(item));
    not_empty_.notify_one();
  }
};`

  return <div className="page">
    <PageHeader eyebrow="PRIMITIVAS C++20 / 02" title={<>Queues: el <span className="title-accent">pulso</span> entre estaciones.</>} description="Una queue no es solo un contenedor. Es un contrato de ritmo: define cuánto trabajo puedes absorber, dónde espera y qué ocurre cuando el consumidor se retrasa." action={<button className="header-index">02 <span>/ 03</span></button>} />
    <DocLayout side={<DocSideNav items={[['Modelo productor-consumidor', 'queue-model'], ['Cola acotada', 'queue-bounded'], ['Políticas', 'queue-policies'], ['Diagnóstico', 'queue-diagnosis']]} />}>
      <DocSection eyebrow="MODELO PRODUCTOR-CONSUMIDOR" title="El buffer es una decisión operacional">
        <p className="doc-lead">Cuando una estación produce más rápido que la siguiente, necesitas absorber la diferencia o propagar la presión. Una cola infinita solo aplaza la alarma y convierte memoria en inventario oculto.</p>
        <div className="queue-flow panel" id="queue-model"><div className="flow-node"><span className="flow-icon producer"><Icon name="zap" size={18} /></span><strong>Feeder</strong><small>produce lotes</small></div><div className="flow-arrow"><i /><i /><i /></div><div className="flow-buffer"><span className="buffer-top"><code>queue&lt;Batch&gt;</code><b>04 / 06</b></span><div className="buffer-cells"><i className="on" /><i className="on" /><i className="on" /><i className="on" /><i /><i /></div><small>WIP CONTROLADO</small></div><div className="flow-arrow"><i /><i /><i /></div><div className="flow-node"><span className="flow-icon consumer"><Icon name="activity" size={18} /></span><strong>Station</strong><small>consume lotes</small></div></div>
        <div className="queue-callout"><span className="queue-callout-number">∞</span><div><strong>Una cola sin límite no es capacidad.</strong><p>Es deuda operativa que crece hasta que la latencia o la memoria decide por ti.</p></div></div>
      </DocSection>
      <DocSection eyebrow="COLA ACOTADA" title="Espera cancelable y con ownership claro">
        <p>En C++20, `condition_variable_any` puede esperar con `stop_token`. El hilo duerme hasta que hay espacio, un elemento o una orden de parada. No desperdicia CPU y no queda inmortal.</p>
        <CodeBlock title="bounded_queue.hpp" code={code} activeLines={[2, 3, 4, 10, 11, 13]} />
        <div className="rule-grid two-col"><InfoCard icon="lock" title="Bloquea solo el estado" tone="blue">Mantén el lock para cambiar la queue. Nunca ejecutes el proceso físico ni llames a IO mientras lo sostienes.</InfoCard><InfoCard icon="zap" title="Notifica después de mutar" tone="green">Haz `push`, libera el lock y notifica. El consumidor podrá despertar y competir por un estado ya consistente.</InfoCard></div>
      </DocSection>
      <DocSection eyebrow="POLÍTICAS DE FLUJO" title="Elige qué hacer cuando no caben más lotes">
        <MiniTable headers={['Política', 'Cuándo usarla', 'Riesgo']} rows={[
          ['Bloquear productor', 'El lote no puede perderse y el proceso puede esperar.', 'Propaga la latencia hacia atrás.'],
          ['Rechazar / alarmar', 'La trazabilidad exige una decisión explícita.', 'Necesita manejo de calidad y reintento.'],
          ['Descartar el más antiguo', 'Telemetría o muestras donde importa lo reciente.', 'No válida para producto trazable.'],
          ['Escalar capacidad', 'Carga variable y recursos disponibles.', 'Puede ocultar un cuello de botella físico.'],
        ]} />
        <div className="decision-strip" id="queue-policies"><span className="decision-tag">DECISIÓN</span><strong>La capacidad debe venir de un requisito físico, no del tamaño cómodo de un vector.</strong><span className="decision-meta">buffer_size = WIP permitido</span></div>
      </DocSection>
      <DocSection eyebrow="DIAGNÓSTICO" title="Síntomas de una queue mal diseñada">
        <div className="symptom-list" id="queue-diagnosis"><Symptom tone="amber" symptom="La ocupación sube sin bajar" cause="El consumidor no tiene capacidad o está bloqueado por otro recurso." action="Mide tiempo de espera y permisos disponibles." /><Symptom tone="red" symptom="La memoria crece con la carga" cause="La queue es ilimitada o el productor no tiene backpressure." action="Fija capacidad y define una política de overflow." /><Symptom tone="blue" symptom="CPU al 100% sin throughput" cause="El worker consulta una cola vacía en busy-loop." action="Duerme con condition_variable o semáforo." /></div>
        <div className="next-link" onClick={() => goTo('threads')} role="button" tabIndex={0}><span><small>SIGUIENTE CAPA</small><strong>Hilos, señales y shutdown</strong></span><Icon name="arrow" size={18} /></div>
      </DocSection>
    </DocLayout>
  </div>
}

function Symptom({ tone, symptom, cause, action }: { tone: string; symptom: string; cause: string; action: string }) {
  return <div className="symptom"><span className={`symptom-dot ${tone}`} /><div><strong>{symptom}</strong><small>{cause}</small><p>→ {action}</p></div></div>
}

function ThreadsPage({ goTo }: { goTo: (section: SectionId) => void }) {
  const code = `std::jthread supervisor{
  [](std::stop_token stop) {
    while (!stop.stop_requested()) {
      auto event = events.pop(stop);
      if (!event) break;
      dispatch(*event);
    }
  }
};

// El destructor de jthread solicita stop y hace join.
// El supervisor sigue siendo responsable de despertar
// las esperas que no observan directamente el token.`

  return <div className="page">
    <PageHeader eyebrow="PRIMITIVAS C++20 / 03" title={<>Hilos: <span className="title-accent">ciclo de vida</span> antes que velocidad.</>} description="La concurrencia industrial es coordinación de ciclos de vida. Un hilo útil sabe iniciar, esperar, observar una parada y salir dejando el sistema consistente." action={<button className="header-index">03 <span>/ 03</span></button>} />
    <DocLayout side={<DocSideNav items={[['Modelo de lifecycle', 'thread-model'], ['jthread', 'thread-jthread'], ['Señales auxiliares', 'thread-signals'], ['Cierre seguro', 'thread-shutdown']]} />}>
      <DocSection eyebrow="MODELO DE LIFECYCLE" title="Cada hilo tiene una misión y una salida">
        <p className="doc-lead">Piensa en un hilo como un trabajador con contrato: qué evento lo despierta, qué estado puede cambiar, qué recursos posee y cómo recibe la orden de salir.</p>
        <div className="lifecycle panel" id="thread-model"><LifecycleStep number="01" title="START" copy="Construye su contexto y publica su intención." tone="blue" /><span className="life-line" /><LifecycleStep number="02" title="WAIT" copy="Duerme en una espera que puede despertar." tone="amber" /><span className="life-line" /><LifecycleStep number="03" title="WORK" copy="Cambia solo el estado que posee." tone="green" /><span className="life-line" /><LifecycleStep number="04" title="STOP" copy="Libera, registra y termina con join." tone="red" /></div>
      </DocSection>
      <DocSection eyebrow="JTHREAD + STOP_TOKEN" title="El shutdown como camino feliz">
        <p>`std::jthread` elimina el olvido más común de `std::thread`: destruir un hilo joinable termina en `std::terminate`. También solicita stop automáticamente al destruirse, pero tus esperas deben cooperar.</p>
        <CodeBlock title="supervisor.cpp" code={code} activeLines={[1, 2, 3, 11]} />
        <div className="inline-warning blue"><Icon name="shield" size={18} /><span><strong>Importante:</strong> solicitar stop no mata un hilo. Es una señal. El worker debe observarla y todas sus esperas deben tener una ruta de despertar.</span></div>
      </DocSection>
      <DocSection eyebrow="SEÑALES AUXILIARES" title="Primitivas que completan el sistema">
        <div className="signal-grid" id="thread-signals"><SignalCard icon="lock" title="mutex" copy="Protege invariantes pequeñas. Usa RAII y mantén la sección crítica corta." tag="EXCLUSIÓN" /><SignalCard icon="activity" title="atomic" copy="Estado simple y contadores sin necesidad de un lock compartido." tag="VISIBILIDAD" /><SignalCard icon="flow" title="barrier" copy="Sincroniza fases cuando todos los participantes deben llegar al mismo punto." tag="FASE" /><SignalCard icon="check-circle" title="latch" copy="Espera una cantidad fija de eventos; útil para inicialización única." tag="ARRANQUE" /></div>
      </DocSection>
      <DocSection eyebrow="CIERRE SEGURO" title="Orden de apagado en cuatro pasos">
        <div className="shutdown-list" id="thread-shutdown"><ShutdownStep number="01" title="Deja de aceptar trabajo" copy="Cierra el producer o marca la queue como cerrada." /><ShutdownStep number="02" title="Despierta las esperas" copy="Notifica condition_variables y libera los permisos necesarios." /><ShutdownStep number="03" title="Solicita stop" copy="Pasa el token a cada worker y deja que termine su lote actual." /><ShutdownStep number="04" title="Haz join y valida" copy="Espera a todos los hilos. Comprueba que no queden locks ni lotes ambiguos." /></div>
        <div className="next-link" onClick={() => goTo('patterns')} role="button" tabIndex={0}><span><small>SIGUIENTE CAPA</small><strong>Patrones de control</strong></span><Icon name="arrow" size={18} /></div>
      </DocSection>
    </DocLayout>
  </div>
}

function LifecycleStep({ number, title, copy, tone }: { number: string; title: string; copy: string; tone: string }) {
  return <div className={`lifecycle-step ${tone}`}><span>{number}</span><strong>{title}</strong><p>{copy}</p></div>
}

function SignalCard({ icon, title, copy, tag }: { icon: IconName; title: string; copy: string; tag: string }) {
  return <div className="signal-card"><span className="signal-card-icon"><Icon name={icon} size={18} /></span><span className="signal-card-tag">{tag}</span><strong>{title}</strong><p>{copy}</p></div>
}

function ShutdownStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="shutdown-step"><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div><Icon name="check" size={16} /></div>
}

function PatternsPage({ goTo }: { goTo: (section: SectionId) => void }) {
  return <div className="page">
    <PageHeader eyebrow="DISEÑO DE SISTEMAS / 01" title={<>Patrones para una línea que <span className="title-accent">respira.</span></>} description="Las primitivas no son la arquitectura. Estos patrones conectan eventos, capacidad, estado y observabilidad sin convertir el controlador en una colección de locks." action={<span className="page-status"><span className="status-dot" /> PATRONES VERIFICADOS</span>} />
    <section className="pattern-hero panel"><div className="pattern-hero-copy"><Eyebrow>MAPA DE COMPOSICIÓN</Eyebrow><h2>Del sensor a la salida, cada tramo tiene un contrato.</h2><p>Un sistema mantenible deja claro qué cruza cada frontera. El dato viaja por queues; los recursos se limitan con semáforos; los estados se protegen con mutex; la planta se detiene con stop tokens.</p><button className="text-link" onClick={() => goTo('lab')}>Ver contratos en el laboratorio <Icon name="arrow" size={15} /></button></div><PatternDiagram /></section>
    <section className="home-section"><SectionTitle kicker="CATÁLOGO DE PATRONES" title="Elige según el problema, no según la moda." /><div className="pattern-grid"><PatternCard number="P01" title="Producer / consumer" tags={['queue', 'condition_variable']} copy="Desacopla una fuente irregular de una estación con ritmo propio. Fija la capacidad y decide qué significa llenarse." /><PatternCard number="P02" title="Resource pool" tags={['semaphore', 'RAII']} copy="Representa válvulas, robots o slots como permisos. El trabajador toma uno, procesa y lo devuelve en todos los caminos." /><PatternCard number="P03" title="Supervisor + workers" tags={['jthread', 'stop_token']} copy="Un supervisor traduce eventos y coordina workers especializados. La cancelación viaja desde una sola fuente de verdad." /><PatternCard number="P04" title="Snapshot + telemetry" tags={['atomic', 'metrics']} copy="Publica métricas simples sin bloquear el control. Reserva el lock para invariantes, no para la visualización." /><PatternCard number="P05" title="Phase barrier" tags={['barrier', 'latch']} copy="Alinea fases de calibración o cambio de receta cuando todas las estaciones deben confirmar llegada." /><PatternCard number="P06" title="Watchdog" tags={['timeout', 'diagnostics']} copy="Observa progreso, no solo actividad. Un hilo ocupado que no cambia estado también puede estar averiado." /></div></section>
    <section className="home-bottom-grid"><div className="panel strategy-panel"><SectionTitle kicker="COMPOSICIÓN RECOMENDADA" title="Una receta de 5 piezas" /><div className="recipe-list"><Recipe number="01" title="Input queue" copy="Entrada acotada y trazable." color="blue" /><Recipe number="02" title="Dispatch" copy="Un supervisor asigna trabajo." color="green" /><Recipe number="03" title="Resource permits" copy="Semáforos expresan capacidad." color="amber" /><Recipe number="04" title="Worker lifecycle" copy="jthread y parada cooperativa." color="red" /><Recipe number="05" title="Telemetry" copy="Métricas para explicar esperas." color="violet" /></div></div><div className="panel anti-panel"><Eyebrow>ANTI-PATRONES</Eyebrow><h3>Señales para detener el review</h3><div className="anti-list"><span><Icon name="alert" size={15} /> `sleep_for` como sincronización</span><span><Icon name="alert" size={15} /> queue global sin capacidad</span><span><Icon name="alert" size={15} /> mutex retenido durante IO</span><span><Icon name="alert" size={15} /> destructor que llama `detach()`</span></div><button className="text-link" onClick={() => goTo('reference')}>Abrir checklist de review <Icon name="arrow" size={15} /></button></div></section>
  </div>
}

function PatternDiagram() {
  return <div className="pattern-diagram"><div className="diagram-row"><span className="diagram-node sensor"><i>01</i><strong>Sensor</strong><small>event</small></span><span className="diagram-connector"><i /><i /><i /></span><span className="diagram-node queue-node"><i>02</i><strong>Queue</strong><small>buffer</small></span><span className="diagram-connector"><i /><i /><i /></span><span className="diagram-node worker"><i>03</i><strong>Worker</strong><small>thread</small></span></div><div className="diagram-bottom"><span><b>mutex</b> estado</span><span><b>semaphore</b> capacidad</span><span><b>stop_token</b> salida</span></div></div>
}

function PatternCard({ number, title, tags, copy }: { number: string; title: string; tags: string[]; copy: string }) {
  return <article className="pattern-card"><div className="pattern-card-top"><span>{number}</span><Icon name="arrow" size={17} /></div><h3>{title}</h3><div className="tag-row">{tags.map((tag) => <code key={tag}>{tag}</code>)}</div><p>{copy}</p></article>
}

function Recipe({ number, title, copy, color }: { number: string; title: string; copy: string; color: string }) {
  return <div className="recipe"><span className={`recipe-number ${color}`}>{number}</span><div><strong>{title}</strong><small>{copy}</small></div><Icon name="check" size={15} /></div>
}

function StrategiesPage({ goTo }: { goTo: (section: SectionId) => void }) {
  return <div className="page">
    <PageHeader eyebrow="DISEÑO DE SISTEMAS / 02" title={<>Estrategias para operar <span className="title-accent">sin sorpresas.</span></>} description="La concurrencia de una planta no se optimiza solo con throughput. Se diseña alrededor de seguridad, diagnósticos, recuperación y una latencia que pueda explicarse." action={<span className="strategy-stamp">FIELD GUIDE <b>02</b></span>} />
    <section className="strategy-banner panel"><div className="strategy-banner-mark"><Icon name="shield" size={28} /></div><div><Eyebrow>HEURÍSTICA DE CAMPO</Eyebrow><h2>Lo que no puedes observar, no puedes controlar.</h2><p>Instrumenta ocupación de queues, tiempo de espera, permisos disponibles, edad del lote y tiempo desde el último progreso.</p></div><div className="strategy-score"><strong>4/4</strong><span>señales mínimas</span></div></section>
    <section className="home-section"><SectionTitle kicker="DECISIONES DE ARQUITECTURA" title="Seis estrategias que pagan dividendos" /><div className="strategy-cards"><StrategyCard number="01" title="Diseña por ownership" copy="Cada estado mutable tiene un dueño claro. Otros hilos envían mensajes o snapshots, no escriben directamente." metric="menos carreras" icon="lock" /><StrategyCard number="02" title="Prefiere backpressure explícito" copy="Cuando el buffer se llena, registra y propaga la presión. No escondas el problema detrás de una queue infinita." metric="latencia acotada" icon="queue" /><StrategyCard number="03" title="Separa control y observación" copy="El dashboard lee snapshots; no entra en la sección crítica del control para pintar una gráfica." metric="menos jitter" icon="activity" /><StrategyCard number="04" title="Haz la parada idempotente" copy="Parar dos veces debe ser seguro. Cada worker debe poder salir desde cualquier punto de su ciclo." metric="recovery claro" icon="shield" /><StrategyCard number="05" title="Ordena todos los locks" copy="Publica una jerarquía: recipe antes que buffer, buffer antes que metrics. Si no hay orden, habrá deadlock." metric="reviewable" icon="layers" /><StrategyCard number="06" title="Prueba el tiempo, no solo el resultado" copy="Inyecta retrasos, colas llenas, pérdida de sensor y parada durante cada fase." metric="fallos visibles" icon="clock" /></div></section>
    <section className="risk-section"><div><SectionTitle kicker="MATRIZ DE RIESGO" title="¿Qué estás intentando proteger?" /><p className="section-copy">Elige la herramienta por la propiedad que necesitas mantener, no porque sea la primitive que recuerdas.</p></div><MiniTable headers={['Propiedad', 'Herramienta principal', 'Pregunta de review']} rows={[
      ['Exclusión de un dato', 'mutex + RAII', '¿La sección crítica es mínima?'],
      ['Capacidad física', 'counting_semaphore', '¿Dónde se devuelve el permiso?'],
      ['Flujo entre fases', 'bounded queue', '¿Qué ocurre al llenarse?'],
      ['Parada cooperativa', 'jthread + stop_token', '¿Qué espera necesita notify?'],
      ['Progreso observable', 'atomic + snapshots', '¿Qué métrica prueba avance?'],
    ]} /></section>
    <section className="callout callout-amber"><div className="callout-icon"><Icon name="alert" size={20} /></div><div><strong>Frontera de seguridad</strong><p>Estos patrones organizan software de control. No reemplazan un circuito de parada de emergencia, un PLC safety, un relé certificado ni el análisis de riesgos de la instalación.</p></div><button onClick={() => goTo('reference')}>Ver checklist <Icon name="arrow" size={15} /></button></section>
  </div>
}

function StrategyCard({ number, title, copy, metric, icon }: { number: string; title: string; copy: string; metric: string; icon: IconName }) {
  return <article className="strategy-card"><div className="strategy-card-top"><span>{number}</span><span className="strategy-card-icon"><Icon name={icon} size={17} /></span></div><h3>{title}</h3><p>{copy}</p><small><Icon name="check" size={13} /> {metric}</small></article>
}

function ReferencePage() {
  const mutexCode = `std::mutex m;
std::condition_variable_any cv;
bool ready = false;

std::unique_lock lock{m};
cv.wait(lock, stop, [&] { return ready; });
// lock sigue tomado al despertar
lock.unlock();`

  return <div className="page">
    <PageHeader eyebrow="CONSULTA PERMANENTE / CHEAT SHEET" title={<>Referencia <span className="title-accent">en la mesa.</span></>} description="Firmas, reglas y diagnósticos para consultar mientras programas. Si necesitas el mapa conceptual, vuelve a la ruta; si tienes una decisión concreta, empieza aquí." action={<span className="reference-version"><span className="status-dot" /> C++20 READY</span>} />
    <section className="reference-index panel"><div><span className="reference-index-kicker">ÍNDICE OPERATIVO</span><strong>Encuentra la primitive por intención.</strong></div><div className="ref-links"><a href="#reference-semaphore">Semáforo <Icon name="arrow" size={13} /></a><a href="#reference-queue">Queue <Icon name="arrow" size={13} /></a><a href="#reference-thread">Hilo <Icon name="arrow" size={13} /></a><a href="#reference-review">Review <Icon name="arrow" size={13} /></a></div></section>
    <section className="reference-section" id="reference-semaphore"><div className="reference-heading"><span className="reference-number">01</span><div><Eyebrow>CAPACIDAD</Eyebrow><h2>Semáforos</h2></div><code>&lt;semaphore&gt;</code></div><div className="reference-content"><MiniTable headers={['Tipo', 'Construcción', 'Cuándo']} rows={[["binary_semaphore", 'binary_semaphore gate{0};', 'Evento o permiso 0/1.'], ['counting_semaphore&lt;N&gt;', 'counting_semaphore&lt;4&gt; slots{2};', 'Pool de recursos limitados.']]}/><div className="reference-notes"><span><b>acquire</b> espera sin límite</span><span><b>try_acquire</b> no bloquea</span><span><b>release</b> devuelve capacidad</span></div></div></section>
    <section className="reference-section" id="reference-queue"><div className="reference-heading"><span className="reference-number">02</span><div><Eyebrow>FLUJO</Eyebrow><h2>Colas + espera</h2></div><code>&lt;queue&gt; · &lt;condition_variable&gt;</code></div><div className="reference-content"><div className="reference-two-col"><div><strong className="reference-subtitle">Invariantes mínimas</strong><div className="check-list"><span><Icon name="check" size={14} /> Solo el mutex toca la estructura.</span><span><Icon name="check" size={14} /> La capacidad es explícita.</span><span><Icon name="check" size={14} /> push y pop notifican al otro lado.</span><span><Icon name="check" size={14} /> close despierta a todos.</span></div></div><div><strong className="reference-subtitle">Señal de queue</strong><div className="queue-signal"><span className="signal-track"><i style={{ width: '68%' }} /></span><strong>68%</strong><small>ocupación actual</small></div></div></div></div></section>
    <section className="reference-section" id="reference-thread"><div className="reference-heading"><span className="reference-number">03</span><div><Eyebrow>OWNERSHIP</Eyebrow><h2>Mutex y lifecycle</h2></div><code>&lt;thread&gt; · &lt;mutex&gt;</code></div><div className="reference-content"><CodeBlock title="wait_with_stop.cpp" code={mutexCode} activeLines={[2, 5, 6, 8]} /><div className="reference-notes"><span><b>lock_guard</b> scope fijo</span><span><b>unique_lock</b> puede esperar y liberar</span><span><b>scoped_lock</b> varios mutex sin orden manual</span><span><b>jthread</b> stop + join automático</span></div></div></section>
    <section className="review-section" id="reference-review"><div><Eyebrow>CHECKLIST DE REVIEW</Eyebrow><h2>Antes de ponerlo en una planta.</h2><p>Un review de concurrencia debe poder responder estas preguntas sin ejecutar el sistema.</p></div><div className="review-checks"><ReviewCheck title="¿Quién posee cada dato mutable?" /><ReviewCheck title="¿Qué pasa si la queue está llena?" /><ReviewCheck title="¿Puede salir cada hilo desde cada espera?" /><ReviewCheck title="¿Se devuelve el permiso en todos los caminos?" /><ReviewCheck title="¿Qué métrica demuestra que hay progreso?" /><ReviewCheck title="¿Qué parte requiere safety fuera del software?" /></div></section>
    <section className="commands-section panel"><div><Eyebrow>COMPILAR Y OBSERVAR</Eyebrow><h2>Un punto de partida reproducible.</h2><p>Compila con warnings altos y prueba con carga artificial antes de conectar IO real.</p></div><div className="command-list"><code><span>$</span> g++ -std=c++20 -Wall -Wextra -pthread plant_controller.cpp</code><code><span>$</span> ./plant_controller --workers 3 --buffer 6</code><code><span>$</span> ./plant_controller --inject queue_full --stop-at 120</code></div></section>
  </div>
}

function ReviewCheck({ title }: { title: string }) {
  return <div className="review-check"><span><Icon name="check" size={14} /></span><strong>{title}</strong></div>
}

function DocSideNav({ items }: { items: [string, string][] }) {
  return <div className="doc-side-sticky"><span className="side-nav-title">EN ESTA PÁGINA</span>{items.map(([label, id], index) => <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, '0')}</span>{label}</a>)}<div className="side-reference"><Icon name="command" size={16} /><span><strong>Atajo</strong><small>`/` busca en todos los módulos</small></span></div></div>
}

function LabPage() {
  const [config, setConfig] = useState<PlantConfig>(defaultPlantConfig)
  const [state, setState] = useState<PlantState>(() => createInitialPlantState(defaultPlantConfig))

  useEffect(() => {
    if (!state.running || state.emergency) return undefined
    const interval = window.setInterval(() => {
      setState((current) => stepPlant(current, config))
    }, 900)
    return () => window.clearInterval(interval)
  }, [state.running, state.emergency, config])

  const updateConfig = (key: keyof PlantConfig, value: number) => {
    const nextConfig = { ...config, [key]: value }
    setConfig(nextConfig)
    setState(createInitialPlantState(nextConfig))
  }

  const runningLabel = state.emergency ? 'Parada de emergencia' : state.running ? 'Simulación en marcha' : 'Simulación pausada'

  return <div className="page lab-page">
    <PageHeader eyebrow="LABORATORIO / SIMULACIÓN DETERMINISTA" title={<>Una planta en <span className="title-accent">tiempo real.</span></>} description="Ajusta la capacidad, observa cómo se bloquean los workers y sigue cada transición hasta la línea C++ que la provoca. La simulación no ejecuta C++: hace visible su modelo de concurrencia." action={<span className={`lab-state ${state.emergency ? 'danger' : state.running ? 'live' : ''}`}><span /> {runningLabel}</span>} />
    <section className="lab-toolbar panel"><div className="lab-controls"><button className="control-button control-play" onClick={() => setState(togglePlant)} disabled={state.emergency}><Icon name={state.running ? 'pause' : 'play'} size={16} />{state.running ? 'Pausar' : 'Arrancar'}</button><button className="control-button" onClick={() => setState((current) => stepPlant(current, config))} disabled={state.emergency}><Icon name="step" size={16} />Paso</button><button className="control-button" onClick={() => setState(createInitialPlantState(config))}><Icon name="reset" size={16} />Reset</button><span className="control-divider" /><button className={`emergency-button ${state.emergency ? 'released' : ''}`} onClick={() => setState((current) => setEmergencyStop(current, !current.emergency))}><Icon name={state.emergency ? 'check' : 'alert'} size={16} />{state.emergency ? 'Liberar parada' : 'Parada de emergencia'}</button></div><div className="lab-tick"><span>CICLO</span><strong>{String(state.tick).padStart(3, '0')}</strong><small>· 900 ms / step</small></div></section>
    <section className="lab-layout"><div className="lab-main"><PlantFloor state={state} config={config} /><div className="lab-metrics"><LabMetric value={`${state.queue}/${config.queueCapacity}`} label="buffer ocupado" tone="amber" icon="queue" /><LabMetric value={`${state.permits}`} label="permisos libres" tone="green" icon="semaphore" /><LabMetric value={`${state.activeWorkers}`} label="workers activos" tone="blue" icon="thread" /><LabMetric value={`${state.blocked}`} label="entradas bloqueadas" tone="red" icon="alert" /></div><div className="lab-event panel"><div className="lab-event-mark"><Icon name="activity" size={17} /></div><div><span>ÚLTIMO EVENTO / LÍNEA {String(state.lastLine).padStart(2, '0')}</span><strong>{state.lastEvent}</strong></div><span className="event-tick">T+{String(state.tick).padStart(3, '0')}</span></div></div><aside className="lab-side"><LabConfig config={config} onChange={updateConfig} /><SourcePanel state={state} /><EventLog logs={state.logs} /></aside></section>
    <section className="lab-footer-note"><Icon name="shield" size={18} /><span><strong>Nota de seguridad:</strong> este laboratorio modela coordinación de software. Una parada de emergencia real debe tener una ruta independiente, determinista y certificada.</span></section>
  </div>
}

function LabMetric({ value, label, tone, icon }: { value: string; label: string; tone: string; icon: IconName }) {
  return <div className={`lab-metric ${tone}`}><span><Icon name={icon} size={15} /></span><strong>{value}</strong><small>{label}</small></div>
}

function LabConfig({ config, onChange }: { config: PlantConfig; onChange: (key: keyof PlantConfig, value: number) => void }) {
  return <div className="config-card panel"><div className="config-head"><div><Eyebrow>PARÁMETROS</Eyebrow><strong>Diseña la carga</strong></div><Icon name="sliders" size={17} /></div><ConfigSlider label="Capacidad del buffer" value={config.queueCapacity} min={2} max={10} suffix="slots" onChange={(value) => onChange('queueCapacity', value)} /><ConfigSlider label="Workers disponibles" value={config.workerCount} min={1} max={3} suffix="hilos" onChange={(value) => onChange('workerCount', value)} /><ConfigSlider label="Ritmo de llegada" value={config.arrivalRate} min={1} max={5} suffix={`${config.arrivalRate}/5`} onChange={(value) => onChange('arrivalRate', value)} /><small className="config-note">Cambiar un parámetro reinicia el ciclo para comparar escenarios desde el mismo estado inicial.</small></div>
}

function ConfigSlider({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="config-slider"><span><strong>{label}</strong><b>{value} <small>{suffix}</small></b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-progress': `${((value - min) / (max - min)) * 100}%` } as CSSProperties} /></label>
}

function PlantFloor({ state, config }: { state: PlantState; config: PlantConfig }) {
  return <div className={`plant-floor panel ${state.emergency ? 'plant-emergency' : ''}`}><div className="plant-floor-head"><div><Eyebrow>FLOOR PLAN / LÍNEA 04</Eyebrow><strong>Coordinación de estaciones</strong></div><div className="floor-legend"><span><i className="legend-dot green" />procesando</span><span><i className="legend-dot amber" />esperando</span><span><i className="legend-dot red" />bloqueo</span></div></div><div className="floor-canvas"><div className="floor-grid" /><div className="floor-line line-one" /><div className="floor-line line-two" /><div className="floor-line line-three" /><div className="floor-arrow arrow-one">›</div><div className="floor-arrow arrow-two">›</div><PlantNode type="input" title="Entrada" subtitle={`${state.produced} lotes`} icon="zap" /><QueueNode state={state} config={config} /><div className="station-row">{state.stations.map((station, index) => <StationNode station={station} index={index} key={station.id} />)}</div><PlantNode type="output" title="Salida" subtitle={`${state.completed} completos`} icon="check-circle" /><div className="floor-safety"><Icon name="shield" size={14} /><span>{state.emergency ? 'SAFE STOP' : 'INTERLOCK OK'}</span></div></div><div className="floor-foot"><span><b>INPUT</b> sensor de llegada</span><span><b>QUEUE</b> buffer acotado</span><span><b>PROCESS</b> workers + permisos</span><span><b>OUTPUT</b> lote confirmado</span></div></div>
}

function PlantNode({ type, title, subtitle, icon }: { type: string; title: string; subtitle: string; icon: IconName }) {
  return <div className={`plant-node node-${type}`}><span className="plant-node-icon"><Icon name={icon} size={17} /></span><strong>{title}</strong><small>{subtitle}</small></div>
}

function QueueNode({ state, config }: { state: PlantState; config: PlantConfig }) {
  return <div className="queue-node-live"><div className="queue-node-head"><span><Icon name="queue" size={15} />BUFFER</span><b>{state.queue}/{config.queueCapacity}</b></div><div className="queue-live-slots">{Array.from({ length: config.queueCapacity }, (_, index) => <i className={index < state.queue ? 'filled' : ''} key={index}>{index < state.queue ? '·' : ''}</i>)}</div><small>{state.queue === config.queueCapacity ? 'CAPACIDAD MÁXIMA' : 'ENTRADA ACOTADA'}</small></div>
}

function StationNode({ station, index }: { station: StationState; index: number }) {
  const statusLabels: Record<StationStatus, string> = { idle: 'libre', processing: `${station.remaining}s`, waiting: 'espera', 'safe-stop': 'seguro' }
  return <div className={`station-node station-${station.status}`}><div className="station-top"><span>0{index + 1}</span><span className="station-status-dot" /></div><div className="station-gear">{station.status === 'processing' ? '◌' : station.status === 'safe-stop' ? '■' : '◈'}</div><strong>{station.name}</strong><small>{statusLabels[station.status]}</small><div className="station-progress"><i style={{ width: station.status === 'processing' ? `${((station.total - station.remaining) / station.total) * 100}%` : '0%' }} /></div></div>
}

function SourcePanel({ state }: { state: PlantState }) {
  return <div className="source-card panel"><div className="source-head"><div><Eyebrow>CÓDIGO CAUSAL</Eyebrow><strong>Qué línea está actuando</strong></div><span className="source-file">plant_controller.cpp</span></div><div className="source-lines">{simulatedCode.map((entry) => <div className={`source-line ${entry.line === state.lastLine ? 'source-active' : ''}`} key={entry.line}><span>{String(entry.line).padStart(2, '0')}</span><code>{entry.text}</code>{entry.line === state.lastLine && <i><Icon name="arrow" size={12} /></i>}</div>)}</div><div className="source-foot"><span><i className="pulse-mini" /> línea resaltada = último evento</span><span>C++20</span></div></div>
}

function EventLog({ logs }: { logs: PlantState['logs'] }) {
  return <div className="event-log panel"><div className="event-log-head"><div><Eyebrow>TRACE BUFFER</Eyebrow><strong>Registro de eventos</strong></div><span>{logs.length} eventos</span></div><div className="event-list">{logs.map((log) => <div className="event-row" key={log.id}><span className={`event-tone ${log.tone}`} /><span className="event-time">T+{String(log.tick).padStart(3, '0')}</span><span className="event-message">{log.message}</span><b>L{String(log.line).padStart(2, '0')}</b></div>)}</div></div>
}

export default App
