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
  | 'code'
  | 'command'
  | 'copy'
  | 'database'
  | 'flow'
  | 'folder'
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
  | 'settings'
  | 'shield'
  | 'sliders'
  | 'step'
  | 'terminal'
  | 'thread'
  | 'tree'
  | 'users'
  | 'zap'

type PageId =
  | 'home'
  | 'fundamentals'
  | 'semantics'
  | 'semaphores'
  | 'queues'
  | 'threads'
  | 'mutex'
  | 'signals'
  | 'shutdown'
  | 'patterns'
  | 'testing'
  | 'api'
  | 'simulation'
  | 'strategies'

interface WikiItem {
  id: PageId
  label: string
  short: string
  icon: IconName
  keywords: string
}

interface WikiGroup {
  label: string
  number: string
  items: WikiItem[]
}

const wikiGroups: WikiGroup[] = [
  {
    number: '00',
    label: 'Orientación',
    items: [
      { id: 'home', label: 'Inicio de la wiki', short: 'Mapa y método de consulta', icon: 'book', keywords: 'inicio mapa bienvenida documentación' },
      { id: 'fundamentals', label: 'Fundamentos', short: 'Cómo pensar en concurrencia', icon: 'grid', keywords: 'fundamentos concurrencia paralelismo scheduling' },
    ],
  },
  {
    number: '01',
    label: 'Modelo concurrente',
    items: [
      { id: 'semantics', label: 'Eventos y estados', short: 'Del sensor al hilo', icon: 'activity', keywords: 'eventos estados planta modelo tiempo' },
      { id: 'threads', label: 'Hilos y ciclo de vida', short: 'jthread y cancelación', icon: 'thread', keywords: 'thread jthread stop token ciclo vida' },
      { id: 'mutex', label: 'Mutex y esperas', short: 'Invariantes y condition_variable', icon: 'lock', keywords: 'mutex lock condition variable deadlock' },
      { id: 'signals', label: 'Atomics y señales', short: 'Visibilidad entre hilos', icon: 'zap', keywords: 'atomic memory ordering barrier latch future' },
    ],
  },
  {
    number: '02',
    label: 'Flujo y capacidad',
    items: [
      { id: 'semaphores', label: 'Semáforos', short: 'Permisos y recursos', icon: 'semaphore', keywords: 'semaphore binary counting acquire release recurso' },
      { id: 'queues', label: 'Queues acotadas', short: 'Buffers y backpressure', icon: 'queue', keywords: 'queue cola buffer producer consumer backpressure' },
      { id: 'shutdown', label: 'Shutdown seguro', short: 'Parar sin perder control', icon: 'shield', keywords: 'shutdown parada emergencia stop cierre seguro' },
    ],
  },
  {
    number: '03',
    label: 'Arquitectura y calidad',
    items: [
      { id: 'patterns', label: 'Patrones de control', short: 'Componer la planta', icon: 'flow', keywords: 'patterns patrones pipeline worker supervisor arquitectura' },
      { id: 'testing', label: 'Pruebas y diagnóstico', short: 'Medir lo que ocurre', icon: 'settings', keywords: 'testing pruebas stress race watchdog metrics diagnóstico' },
      { id: 'api', label: 'Referencia de API', short: 'Consulta rápida C++20', icon: 'code', keywords: 'api referencia cpp20 cheat sheet firmas' },
    ],
  },
  {
    number: '04',
    label: 'Aplicaciones aparte',
    items: [
      { id: 'simulation', label: 'Simulación de planta', short: 'Laboratorio interactivo', icon: 'activity', keywords: 'simulación laboratorio planta interactivo workers' },
      { id: 'strategies', label: 'Estrategias industriales', short: 'Decisiones de campo', icon: 'layers', keywords: 'estrategias industrial safety plc diseño operación' },
    ],
  },
]

const allWikiItems = wikiGroups.flatMap((group) => group.items)

const pageMeta: Record<PageId, { chapter: string; title: string; summary: string; tags: string[]; read: string }> = {
  home: { chapter: '00 · ORIENTACIÓN', title: 'Wiki de concurrencia industrial', summary: 'Documentación de consulta para diseñar controladores C++20 que coordinan sensores, estaciones, recursos limitados y paradas seguras.', tags: ['C++20', 'control de planta', 'documentación'], read: '5 min' },
  fundamentals: { chapter: '00.01 · ORIENTACIÓN', title: 'Fundamentos de concurrencia', summary: 'El modelo mental que evita convertir una línea de producción en una colección de hilos que compiten sin contrato.', tags: ['modelo mental', 'scheduling', 'riesgos'], read: '12 min' },
  semantics: { chapter: '01.01 · MODELO CONCURRENTE', title: 'Eventos, estados y tiempo', summary: 'Cómo traducir señales físicas a eventos, estados y transiciones que un sistema concurrente puede razonar.', tags: ['eventos', 'FSM', 'tiempo'], read: '14 min' },
  threads: { chapter: '01.02 · MODELO CONCURRENTE', title: 'Hilos y ciclo de vida', summary: 'Diseña workers con una misión, una espera cancelable y una salida que siempre puede completarse.', tags: ['thread', 'jthread', 'stop_token'], read: '16 min' },
  mutex: { chapter: '01.03 · MODELO CONCURRENTE', title: 'Mutex, invariantes y esperas', summary: 'Protege estado compartido sin bloquear el proceso físico ni crear deadlocks difíciles de reproducir.', tags: ['mutex', 'RAII', 'condition_variable'], read: '18 min' },
  signals: { chapter: '01.04 · MODELO CONCURRENTE', title: 'Atomics y señales auxiliares', summary: 'Visibilidad, fases y coordinación cuando un mutex completo sería demasiado o no expresa la intención.', tags: ['atomic', 'barrier', 'latch'], read: '15 min' },
  semaphores: { chapter: '02.01 · FLUJO Y CAPACIDAD', title: 'Semáforos: permisos contables', summary: 'Usa semáforos binarios y contadores para representar capacidades físicas, slots y gates de una instalación.', tags: ['semaphore', 'recursos', 'capacidad'], read: '18 min' },
  queues: { chapter: '02.02 · FLUJO Y CAPACIDAD', title: 'Queues acotadas y backpressure', summary: 'Construye buffers con ownership, capacidad, políticas de overflow y una ruta de cierre observable.', tags: ['queue', 'productor-consumidor', 'backpressure'], read: '22 min' },
  shutdown: { chapter: '02.03 · FLUJO Y CAPACIDAD', title: 'Shutdown seguro', summary: 'Detén la planta de forma controlada, responde a una emergencia y separa software de seguridad funcional.', tags: ['shutdown', 'emergency stop', 'recovery'], read: '17 min' },
  patterns: { chapter: '03.01 · ARQUITECTURA Y CALIDAD', title: 'Patrones de control', summary: 'Patrones compuestos para pipelines, supervisores, pools de recursos, handoffs y telemetría.', tags: ['pipeline', 'supervisor', 'worker pool'], read: '20 min' },
  testing: { chapter: '03.02 · ARQUITECTURA Y CALIDAD', title: 'Pruebas, trazas y diagnóstico', summary: 'Prueba interleavings, inyecta fallos y mide progreso antes de conectar la lógica a IO real.', tags: ['testing', 'watchdog', 'observabilidad'], read: '19 min' },
  api: { chapter: '03.03 · ARQUITECTURA Y CALIDAD', title: 'Referencia rápida de C++20', summary: 'Firmas, decisiones y pequeños fragmentos para consultar durante una implementación o un code review.', tags: ['API', 'cheat sheet', 'review'], read: '10 min' },
  simulation: { chapter: '04.01 · APLICACIONES', title: 'Simulación de planta', summary: 'Laboratorio visual separado de la documentación para observar colas, permisos, workers y parada de emergencia.', tags: ['laboratorio', 'interactivo', 'trazas'], read: 'variable' },
  strategies: { chapter: '04.02 · APLICACIONES', title: 'Estrategias industriales', summary: 'Decisiones de arquitectura, operación y seguridad para llevar los patrones a una planta real.', tags: ['estrategia', 'safety', 'operación'], read: 'variable' },
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'activity': return <svg {...common}><path d="M3 12h4l2.2-7 4.6 14L16 12h5" /></svg>
    case 'alert': return <svg {...common}><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v4M12 16h.01" /></svg>
    case 'arrow': return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
    case 'book': return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></svg>
    case 'check': return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
    case 'check-circle': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></svg>
    case 'chevron': return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>
    case 'clock': return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>
    case 'code': return <svg {...common}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" /></svg>
    case 'command': return <svg {...common}><path d="M18 9V6a3 3 0 1 0-3-3h-3v6h6ZM9 6V3a3 3 0 1 0-3 3v3h6V3M6 15v3a3 3 0 1 0 3 3h3v-6H6ZM15 18v3a3 3 0 1 0 3-3v-3h-6v6" /></svg>
    case 'copy': return <svg {...common}><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></svg>
    case 'database': return <svg {...common}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></svg>
    case 'flow': return <svg {...common}><rect x="3" y="4" width="6" height="5" rx="1" /><rect x="15" y="15" width="6" height="5" rx="1" /><rect x="15" y="4" width="6" height="5" rx="1" /><path d="M9 6.5h6M6 9v5a3 3 0 0 0 3 3h6M18 9v6" /></svg>
    case 'folder': return <svg {...common}><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" /></svg>
    case 'grid': return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
    case 'layers': return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>
    case 'link': return <svg {...common}><path d="M10 13.8a4 4 0 0 0 5.8.2l2-2a4 4 0 0 0-5.7-5.6l-1.1 1.1" /><path d="M14 10.2a4 4 0 0 0-5.8-.2l-2 2a4 4 0 0 0 5.7 5.6l1.1-1.1" /></svg>
    case 'lock': return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>
    case 'menu': return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
    case 'pause': return <svg {...common}><path d="M8 5v14M16 5v14" /></svg>
    case 'play': return <svg {...common}><path d="m8 5 11 7-11 7V5Z" /></svg>
    case 'queue': return <svg {...common}><rect x="4" y="4" width="5" height="5" rx="1" /><rect x="4" y="10" width="5" height="5" rx="1" /><rect x="4" y="16" width="5" height="4" rx="1" /><path d="M13 6h7M13 12h7M13 18h7" /></svg>
    case 'reset': return <svg {...common}><path d="M4 5v5h5" /><path d="M5.5 15a8 8 0 1 0 .3-8.7L4 10" /></svg>
    case 'search': return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
    case 'semaphore': return <svg {...common}><path d="M6 21h12M9 18h6M12 3v15M7 6h10v8H7z" /><circle cx="9.5" cy="10" r="1" /><circle cx="14.5" cy="10" r="1" /></svg>
    case 'settings': return <svg {...common}><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></svg>
    case 'shield': return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>
    case 'sliders': return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></svg>
    case 'step': return <svg {...common}><path d="M5 5v14M9 12h10M15 8l4 4-4 4" /></svg>
    case 'terminal': return <svg {...common}><path d="m5 7 5 5-5 5M12 17h7" /></svg>
    case 'thread': return <svg {...common}><circle cx="7" cy="6" r="3" /><circle cx="17" cy="18" r="3" /><path d="M9.5 8.5 14.5 15.5M17 5v6M14 8h6" /></svg>
    case 'tree': return <svg {...common}><path d="M12 3v5M12 8H6v5M12 8h6v5M6 13v6M18 13v6M3 19h6M15 19h6" /></svg>
    case 'users': return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" /></svg>
    case 'zap': return <svg {...common}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></svg>
    default: return null
  }
}

function initialPage(): PageId {
  const hash = window.location.hash.slice(1) as PageId
  return allWikiItems.some((item) => item.id === hash) ? hash : 'home'
}

function App() {
  const [activePage, setActivePage] = useState<PageId>(initialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(() => new Set(['00', '01', '02', '03', '04']))
  const searchRef = useRef<HTMLInputElement>(null)
  const meta = pageMeta[activePage]
  const activeItem = allWikiItems.find((item) => item.id === activePage) ?? allWikiItems[0]
  const matches = query.trim() ? allWikiItems.filter((item) => `${item.label} ${item.short} ${item.keywords}`.toLowerCase().includes(query.toLowerCase())) : []

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash.slice(1) as PageId
      if (allWikiItems.some((item) => item.id === next)) setActivePage(next)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const goTo = (page: PageId) => {
    setActivePage(page)
    setSidebarOpen(false)
    setQuery('')
    window.history.replaceState(null, '', `#${page}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleGroup = (number: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  return (
    <div className="wiki-shell">
      <WikiSidebar activePage={activePage} sidebarOpen={sidebarOpen} expanded={expanded} onToggleGroup={toggleGroup} onNavigate={goTo} />
      {sidebarOpen && <button className="wiki-scrim" aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)} />}
      <div className="wiki-workspace">
        <header className="wiki-topbar">
          <div className="wiki-topbar-left">
            <button className="mobile-wiki-menu" aria-label="Abrir índice" onClick={() => setSidebarOpen(true)}><Icon name="menu" size={21} /></button>
            <div className="wiki-breadcrumb"><span>WIKI</span><Icon name="chevron" size={13} /><strong>{activeItem.label}</strong></div>
          </div>
          <div className="wiki-topbar-actions">
            <div className="wiki-search">
              <Icon name="search" size={17} />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar capítulos, API, conceptos..." aria-label="Buscar en la wiki" />
              <kbd>/</kbd>
              {query && <div className="wiki-search-results">{matches.length ? matches.map((item) => <button key={item.id} onClick={() => goTo(item.id)}><Icon name={item.icon} size={15} /><span><strong>{item.label}</strong><small>{item.short}</small></span><Icon name="arrow" size={14} /></button>) : <span>No hay coincidencias. Prueba “deadlock”, “queue” o “stop”.</span>}</div>}
            </div>
            <a className="wiki-source" href="https://github.com/SIRGPrice/control-industrial-cpp" target="_blank" rel="noreferrer"><span className="source-mark">◉</span><span>Repositorio</span><Icon name="link" size={14} /></a>
          </div>
        </header>
        <main className="wiki-main">
          <WikiPage meta={meta} page={activePage} onNavigate={goTo} />
        </main>
        <footer className="wiki-footer"><span><i /> WIKI DE CONTROL INDUSTRIAL · C++20</span><span>Contenido orientado a consulta y aprendizaje</span></footer>
      </div>
    </div>
  )
}

function WikiSidebar({ activePage, sidebarOpen, expanded, onToggleGroup, onNavigate }: { activePage: PageId; sidebarOpen: boolean; expanded: Set<string>; onToggleGroup: (number: string) => void; onNavigate: (page: PageId) => void }) {
  return (
    <aside className={`wiki-sidebar ${sidebarOpen ? 'wiki-sidebar-open' : ''}`}>
      <div className="wiki-brand"><div className="wiki-brand-mark"><span>CI</span><i /></div><div><strong>Control Industrial</strong><small>CONCURRENCIA WIKI</small></div></div>
      <div className="wiki-version"><span className="wiki-live-dot" /> <span>DOCUMENTACIÓN VIVA</span><b>v1.1</b></div>
      <nav className="wiki-tree" aria-label="Índice de documentación">
        <div className="tree-title"><span>ÍNDICE</span><small>14 páginas</small></div>
        {wikiGroups.map((group) => {
          const isOpen = expanded.has(group.number)
          return <div className="tree-group" key={group.number}>
            <button className="tree-group-button" onClick={() => onToggleGroup(group.number)}><span className={`tree-chevron ${isOpen ? 'open' : ''}`}><Icon name="chevron" size={13} /></span><b>{group.number}</b><strong>{group.label}</strong><small>{group.items.length}</small></button>
            {isOpen && <div className="tree-items">{group.items.map((item) => <button className={`tree-item ${activePage === item.id ? 'active' : ''}`} key={item.id} onClick={() => onNavigate(item.id)}><Icon name={item.icon} size={15} /><span>{item.label}</span>{activePage === item.id && <i />}</button>)}</div>}
          </div>
        })}
      </nav>
      <div className="wiki-sidebar-bottom"><div className="wiki-tip"><Icon name="command" size={16} /><span><strong>Buscar en la wiki</strong><small>Pulsa <kbd>/</kbd> desde cualquier página</small></span></div><span className="wiki-legal">SIMULACIÓN ≠ SAFETY CERTIFICADA</span></div>
    </aside>
  )
}

function WikiPage({ meta, page, onNavigate }: { meta: typeof pageMeta[PageId]; page: PageId; onNavigate: (page: PageId) => void }) {
  if (page === 'home') return <HomePage meta={meta} onNavigate={onNavigate} />
  if (page === 'fundamentals') return <FundamentalsPage meta={meta} onNavigate={onNavigate} />
  if (page === 'semantics') return <SemanticsPage meta={meta} onNavigate={onNavigate} />
  if (page === 'threads') return <ThreadsPage meta={meta} onNavigate={onNavigate} />
  if (page === 'mutex') return <MutexPage meta={meta} onNavigate={onNavigate} />
  if (page === 'signals') return <SignalsPage meta={meta} onNavigate={onNavigate} />
  if (page === 'semaphores') return <SemaphoresPage meta={meta} onNavigate={onNavigate} />
  if (page === 'queues') return <QueuesPage meta={meta} onNavigate={onNavigate} />
  if (page === 'shutdown') return <ShutdownPage meta={meta} onNavigate={onNavigate} />
  if (page === 'patterns') return <PatternsPage meta={meta} onNavigate={onNavigate} />
  if (page === 'testing') return <TestingPage meta={meta} onNavigate={onNavigate} />
  if (page === 'api') return <ApiPage meta={meta} onNavigate={onNavigate} />
  if (page === 'simulation') return <SimulationPage meta={meta} />
  return <StrategiesPage meta={meta} onNavigate={onNavigate} />
}

type PageMeta = typeof pageMeta[PageId]

function PageHeader({ meta, accent = false }: { meta: PageMeta; accent?: boolean }) {
  return <header className={`article-header ${accent ? 'article-header-accent' : ''}`}><div className="article-kicker"><span className="kicker-line" />{meta.chapter}</div><h1>{meta.title}</h1><p>{meta.summary}</p><div className="article-meta"><span><Icon name="clock" size={13} /> Lectura: {meta.read}</span><span><Icon name="code" size={13} /> C++20</span>{meta.tags.map((tag) => <code key={tag}>{tag}</code>)}</div></header>
}

function ArticleLayout({ meta, children, toc, accent = false }: { meta: PageMeta; children: ReactNode; toc: [string, string][]; accent?: boolean }) {
  return <div className="article-page"><PageHeader meta={meta} accent={accent} /><div className="article-grid"><article className="article-body">{children}</article><aside className="article-toc"><span>EN ESTA PÁGINA</span>{toc.map(([label, id], index) => <a href={`#${id}`} key={id}><b>{String(index + 1).padStart(2, '0')}</b>{label}</a>)}<div className="toc-divider" /><span className="toc-note"><Icon name="book" size={15} /> Consulta cada ejemplo junto al laboratorio.</span></aside></div></div>
}

function DocSection({ id, number, eyebrow, title, children }: { id: string; number: string; eyebrow?: string; title: string; children: ReactNode }) {
  return <section className="doc-block" id={id}><div className="doc-block-head"><span className="doc-number">{number}</span><div>{eyebrow && <span className="doc-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div></div><div className="doc-block-content">{children}</div></section>
}

function Lead({ children }: { children: ReactNode }) { return <p className="doc-lead">{children}</p> }
function Paragraph({ children }: { children: ReactNode }) { return <p className="doc-paragraph">{children}</p> }
function Note({ tone = 'blue', title, children }: { tone?: 'blue' | 'amber' | 'red' | 'green'; title: string; children: ReactNode }) { return <div className={`doc-note note-${tone}`}><span><Icon name={tone === 'red' ? 'alert' : tone === 'green' ? 'check-circle' : tone === 'amber' ? 'zap' : 'book'} size={17} /></span><div><strong>{title}</strong><p>{children}</p></div></div> }
function Definition({ term, children }: { term: string; children: ReactNode }) { return <div className="definition"><span>DEFINICIÓN</span><strong>{term}</strong><p>{children}</p></div> }
function RuleCards({ cards }: { cards: { icon: IconName; title: string; text: string; tone?: string }[] }) { return <div className="rule-cards">{cards.map((card) => <div className={`rule-card rule-${card.tone ?? 'blue'}`} key={card.title}><span><Icon name={card.icon} size={18} /></span><strong>{card.title}</strong><p>{card.text}</p></div>)}</div> }
function ComparisonTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="wiki-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cellIndex === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table></div> }
function Checklist({ items }: { items: string[] }) { return <div className="wiki-checklist">{items.map((item) => <span key={item}><i><Icon name="check" size={13} /></i>{item}</span>)}</div> }

function CodeBlock({ title, code, caption, tone = 'green' }: { title: string; code: string; caption?: string; tone?: 'green' | 'blue' | 'amber' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { setCopied(false) }
  }
  const lines = code.trimEnd().split('\n')
  return <figure className={`ide-code ide-${tone}`}><div className="ide-bar"><span className="ide-tabs"><i className="ide-dot dot-red" /><i className="ide-dot dot-amber" /><i className="ide-dot dot-green" /></span><strong>{title}</strong><span className="ide-language">C++20</span><button onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={15} />{copied ? 'Copiado' : 'Copiar'}</button></div><div className="ide-editor">{lines.map((line, index) => <div className="ide-line" key={`${index}-${line}`}><span className="ide-line-number">{String(index + 1).padStart(2, '0')}</span><code>{highlightLine(line, index)}</code></div>)}</div>{caption && <figcaption><span><i /> Todas las líneas están comentadas para explicar la intención.</span><span>{caption}</span></figcaption>}</figure>
}

const cppKeywords = new Set(['alignas', 'auto', 'bool', 'catch', 'class', 'const', 'constexpr', 'continue', 'else', 'for', 'if', 'inline', 'namespace', 'noexcept', 'public', 'return', 'sizeof', 'static', 'struct', 'switch', 'template', 'throw', 'try', 'typename', 'using', 'void', 'while'])
const cppTypes = new Set(['Batch', 'PlantEvent', 'Recipe', 'Station', 'std', 'size_t', 'string', 'mutex', 'queue', 'jthread', 'stop_token', 'condition_variable_any', 'condition_variable', 'counting_semaphore', 'binary_semaphore', 'atomic', 'unique_lock', 'lock_guard', 'scoped_lock', 'barrier', 'latch', 'optional', 'chrono'])

function highlightLine(line: string, lineIndex: number): ReactNode[] {
  const parts = line.split(/(\/\/.*|#[A-Za-z_]+|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*(?=\()|\b[A-Za-z_]\w*\b)/g)
  return parts.map((part, index) => {
    let className = ''
    if (part.startsWith('//')) className = 'tok-comment'
    else if (part.startsWith('#')) className = 'tok-preprocessor'
    else if (part.startsWith('"') || part.startsWith("'")) className = 'tok-string'
    else if (/^\d/.test(part)) className = 'tok-number'
    else if (cppKeywords.has(part)) className = 'tok-keyword'
    else if (cppTypes.has(part) || part.startsWith('std::')) className = 'tok-type'
    else if (/^[A-Za-z_]\w*$/.test(part) && line.slice(line.indexOf(part) + part.length).trimStart().startsWith('(')) className = 'tok-function'
    return <span className={className} key={`${lineIndex}-${index}`}>{part}</span>
  })
}

function NavButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="article-nav-button" onClick={onClick}>{children}<Icon name="arrow" size={15} /></button> }

const codeEventModel = `#include <chrono> // Importa tipos de tiempo para fechar cada evento.
#include <string> // Permite identificar sensores y estaciones por nombre.
struct PlantEvent { // Agrupa una observación física en un valor inmutable.
  std::string source; // Guarda quién originó el evento.
  std::string kind; // Describe qué ocurrió: pieza, fallo o cambio de modo.
  std::chrono::steady_clock::time_point at; // Usa un reloj monotónico para ordenar.
}; // Cierra el contrato mínimo que cruza la frontera.
PlantEvent event; // El hilo recibe una copia propia del evento.
if (event.kind == "piece_arrived") { // Convierte la señal en una transición explícita.
  buffer.push(event); // Entrega el trabajo al siguiente actor del sistema.
} // La transición termina sin tocar directamente la estación.`

const codeThread = `std::jthread worker{ // Crea un worker que será unido automáticamente.
  [](std::stop_token stop) { // Recibe la señal cooperativa de apagado.
    while (!stop.stop_requested()) { // Comprueba la salida antes de cada ciclo.
      auto item = queue.pop(stop); // Espera trabajo y puede despertar por stop.
      if (!item) break; // Sale si la cola se cerró sin trabajo pendiente.
      process(*item); // Ejecuta solo la operación que este worker posee.
      metrics.completed.fetch_add(1); // Publica un contador sin bloquear el control.
    } // Termina el ciclo cuando llega una orden de cierre.
  } // El destructor solicitará stop y hará join.
}; // El scope delimita la vida completa del worker.`

const codeSemaphore = `std::counting_semaphore<3> slots{2}; // Modela dos recursos libres de tres.
void use_valve(Batch batch) { // Encapsula el uso de una válvula compartida.
  slots.acquire(); // Espera un permiso sin consumir CPU en busy-loop.
  try { // Abre un camino explícito para restaurar capacidad.
    fill(batch); // Ejecuta el proceso físico bajo el permiso adquirido.
  } catch (...) { // Captura también fallos inesperados del proceso.
    slots.release(); // Devuelve el permiso antes de propagar el error.
    throw; // Conserva la información del fallo para el supervisor.
  } // Cierra el bloque protegido por el recurso.
  slots.release(); // Libera capacidad para el siguiente lote.
} // El contrato garantiza acquire y release emparejados.`

const codeQueue = `template<class T> // Permite reutilizar la cola con cualquier tipo de lote.
class BoundedQueue { // Encapsula datos, capacidad y notificaciones.
  std::mutex mutex_; // Protege la estructura y sus invariantes.
  std::condition_variable_any cv_; // Despierta productores y consumidores.
  std::deque<T> items_; // Mantiene los elementos en orden FIFO.
  std::size_t capacity_; // Hace visible el límite operacional del buffer.
public: // Expone solo las operaciones que forman el contrato.
  void push(T item, std::stop_token stop) { // Inserta y permite cancelar la espera.
    std::unique_lock lock{mutex_}; // Toma el mutex usando RAII.
    cv_.wait(lock, stop, [&] { return items_.size() < capacity_; }); // Espera espacio o stop.
    items_.push_back(std::move(item)); // Mueve el lote y evita una copia innecesaria.
    lock.unlock(); // Libera antes de despertar a otro actor.
    cv_.notify_one(); // Señala que ahora existe al menos un elemento.
  } // El productor nunca supera la capacidad declarada.
}; // La cola es dueña de su almacenamiento y de su sincronización.`

const codeCondition = `std::mutex state_mutex; // Protege la relación entre ready y recipe.
std::condition_variable_any ready_cv; // Permite dormir hasta una condición real.
bool ready = false; // Indica si la receta ya fue validada.
void station(std::stop_token stop) { // Define el punto de entrada de una estación.
  std::unique_lock lock{state_mutex}; // Toma el lock antes de observar el estado.
  ready_cv.wait(lock, stop, [] { return ready; }); // Revisa la condición tras despertar.
  lock.unlock(); // No conserva el lock durante el proceso físico.
  run_recipe(); // Ejecuta usando un snapshot consistente del estado.
} // El worker sale si stop llega mientras espera.`

const codeShutdown = `void stop_plant() { // Coordina una detención ordenada desde un único dueño.
  accepting.store(false, std::memory_order_release); // Deja de aceptar nuevos lotes.
  input.close(); // Marca la queue y despierta a los productores dormidos.
  supervisor.request_stop(); // Propaga la orden a los workers.
  resources.release(worker_count); // Desbloquea workers que esperaban permisos.
  supervisor.join(); // Espera que el supervisor cierre sus propios recursos.
  assert(active_workers.load() == 0); // Verifica que nadie siga operando.
} // La función es idempotente si close y request_stop también lo son.`

function HomePage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Cómo usar esta wiki', 'how'], ['Mapa de capítulos', 'map'], ['Contrato de aprendizaje', 'contract'], ['Primer recorrido', 'start']]}>
    <DocSection id="how" number="00.1" eyebrow="CÓMO USAR ESTA WIKI" title="Una referencia para leer con el editor abierto.">
      <Lead>Esta wiki está organizada como un manual técnico, no como una landing. Cada capítulo empieza por una decisión de ingeniería, la traduce a una primitive de C++20 y termina con preguntas de diagnóstico. La simulación y las estrategias viven en capítulos aparte para que puedas consultar el código sin mezclarlo con la operación de una planta.</Lead>
      <Definition term="Concurrencia aplicada">Diseñar varias actividades que avanzan de forma independiente, pero comparten recursos, estado y límites físicos. El objetivo no es crear más hilos: es conservar invariantes mientras el tiempo y los eventos cambian.</Definition>
      <div className="wiki-home-callout"><div className="home-callout-mark"><Icon name="book" size={22} /></div><div><strong>Ruta recomendada</strong><p>Fundamentos → Eventos y estados → Hilos → Mutex → Semáforos → Queues → Shutdown → Patrones → Pruebas.</p></div><span>9 capítulos</span></div>
    </DocSection>
    <DocSection id="map" number="00.2" eyebrow="MAPA DE CAPÍTULOS" title="De la señal física al diagnóstico.">
      <Paragraph>El índice lateral está numerado para que puedas volver a una conversación de diseño: “el problema está en 02.2, la cola acotada”, o “la estrategia de parada pertenece a 02.3”. Cada capítulo tiene ejemplos C++ con comentarios en cada línea y un enlace a la aplicación correspondiente cuando existe.</Paragraph>
      <div className="chapter-map">{wikiGroups.slice(1, 4).map((group) => <div className="chapter-map-row" key={group.number}><span>{group.number}</span><div><strong>{group.label}</strong><small>{group.items.map((item) => item.label).join(' · ')}</small></div><Icon name="arrow" size={16} /></div>)}</div>
      <ComparisonTable headers={['Capa', 'Pregunta principal', 'Primitive o herramienta']} rows={[
        ['Modelo', '¿Qué evento cambia qué estado?', 'eventos, estados, reloj monotónico'],
        ['Coordinación', '¿Quién puede actuar ahora?', 'mutex, semáforo, condición'],
        ['Flujo', '¿Dónde espera el trabajo?', 'queue acotada, backpressure'],
        ['Operación', '¿Cómo se detiene y demuestra progreso?', 'jthread, stop_token, métricas'],
      ]} />
    </DocSection>
    <DocSection id="contract" number="00.3" eyebrow="CONTRATO DE APRENDIZAJE" title="Tres preguntas antes de elegir una API.">
      <RuleCards cards={[{ icon: 'database', title: 'Qué recurso se limita', text: 'Un permiso debe representar una capacidad real: válvulas, robots, buffers, slots o personas.', tone: 'green' }, { icon: 'clock', title: 'Dónde espera el trabajo', text: 'Una espera debe tener condición, timeout o cancelación. Nunca depender de dormir y volver a mirar.', tone: 'amber' }, { icon: 'shield', title: 'Cómo se detiene', text: 'El shutdown es un caso normal de operación y debe tener el mismo nivel de diseño que el arranque.', tone: 'blue' }]} />
      <Note title="Aviso de alcance">Los ejemplos enseñan coordinación de software. Una parada de emergencia real requiere una ruta independiente, determinista y certificada; una queue o un mutex no son un circuito safety.</Note>
    </DocSection>
    <DocSection id="start" number="00.4" eyebrow="PRIMER RECORRIDO" title="Empieza por el problema que tienes delante.">
      <div className="start-grid"><NavButton onClick={() => onNavigate('semaphores')}><span><small>Si compiten recursos</small><strong>Ve a Semáforos</strong></span></NavButton><NavButton onClick={() => onNavigate('queues')}><span><small>Si una estación espera a otra</small><strong>Ve a Queues</strong></span></NavButton><NavButton onClick={() => onNavigate('threads')}><span><small>Si no sabes cómo cerrar</small><strong>Ve a Hilos</strong></span></NavButton><NavButton onClick={() => onNavigate('simulation')}><span><small>Si quieres observarlo</small><strong>Abre la simulación</strong></span></NavButton></div>
    </DocSection>
  </ArticleLayout>
}

function FundamentalsPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Concurrencia vs paralelismo', 'difference'], ['Scheduler industrial', 'scheduler'], ['Riesgos básicos', 'risks'], ['Modelo de review', 'review']]}>
    <DocSection id="difference" number="00.1" eyebrow="VOCABULARIO" title="Concurrencia no significa paralelismo.">
      <Lead>Concurrencia es la composición de actividades que pueden progresar intercaladas. Paralelismo es ejecutar actividades físicamente al mismo tiempo. Un controlador debe ser correcto bajo ambos escenarios: con un solo core, el scheduler puede cambiar de hilo entre dos instrucciones; con varios cores, dos escrituras pueden ocurrir simultáneamente.</Lead>
      <ComparisonTable headers={['Concepto', 'Qué describe', 'Ejemplo en una planta']} rows={[
        ['Concurrencia', 'Varias tareas avanzan en el mismo sistema.', 'Feeder, supervisor y logger se intercalan.'],
        ['Paralelismo', 'Varias tareas ejecutan a la vez.', 'Corte y visión procesan lotes simultáneos.'],
        ['Sincronización', 'Reglas para ordenar o limitar acciones.', 'Un robot espera un permiso de acceso.'],
        ['Determinismo', 'Mismo input produce un resultado explicable.', 'Una parada siempre deja la línea en un estado conocido.'],
      ]} />
    </DocSection>
    <DocSection id="scheduler" number="00.2" eyebrow="SCHEDULING" title="El tiempo de software no es el tiempo del proceso.">
      <Paragraph>Un hilo no posee el procesador. El sistema operativo puede pausarlo después de adquirir un lock, justo antes de liberar un semáforo o entre la lectura y la escritura de un contador. Por eso una prueba que “siempre funciona” durante una ejecución no prueba que el diseño sea correcto.</Paragraph>
      <div className="timeline-diagram"><div className="timeline-label">interleaving posible</div><div className="timeline-row"><span className="timeline-thread thread-a">feeder</span><i /><i className="active" /><i /><i className="active" /><i /></div><div className="timeline-row"><span className="timeline-thread thread-b">station</span><i className="active" /><i /><i className="active" /><i /><i className="active" /></div><div className="timeline-axis"><span>t0</span><span>t1</span><span>t2</span><span>t3</span><span>t4</span></div></div>
      <CodeBlock title="interleaving.cpp" code={`int count = 0; // Estado compartido que parece inocente.
void producer() { // El productor empieza su tramo lógico.
  auto copy = count; // Lee una copia que puede quedar obsoleta.
  copy += 1; // Cambia la copia, no el estado compartido.
  count = copy; // Otra estación puede haber escrito entre ambas líneas.
} // La carrera no se arregla con un nombre descriptivo.`} caption="Ejemplo conceptual: la operación de incremento no es indivisible." tone="amber" />
    </DocSection>
    <DocSection id="risks" number="00.3" eyebrow="RIESGOS BÁSICOS" title="Los fallos tienen nombres y síntomas distintos.">
      <RuleCards cards={[{ icon: 'zap', title: 'Data race', text: 'Dos hilos acceden al mismo dato mutable y al menos uno escribe sin una relación de sincronización.', tone: 'red' }, { icon: 'lock', title: 'Deadlock', text: 'Dos o más hilos esperan locks que el otro necesita liberar. La planta queda congelada.', tone: 'amber' }, { icon: 'clock', title: 'Starvation', text: 'Un hilo puede avanzar en teoría, pero nunca recibe CPU, permisos o una oportunidad justa.', tone: 'blue' }, { icon: 'alert', title: 'Livelock', text: 'Los hilos siguen activos y cediendo, pero el sistema no completa trabajo útil.', tone: 'red' }]} />
      <Note tone="amber" title="Diagnóstico rápido">Si el throughput cae a cero, distingue primero entre “todos están esperando” y “todos están trabajando sin progreso”. El primer caso apunta a bloqueo; el segundo, a livelock, busy-loop o un recurso mal modelado.</Note>
    </DocSection>
    <DocSection id="review" number="00.4" eyebrow="MODELO DE REVIEW" title="Haz visible la propiedad de cada estado.">
      <Paragraph>Antes de crear un hilo, escribe una tabla de ownership: estado, dueño, lectores, escritor, primitive y condición de salida. El documento puede ser pequeño, pero debe responder qué ocurre si el sensor falla, si la queue está llena y si llega una parada mientras se procesa un lote.</Paragraph>
      <Checklist items={['Cada dato mutable tiene un único dueño o un lock documentado.', 'Cada espera puede ser despertada por trabajo, cierre o fallo.', 'Cada recurso adquirido tiene una ruta de release, también en excepciones.', 'Cada worker puede terminar sin depender de otro worker que ya se haya detenido.']} />
      <NavButton onClick={() => onNavigate('semantics')}><span><small>Siguiente capítulo</small><strong>Eventos, estados y tiempo</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function SemanticsPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Evento vs estado', 'event-state'], ['Máquina de estados', 'fsm'], ['Relojes y deadlines', 'clocks'], ['Ejemplo completo', 'example']]}>
    <DocSection id="event-state" number="01.1" eyebrow="MODELADO" title="Un evento ocurre una vez; un estado dura.">
      <Lead>“Sensor de puerta abierto” es un evento. “Puerta abierta” es un estado. Mezclarlos produce workers que pueden perder la señal o ejecutar una acción repetida cada vez que consultan un booleano.</Lead>
      <ComparisonTable headers={['Elemento', 'Duración', 'Decisión de diseño']} rows={[
        ['Evento', 'Instantáneo o acotado.', 'Envíalo por una queue o señalízalo.'],
        ['Estado', 'Permanece hasta una transición.', 'Protégelo con un owner, mutex o snapshot.'],
        ['Comando', 'Intención de un actor.', 'Hazlo idempotente si puede repetirse.'],
        ['Métrica', 'Observación derivada.', 'No debe cambiar el control al leerla.'],
      ]} />
    </DocSection>
    <DocSection id="fsm" number="01.2" eyebrow="MÁQUINA DE ESTADOS" title="Las transiciones son el contrato de la estación.">
      <Paragraph>Una estación industrial suele tener estados como `idle`, `waiting_resource`, `processing`, `fault` y `safe_stop`. El estado no es una decoración para el dashboard: limita qué comandos son válidos y qué eventos deben ignorarse o convertirse en una alarma.</Paragraph>
      <div className="state-machine"><div className="state-box state-idle"><span>01</span><strong>IDLE</strong><small>sin lote</small></div><div className="state-connector">→</div><div className="state-box state-wait"><span>02</span><strong>WAITING</strong><small>sin permiso</small></div><div className="state-connector">→</div><div className="state-box state-run"><span>03</span><strong>RUNNING</strong><small>lote activo</small></div><div className="state-connector">→</div><div className="state-box state-stop"><span>04</span><strong>SAFE STOP</strong><small>salida segura</small></div></div>
      <CodeBlock title="station_state.cpp" code={`enum class StationState { // Limita los valores a estados conocidos.
  idle, // No existe un lote asignado a la estación.
  waiting_resource, // Existe trabajo pero falta capacidad compartida.
  processing, // El lote actual está dentro del proceso.
  fault, // El supervisor debe decidir una recuperación.
  safe_stop // La estación no acepta trabajo hasta ser rearmada.
}; // El enum hace revisables las transiciones.
bool can_accept(StationState state) { // Centraliza una regla de entrada.
  return state == StationState::idle; // Solo idle acepta un lote nuevo.
} // Evita duplicar condiciones en varios workers.`} caption="Los nombres de estado deben corresponderse con observables de la planta." />
    </DocSection>
    <DocSection id="clocks" number="01.3" eyebrow="TIEMPO" title="Usa relojes monotónicos para medir esperas.">
      <Paragraph>El reloj de pared puede cambiar por sincronización NTP, horario de verano o una corrección manual. Para timeouts, edades de lotes y watchdogs, usa `std::chrono::steady_clock`. El instante de calendario puede registrarse aparte para auditoría.</Paragraph>
      <div className="two-column-notes"><Note tone="green" title="Deadline">Calcula un instante límite una vez y pasa el deadline a las funciones que esperan. Evita sumar pequeños timeouts y acumular deriva.</Note><Note tone="blue" title="Timestamp">Registra `steady_clock` para duración y `system_clock` solo para correlación humana o trazabilidad externa.</Note></div>
    </DocSection>
    <DocSection id="example" number="01.4" eyebrow="EJEMPLO" title="Un evento bien formado cruza una sola frontera.">
      <Paragraph>El feeder no debería llamar directamente a una válvula o modificar el estado interno de una estación. Publica un evento; el dueño del proceso lo consume y decide la transición.</Paragraph>
      <CodeBlock title="plant_event.hpp" code={codeEventModel} caption="El evento transporta intención y contexto; no transporta un lock." />
      <NavButton onClick={() => onNavigate('threads')}><span><small>Siguiente capítulo</small><strong>Hilos y ciclo de vida</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function ThreadsPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Misión del worker', 'mission'], ['jthread', 'jthread'], ['Roles de una planta', 'roles'], ['Cancelación', 'cancel']]}>
    <DocSection id="mission" number="01.2" eyebrow="RESPONSABILIDAD" title="Un hilo debe tener una misión pequeña.">
      <Lead>Un worker mantenible tiene un input claro, un estado que posee y una salida cooperativa. Si un hilo lee sensores, actualiza el dashboard, abre válvulas y decide recetas, no es un worker: es un sistema sin fronteras.</Lead>
      <RuleCards cards={[{ icon: 'database', title: 'Input definido', text: 'Recibe eventos o trabajos desde una queue, no desde variables globales que cualquier actor puede modificar.', tone: 'blue' }, { icon: 'lock', title: 'Ownership definido', text: 'Escribe el estado de su estación y publica snapshots o eventos para el resto.', tone: 'green' }, { icon: 'shield', title: 'Salida definida', text: 'Puede salir mientras espera, después del lote actual o tras una orden de abortar.', tone: 'amber' }]} />
    </DocSection>
    <DocSection id="jthread" number="01.2.1" eyebrow="C++20" title="`std::jthread` expresa la intención correcta.">
      <Paragraph>Con `std::thread`, destruir un objeto joinable termina el proceso. `std::jthread` solicita stop y hace join automáticamente en su destructor. Eso no vuelve mágicamente cancelable a un worker: el token debe observarse y las estructuras de espera deben reaccionar.</Paragraph>
      <CodeBlock title="worker_lifecycle.cpp" code={codeThread} caption="El destructor coordina el final, pero la función debe cooperar." />
      <Note title="Solicitud no es interrupción">`request_stop()` no mata el hilo ni interrumpe una llamada bloqueante arbitraria. Diseña `pop(stop)`, `wait(lock, stop, predicate)` y timeouts para que el worker tenga una ruta de despertar.</Note>
    </DocSection>
    <DocSection id="roles" number="01.2.2" eyebrow="ARQUITECTURA" title="Roles típicos en una planta concurrente.">
      <ComparisonTable headers={['Rol', 'Responsabilidad', 'No debería hacer']} rows={[
        ['I/O adapter', 'Convierte señales físicas en eventos con timestamp.', 'Decidir la receta completa.'],
        ['Feeder', 'Valida, numera y publica lotes en la queue de entrada.', 'Escribir en una estación ajena.'],
        ['Worker', 'Consume un lote y ejecuta una operación concreta.', 'Poseer la política global de parada.'],
        ['Supervisor', 'Coordina modos, fallos, cierre y recuperación.', 'Bloquearse esperando una UI.'],
        ['Telemetry', 'Agrega snapshots, tiempos y contadores.', 'Entrar en el camino crítico del control.'],
      ]} />
    </DocSection>
    <DocSection id="cancel" number="01.2.3" eyebrow="CANCELACIÓN" title="Distingue pausa, cancelación y abort.">
      <div className="mode-cards"><div><strong>PAUSA</strong><p>Conserva el lote y el contexto; el supervisor puede reanudar.</p></div><div><strong>CANCELACIÓN</strong><p>El worker termina su unidad actual y no toma trabajo nuevo.</p></div><div><strong>ABORT</strong><p>Interrumpe por seguridad o integridad; requiere una recuperación explícita.</p></div></div>
      <Checklist items={['El token se propaga desde un único dueño del shutdown.', 'Las queues cerradas despiertan a todos los consumidores.', 'Los permisos se devuelven aunque el lote se cancele.', 'El registro distingue una salida normal de una salida por fallo.']} />
      <NavButton onClick={() => onNavigate('mutex')}><span><small>Siguiente capítulo</small><strong>Mutex, invariantes y esperas</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function MutexPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Invariante', 'invariant'], ['RAII', 'raii'], ['Condition variable', 'condition'], ['Orden de locks', 'ordering']]}>
    <DocSection id="invariant" number="01.3" eyebrow="PROTECCIÓN DE ESTADO" title="Un mutex protege una invariante, no una función entera.">
      <Lead>La pregunta correcta no es “¿dónde pongo el mutex?”, sino “¿qué relación debe ser siempre cierta?”. Por ejemplo: `active_workers &lt;= worker_limit`, o “si la queue está vacía, no existe un consumidor que pueda extraer un elemento”.</Lead>
      <Definition term="Invariante">Una propiedad que debe mantenerse verdadera antes y después de cada operación pública sobre un estado compartido. El mutex cubre la transición que conserva esa propiedad.</Definition>
      <CodeBlock title="invariant.cpp" code={`struct Counters { // Reúne valores que deben cambiar juntos.
  int produced = 0; // Cuenta lotes que entraron al sistema.
  int completed = 0; // Cuenta lotes que terminaron el proceso.
}; // La relación entre ambos pertenece al mismo estado.
std::mutex counters_mutex; // Protege la lectura y la escritura coherente.
void mark_completed(Counters& counters) { // Cambia una transición del dominio.
  std::lock_guard lock{counters_mutex}; // Mantiene el lock solo durante la mutación.
  ++counters.completed; // Actualiza el dato bajo protección.
} // El destructor libera incluso si aparece una excepción.`} caption="RAII hace que el scope, y no la memoria del programador, controle la liberación." />
    </DocSection>
    <DocSection id="raii" number="01.3.1" eyebrow="RAII" title="Elige el lock por la operación que necesitas.">
      <ComparisonTable headers={['Tipo', 'Propiedad', 'Uso típico']} rows={[
        ['lock_guard', 'Adquiere y libera en un scope fijo.', 'Una mutación corta y sin espera.'],
        ['unique_lock', 'Puede desbloquear, mover y esperar.', 'condition_variable o varias fases.'],
        ['scoped_lock', 'Adquiere varios mutex con deadlock avoidance.', 'Actualizar dos invariantes relacionadas.'],
        ['shared_lock', 'Lectura compartida de un shared_mutex.', 'Snapshot que no modifica estado.'],
      ]} />
    </DocSection>
    <DocSection id="condition" number="01.3.2" eyebrow="ESPERAS" title="Una condition variable siempre espera una condición.">
      <Paragraph>El notify no es el evento; es solo una sugerencia para despertar. La condición real debe estar en un predicado y debe reevaluarse porque puede haber despertares espurios o porque otro hilo consumió el estado antes que nosotros.</Paragraph>
      <CodeBlock title="condition_wait.cpp" code={codeCondition} caption="La lambda describe el estado que hace válida la continuación." />
      <Note tone="red" title="Nunca uses `if` para una espera">`if (!ready) cv.wait(lock);` es incorrecto porque el hilo puede despertar sin que `ready` sea cierto. Usa siempre la sobrecarga con predicado o un `while` equivalente.</Note>
    </DocSection>
    <DocSection id="ordering" number="01.3.3" eyebrow="DEADLOCK" title="Publica un orden global de adquisición.">
      <Paragraph>Si una operación necesita `recipe_mutex` y `buffer_mutex`, todas las operaciones del sistema deben tomarlos en ese orden. Un helper que invierte la secuencia es suficiente para crear un deadlock en producción.</Paragraph>
      <div className="lock-order"><span><b>01</b> recipe</span><i>→</i><span><b>02</b> buffer</span><i>→</i><span><b>03</b> metrics</span></div>
      <Checklist items={['No llames a IO, callbacks o código desconocido mientras sostienes un mutex.', 'No mezcles un semáforo y un mutex sin documentar qué recurso protege cada uno.', 'Mantén la sección crítica corta y mide su duración en el diagnóstico.', 'Si necesitas dos locks, usa scoped_lock o una jerarquía visible.']} />
      <NavButton onClick={() => onNavigate('signals')}><span><small>Siguiente capítulo</small><strong>Atomics y señales auxiliares</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function SignalsPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Atomic', 'atomic'], ['Memory order', 'memory'], ['Barreras y latches', 'phases'], ['Futuros', 'futures']]}>
    <DocSection id="atomic" number="01.4" eyebrow="VISIBILIDAD" title="Atomic no significa “cualquier dato es seguro”.">
      <Lead>Un `std::atomic` hace atómica una operación sobre su objeto y crea reglas de visibilidad según el memory order elegido. No vuelve atómica una estructura relacionada ni sustituye un mutex cuando hay varias variables que deben cambiar juntas.</Lead>
      <RuleCards cards={[{ icon: 'zap', title: 'Contador', text: 'Usa atomic para métricas monotónicas como lotes completados o pulsos observados.', tone: 'green' }, { icon: 'activity', title: 'Flag', text: 'Un modo simple como accepting o fault puede ser atomic si no tiene invariantes vecinas.', tone: 'blue' }, { icon: 'lock', title: 'Estado compuesto', text: 'Si recipe, mode y version deben ser coherentes, usa un snapshot protegido.', tone: 'amber' }]} />
      <CodeBlock title="atomic_metrics.cpp" code={`std::atomic<std::uint64_t> completed{0}; // Publica progreso sin bloquear el worker.
void mark_completed() { // Se ejecuta al finalizar un lote válido.
  completed.fetch_add(1, std::memory_order_relaxed); // Solo necesitamos contar, no ordenar datos.
} // La métrica no decide el control.
std::atomic<bool> accepting{true}; // Representa un modo global sencillo.
void close_input() { // Cambia el modo de aceptación durante shutdown.
  accepting.store(false, std::memory_order_release); // Publica la orden a otros hilos.
} // El release acompaña una lectura acquire del consumidor.`} caption="El memory order debe describir la relación que necesitas, no adornar el código." />
    </DocSection>
    <DocSection id="memory" number="01.4.1" eyebrow="MEMORY ORDER" title="Escoge el orden desde la propiedad que quieres publicar.">
      <ComparisonTable headers={['Orden', 'Garantía aproximada', 'Uso prudente']} rows={[
        ['relaxed', 'Atomicidad del objeto sin sincronizar datos vecinos.', 'Contadores y métricas independientes.'],
        ['acquire', 'Las lecturas posteriores observan publicaciones previas.', 'Consumir un flag o puntero publicado.'],
        ['release', 'Las escrituras previas se publican al almacenar.', 'Publicar una transición simple.'],
        ['seq_cst', 'Orden global más fuerte y fácil de razonar.', 'Base segura cuando el coste no es crítico.'],
      ]} />
      <Note tone="amber" title="Regla práctica">Empieza con el orden más sencillo que exprese la propiedad. Optimiza a relaxed solo después de medir y documentar la relación de publicación.</Note>
    </DocSection>
    <DocSection id="phases" number="01.4.2" eyebrow="FASES" title="Barrier y latch sincronizan momentos, no trabajo arbitrario.">
      <Paragraph>Una `barrier` reutilizable espera a un grupo que participa en varias fases. Un `latch` cuenta eventos una sola vez y es útil para esperar la inicialización de sensores o la confirmación de un lote de calibración.</Paragraph>
      <CodeBlock title="startup_phase.cpp" code={`std::latch sensors_ready{3}; // Espera tres confirmaciones de inicialización.
void initialize_sensor(Sensor& sensor) { // Cada hilo prepara un sensor distinto.
  sensor.configure(); // Ejecuta la configuración propia de hardware.
  sensors_ready.count_down(); // Publica que esta inicialización terminó.
} // El hilo no necesita conocer a los otros sensores.
void start_line() { // El supervisor es dueño del arranque.
  sensors_ready.wait(); // No libera la línea hasta reunir todas las señales.
  command_line_start(); // Comienza solo después de la fase completa.
} // Un latch no se reutiliza para la siguiente receta.`} />
    </DocSection>
    <DocSection id="futures" number="01.4.3" eyebrow="RESULTADOS" title="Futures expresan una respuesta, no un stream de eventos.">
      <Paragraph>Usa `promise` y `future` para una respuesta única: cargar una receta, completar una calibración o devolver el resultado de una operación. Para una secuencia continua, una queue de eventos hace más visible el ownership y el backpressure.</Paragraph>
      <NavButton onClick={() => onNavigate('semaphores')}><span><small>Siguiente capítulo</small><strong>Semáforos: permisos contables</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function SemaphoresPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Qué cuenta', 'count'], ['API', 'api'], ['Ejemplo de pool', 'pool'], ['Errores frecuentes', 'mistakes']]}>
    <DocSection id="count" number="02.1" eyebrow="CAPACIDAD" title="Un semáforo cuenta permisos disponibles.">
      <Lead>Un mutex pregunta quién entra a una sección crítica. Un semáforo pregunta cuántas unidades pueden entrar. Esa diferencia permite representar un pool de robots, dos válvulas libres, tres puestos de inspección o un número máximo de lotes en proceso.</Lead>
      <div className="semaphore-visual"><div><span>POOL DE RECURSOS</span><strong>2 / 3 permisos<br />disponibles</strong><p>El permiso representa capacidad física y debe devolverse cuando termina su uso.</p></div><div className="semaphore-balls"><i>T1</i><i>T2</i><i className="empty">+</i><b>02<small>FREE</small></b></div></div>
      <ComparisonTable headers={['Tipo', 'Capacidad', 'Ejemplo']} rows={[
        ['binary_semaphore', '0 o 1 permiso.', 'Gate, evento de ready o señal de acceso.'],
        ['counting_semaphore<N>', 'Hasta N permisos.', 'Pool de válvulas, robots o slots.'],
        ['mutex', 'Un dueño a la vez.', 'Protección de una invariante mutable.'],
      ]} />
    </DocSection>
    <DocSection id="api" number="02.1.1" eyebrow="API C++20" title="Las operaciones mínimas y cuándo usarlas.">
      <ComparisonTable headers={['Operación', 'Bloqueo', 'Uso industrial']} rows={[
        ['acquire()', 'Indefinido hasta conseguir permiso.', 'El trabajo debe esperar y la espera es cancelable por otra vía.'],
        ['try_acquire()', 'No bloquea.', 'Seleccionar una estación alternativa o emitir diagnóstico.'],
        ['try_acquire_for()', 'Espera una duración.', 'Timeout operativo con ruta de recovery.'],
        ['try_acquire_until()', 'Espera hasta deadline.', 'Coordinar con un deadline de lote o watchdog.'],
        ['release()', 'Devuelve uno o varios permisos.', 'Siempre al salir del uso del recurso.'],
      ]} />
    </DocSection>
    <DocSection id="pool" number="02.1.2" eyebrow="EJEMPLO" title="Pool de válvulas con release en el error.">
      <Paragraph>El patrón mínimo debe protegerse contra excepciones. Si una válvula falla después de adquirir el permiso, el sistema tiene que restaurar la capacidad antes de notificar el fallo; de lo contrario, una sola avería puede agotar el pool.</Paragraph>
      <CodeBlock title="valve_pool.cpp" code={codeSemaphore} caption="El release aparece tanto en el camino normal como en el camino de excepción." />
      <Note tone="blue" title="Semáforo y exclusión son complementarios">Un permiso puede limitar el número de trabajadores, pero no protege automáticamente la estructura que registra esos trabajadores. Usa un mutex para el estado compuesto y el semáforo para la capacidad.</Note>
    </DocSection>
    <DocSection id="mistakes" number="02.1.3" eyebrow="ERRORES FRECUENTES" title="Síntomas de una cuenta de permisos incorrecta.">
      <div className="mistake-list"><div><span className="mistake-bad">−</span><strong>Acquire demasiado pronto</strong><p>El worker toma el permiso antes de tener un lote y reduce el throughput sin usar el recurso.</p></div><div><span className="mistake-bad">−</span><strong>Release olvidado</strong><p>La planta parece degradarse poco a poco hasta que todos los hilos quedan esperando.</p></div><div><span className="mistake-good">+</span><strong>Permiso alrededor del uso real</strong><p>El scope de adquisición coincide con el periodo en que la capacidad física está ocupada.</p></div></div>
      <NavButton onClick={() => onNavigate('queues')}><span><small>Siguiente capítulo</small><strong>Queues acotadas y backpressure</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function QueuesPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Contrato de una queue', 'contract'], ['Implementación', 'implementation'], ['Políticas', 'policies'], ['Cierre', 'close']]}>
    <DocSection id="contract" number="02.2" eyebrow="PRODUCTOR / CONSUMIDOR" title="La queue es un contrato de ritmo.">
      <Lead>Una queue industrial desacopla una fuente irregular de un consumidor con ritmo propio, pero también define cuánta espera es aceptable. Su tamaño no debería ser “lo que cabe en memoria”; debería ser el WIP que el proceso puede absorber sin perder trazabilidad.</Lead>
      <div className="queue-diagram"><div className="queue-actor actor-blue"><Icon name="zap" size={18} /><strong>Feeder</strong><small>produce</small></div><div className="queue-pipe"><i /><i /><i /></div><div className="queue-buffer"><span><code>queue&lt;Batch&gt;</code><b>04 / 06</b></span><div>{[1, 1, 1, 1, 0, 0].map((filled, index) => <i className={filled ? 'filled' : ''} key={index} />)}</div><small>WIP CONTROLADO</small></div><div className="queue-pipe"><i /><i /><i /></div><div className="queue-actor actor-green"><Icon name="activity" size={18} /><strong>Station</strong><small>consume</small></div></div>
      <Definition term="Backpressure">Una señal de vuelta que impide que el productor siga generando trabajo cuando el consumidor o el buffer ya alcanzaron su capacidad.</Definition>
    </DocSection>
    <DocSection id="implementation" number="02.2.1" eyebrow="IMPLEMENTACIÓN" title="Bloquea el estado, no el proceso físico.">
      <Paragraph>La cola debe proteger su deque y su capacidad con un mutex. El productor espera a que haya espacio, el consumidor espera a que haya elementos y ambos deben poder despertar cuando la cola se cierra o llega un stop token.</Paragraph>
      <CodeBlock title="bounded_queue.hpp" code={codeQueue} caption="El lock se libera antes de notificar y nunca cubre una operación de IO." />
      <RuleCards cards={[{ icon: 'lock', title: 'Una única estructura protegida', text: 'El mutex cubre items_ y las invariantes de capacidad, no la ejecución de la estación.', tone: 'blue' }, { icon: 'clock', title: 'Predicado real', text: 'wait vuelve a comprobar espacio, elementos o cierre después de cada despertar.', tone: 'amber' }, { icon: 'shield', title: 'Cierre explícito', text: 'close despierta a todos para que ningún consumidor quede esperando eternamente.', tone: 'green' }]} />
    </DocSection>
    <DocSection id="policies" number="02.2.2" eyebrow="POLÍTICA OPERACIONAL" title="Cuando la queue se llena, debes decidir.">
      <ComparisonTable headers={['Política', 'Adecuada para', 'Coste o riesgo']} rows={[
        ['Bloquear productor', 'Producto que no puede perderse.', 'La presión viaja a la entrada.'],
        ['Rechazar y alarmar', 'Trazabilidad y calidad estrictas.', 'Necesita reintento o cuarentena.'],
        ['Descartar antiguo', 'Telemetría donde importa lo reciente.', 'Invalida la secuencia de producto.'],
        ['Sobrescribir', 'Último valor de un setpoint.', 'No válida para lotes ni comandos.'],
      ]} />
      <Note tone="amber" title="Una queue infinita no elimina el cuello de botella">Solo cambia un bloqueo visible por latencia creciente, memoria creciente e inventario oculto. Mide ocupación, edad del elemento más antiguo y tiempo de espera.</Note>
    </DocSection>
    <DocSection id="close" number="02.2.3" eyebrow="CIERRE" title="Cerrar una queue es una transición, no borrar el contenedor.">
      <Paragraph>El consumidor debe diferenciar “no hay trabajo ahora” de “no habrá más trabajo”. Un `close()` idempotente marca la intención, despierta productores y consumidores, y permite drenar o cancelar según la política elegida.</Paragraph>
      <Checklist items={['El producer deja de aceptar nuevas entradas.', 'Los lotes ya publicados tienen una política de drain o cancelación.', 'Todos los waiters despiertan al cerrar.', 'El log registra quién cerró y cuántos elementos quedaron pendientes.']} />
      <NavButton onClick={() => onNavigate('shutdown')}><span><small>Siguiente capítulo</small><strong>Shutdown seguro</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function ShutdownPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Dos tipos de parada', 'types'], ['Secuencia controlada', 'sequence'], ['Código', 'code'], ['Safety boundary', 'safety']]}>
    <DocSection id="types" number="02.3" eyebrow="MODOS DE PARADA" title="No mezcles pausa, shutdown y emergencia.">
      <Lead>Una parada controlada permite terminar lotes y liberar recursos. Una emergencia busca llevar el sistema a un estado seguro con la menor latencia posible. Ambas necesitan coordinación, pero no tienen el mismo objetivo ni la misma ruta técnica.</Lead>
      <div className="shutdown-modes"><div className="shutdown-mode mode-blue"><span>01</span><strong>CONTROLLED STOP</strong><p>Deja de aceptar trabajo, drena lo permitido, solicita stop y verifica recursos.</p></div><div className="shutdown-mode mode-amber"><span>02</span><strong>PAUSE / HOLD</strong><p>Conserva contexto para reanudar cuando una condición operacional cambie.</p></div><div className="shutdown-mode mode-red"><span>03</span><strong>EMERGENCY STOP</strong><p>Activa una ruta independiente de seguridad; el software registra y acompaña.</p></div></div>
    </DocSection>
    <DocSection id="sequence" number="02.3.1" eyebrow="SECUENCIA" title="Cinco fases para detener sin dejar trabajo ambiguo.">
      <div className="shutdown-sequence">{[['01', 'Quiesce', 'Dejar de aceptar nuevos comandos y lotes.'], ['02', 'Wake', 'Despertar queues, CVs y esperas de permisos.'], ['03', 'Cancel', 'Propagar stop y permitir salida cooperativa.'], ['04', 'Join', 'Esperar a todos los hilos y cerrar IO.'], ['05', 'Verify', 'Comprobar invariantes, métricas y estado seguro.']].map(([number, title, text]) => <div key={number}><span>{number}</span><strong>{title}</strong><p>{text}</p></div>)}</div>
    </DocSection>
    <DocSection id="code" number="02.3.2" eyebrow="IMPLEMENTACIÓN" title="Un único dueño coordina el shutdown.">
      <CodeBlock title="controlled_shutdown.cpp" code={codeShutdown} caption="La secuencia debe ser observable e idempotente." />
      <Note tone="red" title="No dependas del destructor para apagar IO peligroso">El RAII ayuda a liberar memoria y locks, pero una salida segura de actuadores y energía debe ser una decisión explícita del sistema.</Note>
    </DocSection>
    <DocSection id="safety" number="02.3.3" eyebrow="FRONTERA DE RESPONSABILIDAD" title="Software de coordinación no es safety funcional.">
      <ComparisonTable headers={['Software concurrente', 'Sistema safety']} rows={[
        ['Busca consistencia, cancelación y trazabilidad.', 'Busca una respuesta segura ante fallos definidos.'],
        ['Puede ejecutarse sobre un SO generalista.', 'Tiene hardware, diagnóstico y certificación apropiados.'],
        ['Una excepción puede registrarse y recuperarse.', 'Un fallo debe llevar a una salida validada.'],
      ]} />
      <NavButton onClick={() => onNavigate('patterns')}><span><small>Siguiente capítulo</small><strong>Patrones de control</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function PatternsPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Pipeline', 'pipeline'], ['Supervisor', 'supervisor'], ['Pool de workers', 'pool'], ['Anti-patrones', 'anti']]}>
    <DocSection id="pipeline" number="03.1" eyebrow="PIPELINE" title="Una línea es una secuencia de contratos.">
      <Lead>Modela cada tramo con una entrada, una salida y una capacidad. Sensor → queue → estación → queue → estación. Esta separación permite cambiar el ritmo de un tramo sin que todo el sistema comparta un estado global.</Lead>
      <div className="pattern-pipeline"><div><span>01</span><strong>INPUT</strong><small>events</small></div><i>→</i><div><span>02</span><strong>BUFFER</strong><small>bounded queue</small></div><i>→</i><div><span>03</span><strong>WORKER</strong><small>jthread</small></div><i>→</i><div><span>04</span><strong>OUTPUT</strong><small>snapshot</small></div></div>
      <RuleCards cards={[{ icon: 'queue', title: 'Frontera de flujo', text: 'Una queue comunica trabajo y hace visible la acumulación.', tone: 'blue' }, { icon: 'semaphore', title: 'Frontera de capacidad', text: 'Un semáforo expresa cuántos trabajos pueden ocupar un recurso.', tone: 'green' }, { icon: 'database', title: 'Frontera de datos', text: 'Un snapshot comunica estado sin entregar el ownership del mutable.', tone: 'amber' }]} />
    </DocSection>
    <DocSection id="supervisor" number="03.1.1" eyebrow="SUPERVISOR" title="Centraliza decisiones de modo y recuperación.">
      <Paragraph>Los workers deberían conocer su operación, no toda la política de la planta. Un supervisor consume fallos, cambios de modo y métricas de progreso; decide si pausar, reintentar, poner una estación en cuarentena o iniciar un shutdown.</Paragraph>
      <ComparisonTable headers={['Patrón', 'Buen encaje', 'Señal de mal encaje']} rows={[
        ['Supervisor + workers', 'Modos, recetas, fallos y lifecycle.', 'Workers que se envían órdenes entre sí sin dueño.'],
        ['Pipeline', 'Flujo estable por fases.', 'Fases con capacidad o latencia totalmente distinta sin buffer.'],
        ['Resource pool', 'Varios consumidores, recurso limitado.', 'Pool que oculta una dependencia de seguridad.'],
        ['Actor / mailbox', 'Ownership fuerte por componente.', 'Mensajes sin capacidad ni política de overflow.'],
      ]} />
    </DocSection>
    <DocSection id="pool" number="03.1.2" eyebrow="POOL DE WORKERS" title="El tamaño del pool nace del cuello de botella.">
      <Paragraph>Más workers no siempre significan más producción. Si el recurso físico tiene dos permisos, un pool de ocho solo añade hilos esperando, cambios de contexto y más estados que diagnosticar. Empieza con una capacidad basada en el proceso y mide.</Paragraph>
      <div className="pool-equation"><span>throughput útil</span><b>=</b><strong>min(input, workers, permits, output)</strong><small>La fase más lenta marca el límite real.</small></div>
      <Note title="Diseño por evidencia">Registra ocupación de workers, tiempo bloqueado por permiso y edad de la queue. Ajusta el pool cuando esos datos demuestren una limitación, no por intuición.</Note>
    </DocSection>
    <DocSection id="anti" number="03.1.3" eyebrow="ANTI-PATRONES" title="Señales que deberían detener un review.">
      <div className="anti-patterns"><span><Icon name="alert" size={15} /> `sleep_for` usado como sincronización.</span><span><Icon name="alert" size={15} /> Queue global sin capacidad ni close.</span><span><Icon name="alert" size={15} /> Mutex retenido durante IO o callback.</span><span><Icon name="alert" size={15} /> `detach()` para evitar decidir cómo cerrar.</span><span><Icon name="alert" size={15} /> Hilo que modifica el estado de otro hilo directamente.</span></div>
      <NavButton onClick={() => onNavigate('testing')}><span><small>Siguiente capítulo</small><strong>Pruebas, trazas y diagnóstico</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function TestingPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Pruebas deterministas', 'deterministic'], ['Fallos inyectados', 'faults'], ['Métricas', 'metrics'], ['Review final', 'review']]}>
    <DocSection id="deterministic" number="03.2" eyebrow="TESTING" title="El resultado no basta: prueba la coordinación.">
      <Lead>Dos ejecuciones con el mismo input pueden intercalar workers de forma distinta. Una buena suite no exige una secuencia exacta cuando el contrato permite varias; verifica invariantes, ausencia de pérdida de lotes y una salida consistente.</Lead>
      <Checklist items={['El número producido coincide con completado + rechazado + pendiente.', 'La ocupación de la queue nunca supera su capacidad.', 'Los permisos nunca son negativos ni superan el máximo.', 'Tras shutdown, active_workers llega a cero.', 'Una parada repetida no cambia el estado después de la primera.']} />
      <CodeBlock title="plant_invariant.test.cpp" code={`TEST_CASE("el buffer permanece acotado") { // Describe una propiedad, no una secuencia frágil.
  Plant plant{.capacity = 4}; // Construye un escenario pequeño y reproducible.
  plant.inject_arrivals(20); // Fuerza al productor a superar al consumidor.
  plant.run_steps(40); // Avanza un reloj virtual, no duerme el test real.
  CHECK(plant.queue_size() <= 4); // La capacidad es una invariante visible.
  CHECK(plant.blocked_arrivals() > 0); // El backpressure debe haber actuado.
} // El test explica qué significa “funcionar” en este caso.`} caption="Un reloj virtual hace que los escenarios de concurrencia sean rápidos y repetibles." />
    </DocSection>
    <DocSection id="faults" number="03.2.1" eyebrow="FAULT INJECTION" title="Rompe el sistema de forma deliberada.">
      <div className="fault-grid"><div><span>F01</span><strong>QUEUE FULL</strong><p>El productor debe bloquear, rechazar o alarmar según la política.</p></div><div><span>F02</span><strong>WORKER HUNG</strong><p>El watchdog debe detectar falta de progreso, no solo falta de actividad.</p></div><div><span>F03</span><strong>STOP DURING IO</strong><p>El cierre debe dejar clara la propiedad del recurso en vuelo.</p></div><div><span>F04</span><strong>RESOURCE LOST</strong><p>El permiso y el estado de recovery no pueden quedar consumidos.</p></div></div>
      <Note tone="amber" title="Inyecta retrasos, no solo excepciones">La mayoría de las carreras aparecen cuando un hilo es pausado entre dos operaciones que el autor creía consecutivas. Introduce latencia artificial en acquire, push, process y release.</Note>
    </DocSection>
    <DocSection id="metrics" number="03.2.2" eyebrow="OBSERVABILIDAD" title="Mide estados que expliquen una espera.">
      <ComparisonTable headers={['Métrica', 'Qué responde', 'Alarma sugerida']} rows={[
        ['queue_depth', '¿Cuánto WIP está acumulado?', 'Sostenido por encima del objetivo.'],
        ['queue_age', '¿Cuánto espera el lote más antiguo?', 'Supera el deadline de proceso.'],
        ['permit_wait', '¿Cuánto tiempo esperan recursos?', 'Crece sin aumentar throughput.'],
        ['last_progress', '¿Cuándo cambió algo útil?', 'Watchdog sin progreso.'],
        ['shutdown_latency', '¿Cuánto tarda en cerrar?', 'Supera la ventana operativa.'],
      ]} />
    </DocSection>
    <DocSection id="review" number="03.2.3" eyebrow="CHECKLIST" title="Preguntas finales antes de IO real.">
      <Checklist items={['¿Quién posee cada dato mutable y cómo se publica?', '¿Qué pasa con una entrada cuando el buffer está lleno?', '¿Qué sucede si el worker muere después de adquirir un permiso?', '¿Puede cada espera despertar por trabajo, close, stop o timeout?', '¿El dashboard observa sin entrar en el camino crítico?', '¿Qué requisitos deben salir del software y pertenecer a safety hardware?']} />
      <NavButton onClick={() => onNavigate('api')}><span><small>Siguiente capítulo</small><strong>Referencia rápida de C++20</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function ApiPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <ArticleLayout meta={meta} toc={[['Mapa de decisión', 'decision'], ['Headers y tipos', 'headers'], ['Review rápido', 'review'], ['Compilar', 'compile']]}>
    <DocSection id="decision" number="03.3" eyebrow="MAPA DE DECISIÓN" title="Elige por intención.">
      <ComparisonTable headers={['Necesito...', 'Empieza por...', 'Evita usarlo para...']} rows={[
        ['Proteger una invariante', 'mutex + lock_guard/unique_lock', 'Contar capacidad física.'],
        ['Limitar recursos', 'counting_semaphore', 'Proteger varios campos relacionados.'],
        ['Pasar trabajo', 'bounded queue', 'Guardar estado global sin ownership.'],
        ['Señalar un evento', 'binary_semaphore o queue', 'Crear un busy-loop.'],
        ['Parar workers', 'jthread + stop_token', 'Matar hilos desde fuera.'],
        ['Publicar un contador', 'atomic relaxed', 'Coordinar un estado compuesto.'],
      ]} />
    </DocSection>
    <DocSection id="headers" number="03.3.1" eyebrow="HEADERS" title="El mapa de la biblioteca estándar.">
      <div className="header-map">{[['<thread>', 'thread, jthread, stop_token', 'lifecycle'], ['<mutex>', 'mutex, lock_guard, unique_lock, scoped_lock', 'ownership'], ['<condition_variable>', 'condition_variable, condition_variable_any', 'esperas'], ['<semaphore>', 'binary_semaphore, counting_semaphore', 'capacidad'], ['<atomic>', 'atomic, atomic_flag', 'visibilidad'], ['<barrier>', 'barrier, latch', 'fases']].map(([header, symbols, use]) => <div key={header}><code>{header}</code><strong>{symbols}</strong><small>{use}</small></div>)}</div>
      <CodeBlock title="includes.cpp" code={`#include <atomic> // Importa contadores y flags atómicos.
#include <condition_variable> // Importa esperas asociadas a un mutex.
#include <deque> // Proporciona almacenamiento FIFO para el buffer.
#include <mutex> // Importa las primitivas de ownership.
#include <semaphore> // Importa binary y counting semaphores de C++20.
#include <thread> // Importa jthread y stop_token.
using namespace std::chrono_literals; // Permite expresar 20ms de forma legible.
constexpr auto cycle = 20ms; // Centraliza el periodo de un ciclo de control.`} />
    </DocSection>
    <DocSection id="review" number="03.3.2" eyebrow="REVIEW RÁPIDO" title="Un fragmento correcto cuenta una historia completa.">
      <div className="api-review"><span><b>01</b> Tiene un dueño del estado.</span><span><b>02</b> La espera tiene predicado.</span><span><b>03</b> La capacidad tiene límite.</span><span><b>04</b> El error restaura recursos.</span><span><b>05</b> El cierre despierta esperas.</span><span><b>06</b> La métrica demuestra progreso.</span></div>
    </DocSection>
    <DocSection id="compile" number="03.3.3" eyebrow="COMPILAR" title="Warnings altos y sanitizer durante desarrollo.">
      <div className="command-stack"><code><span>$</span> g++ -std=c++20 -Wall -Wextra -Wpedantic -pthread controller.cpp</code><code><span>$</span> g++ -std=c++20 -fsanitize=thread -g controller.cpp</code><code><span>$</span> ./controller --workers 3 --buffer 6 --inject queue_full</code></div>
      <Note title="Sanitizers no sustituyen un modelo">ThreadSanitizer ayuda a encontrar data races en escenarios ejecutados; no demuestra que no exista un deadlock, una pérdida de lote o una política operacional incorrecta.</Note>
      <NavButton onClick={() => onNavigate('simulation')}><span><small>Aplicación aparte</small><strong>Observar estas decisiones en la simulación</strong></span></NavButton>
    </DocSection>
  </ArticleLayout>
}

function SimulationPage({ meta }: { meta: PageMeta }) {
  const [config, setConfig] = useState<PlantConfig>(defaultPlantConfig)
  const [state, setState] = useState<PlantState>(() => createInitialPlantState(defaultPlantConfig))
  useEffect(() => {
    if (!state.running || state.emergency) return undefined
    const interval = window.setInterval(() => setState((current) => stepPlant(current, config)), 850)
    return () => window.clearInterval(interval)
  }, [state.running, state.emergency, config])
  const update = (key: keyof PlantConfig, value: number) => {
    const next = { ...config, [key]: value }
    setConfig(next)
    setState(createInitialPlantState(next))
  }
  return <div className="application-page"><PageHeader meta={meta} accent /><div className="application-intro"><span className="application-label"><Icon name="activity" size={15} /> LABORATORIO SEPARADO DE LA WIKI</span><p>Este espacio ejecuta un modelo determinista del flujo. Ajusta la carga, avanza paso a paso y relaciona cada estado con la línea C++ que lo explica.</p></div><div className="lab-toolbar"><div><button className="lab-button lab-start" onClick={() => setState(togglePlant)} disabled={state.emergency}><Icon name={state.running ? 'pause' : 'play'} size={15} />{state.running ? 'Pausar' : 'Arrancar'}</button><button className="lab-button" onClick={() => setState((current) => stepPlant(current, config))} disabled={state.emergency}><Icon name="step" size={15} />Paso</button><button className="lab-button" onClick={() => setState(createInitialPlantState(config))}><Icon name="reset" size={15} />Reset</button><button className={`lab-button lab-emergency ${state.emergency ? 'released' : ''}`} onClick={() => setState((current) => setEmergencyStop(current, !current.emergency))}><Icon name={state.emergency ? 'check' : 'alert'} size={15} />{state.emergency ? 'Liberar parada' : 'Parada de emergencia'}</button></div><span>CICLO <b>{String(state.tick).padStart(3, '0')}</b></span></div><div className="lab-layout"><div><PlantFloor state={state} config={config} /><div className="lab-metrics"><LabMetric value={`${state.queue}/${config.queueCapacity}`} label="buffer ocupado" tone="amber" icon="queue" /><LabMetric value={`${state.permits}`} label="permisos libres" tone="green" icon="semaphore" /><LabMetric value={`${state.activeWorkers}`} label="workers activos" tone="blue" icon="thread" /><LabMetric value={`${state.blocked}`} label="entradas bloqueadas" tone="red" icon="alert" /></div><div className="lab-last-event"><Icon name="activity" size={17} /><div><small>ÚLTIMO EVENTO / LÍNEA {String(state.lastLine).padStart(2, '0')}</small><strong>{state.lastEvent}</strong></div><span>T+{String(state.tick).padStart(3, '0')}</span></div></div><aside className="lab-side"><div className="lab-config"><div className="lab-config-head"><span>PARÁMETROS</span><Icon name="sliders" size={16} /></div><strong>Diseña la carga</strong><LabSlider label="Capacidad del buffer" value={config.queueCapacity} min={2} max={10} suffix="slots" onChange={(value) => update('queueCapacity', value)} /><LabSlider label="Workers disponibles" value={config.workerCount} min={1} max={3} suffix="hilos" onChange={(value) => update('workerCount', value)} /><LabSlider label="Ritmo de llegada" value={config.arrivalRate} min={1} max={5} suffix={`${config.arrivalRate}/5`} onChange={(value) => update('arrivalRate', value)} /><small>Cambiar un parámetro reinicia el escenario.</small></div><SourcePanel state={state} /><EventLog logs={state.logs} /></aside></div><div className="application-disclaimer"><Icon name="shield" size={17} /><span><strong>Frontera de seguridad:</strong> la simulación explica coordinación de software. No sustituye un PLC safety, un relé certificado ni un análisis de riesgos.</span></div></div>
}

function PlantFloor({ state, config }: { state: PlantState; config: PlantConfig }) {
  return <div className={`plant-floor ${state.emergency ? 'plant-floor-stop' : ''}`}><div className="plant-floor-top"><div><span>FLOOR PLAN / LÍNEA 04</span><strong>Coordinación de estaciones</strong></div><div><i className="legend-green" /> procesa <i className="legend-amber" /> espera <i className="legend-red" /> stop</div></div><div className="plant-canvas"><div className="canvas-grid" /><div className="canvas-route route-input" /><div className="canvas-route route-process" /><PlantInput count={state.produced} /><LiveQueue state={state} config={config} /><div className="live-stations">{state.stations.map((station, index) => <LiveStation station={station} index={index} key={station.id} />)}</div><PlantOutput count={state.completed} /><div className="safety-state"><Icon name="shield" size={13} /> {state.emergency ? 'SAFE STOP' : 'INTERLOCK OK'}</div></div><div className="plant-floor-bottom"><span><b>INPUT</b> sensor</span><span><b>BUFFER</b> queue acotada</span><span><b>PROCESS</b> permisos</span><span><b>OUTPUT</b> lote cerrado</span></div></div>
}
function PlantInput({ count }: { count: number }) { return <div className="plant-input"><span><Icon name="zap" size={16} /></span><strong>Entrada</strong><small>{count} lotes</small></div> }
function PlantOutput({ count }: { count: number }) { return <div className="plant-output"><span><Icon name="check-circle" size={16} /></span><strong>Salida</strong><small>{count} completos</small></div> }
function LiveQueue({ state, config }: { state: PlantState; config: PlantConfig }) { return <div className="live-queue"><div><span><Icon name="queue" size={14} /> BUFFER</span><b>{state.queue}/{config.queueCapacity}</b></div><section>{Array.from({ length: config.queueCapacity }, (_, index) => <i className={index < state.queue ? 'filled' : ''} key={index}>{index < state.queue ? '·' : ''}</i>)}</section><small>{state.queue === config.queueCapacity ? 'CAPACIDAD MÁXIMA' : 'ENTRADA ACOTADA'}</small></div> }
function LiveStation({ station, index }: { station: StationState; index: number }) { const labels: Record<StationStatus, string> = { idle: 'libre', processing: `${station.remaining}s`, waiting: 'espera', 'safe-stop': 'seguro' }; return <div className={`live-station live-${station.status}`}><div><span>0{index + 1}</span><i /></div><strong>{station.name}</strong><em>{labels[station.status]}</em><small>{station.role}</small><b><i style={{ width: station.status === 'processing' ? `${((station.total - station.remaining) / station.total) * 100}%` : '0%' }} /></b></div> }
function LabSlider({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) { return <label className="lab-slider"><span><strong>{label}</strong><b>{value} <small>{suffix}</small></b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--slider-progress': `${((value - min) / (max - min)) * 100}%` } as CSSProperties} /></label> }
function SourcePanel({ state }: { state: PlantState }) { return <div className="lab-source"><div className="lab-source-head"><span>CÓDIGO CAUSAL</span><small>plant_controller.cpp</small></div>{simulatedCode.map((line) => <div className={`lab-source-line ${line.line === state.lastLine ? 'active' : ''}`} key={line.line}><b>{String(line.line).padStart(2, '0')}</b><code>{line.text}</code>{line.line === state.lastLine && <Icon name="arrow" size={12} />}</div>)}<div className="lab-source-foot"><span><i /> último evento</span><span>C++20</span></div></div> }
function EventLog({ logs }: { logs: PlantState['logs'] }) { return <div className="lab-event-log"><div><span>TRACE BUFFER</span><b>{logs.length} eventos</b></div>{logs.map((log) => <p key={log.id}><i className={log.tone} /><small>T+{String(log.tick).padStart(3, '0')}</small><span>{log.message}</span><b>L{String(log.line).padStart(2, '0')}</b></p>)}</div> }
function LabMetric({ value, label, tone, icon }: { value: string; label: string; tone: string; icon: IconName }) { return <div className={`lab-metric metric-${tone}`}><span><Icon name={icon} size={14} /></span><strong>{value}</strong><small>{label}</small></div> }

function StrategiesPage({ meta, onNavigate }: { meta: PageMeta; onNavigate: (page: PageId) => void }) {
  return <div className="application-page strategy-page"><PageHeader meta={meta} accent /><div className="application-intro strategy-intro"><span className="application-label"><Icon name="layers" size={15} /> APLICACIÓN SEPARADA DE LA WIKI</span><p>Una guía de decisiones para llevar semáforos, queues y workers a una instalación que debe ser observable, recuperable y segura.</p></div><div className="strategy-principle"><Icon name="shield" size={26} /><div><span>HEURÍSTICA DE CAMPO</span><h2>Lo que no puedes observar, no puedes controlar.</h2><p>Instrumenta ocupación, edad del lote, espera por permisos, último progreso y tiempo de shutdown.</p></div><strong>05<small>señales mínimas</small></strong></div><DocSection id="architecture" number="S.1" eyebrow="ARQUITECTURA" title="Separa adquisición, control y observación."><Paragraph>La adquisición transforma IO en eventos. El control decide transiciones y órdenes. La observación recoge snapshots y métricas. Si el dashboard entra en el mismo mutex que una salida de control, una consulta lenta puede convertirse en jitter operacional.</Paragraph><div className="strategy-layers">{[['01', 'Acquisition', 'sensores → eventos', 'blue'], ['02', 'Coordination', 'queues + permisos', 'green'], ['03', 'Actuation', 'workers → órdenes', 'amber'], ['04', 'Observation', 'snapshots + trazas', 'violet']].map(([number, title, text, tone]) => <div className={`strategy-layer layer-${tone}`} key={number}><span>{number}</span><strong>{title}</strong><small>{text}</small></div>)}</div></DocSection><DocSection id="decisions" number="S.2" eyebrow="DECISIONES" title="Seis estrategias que sobreviven a un turno difícil."><div className="strategy-grid">{[['01', 'Diseñar por ownership', 'Cada mutable tiene un dueño. El resto recibe mensajes o snapshots, no escribe a distancia.', 'menos carreras'], ['02', 'Backpressure explícito', 'Cuando un buffer se llena, registra, bloquea o rechaza según una política conocida.', 'latencia acotada'], ['03', 'Shutdown idempotente', 'Parar dos veces no empeora el estado. close, stop y release toleran repetición.', 'recovery claro'], ['04', 'Lock hierarchy', 'Publica el orden de adquisición y evita IO o callbacks mientras el lock está tomado.', 'reviewable'], ['05', 'Watchdog de progreso', 'Observa cambios útiles, no solo que el hilo sigue ejecutando instrucciones.', 'fallos visibles'], ['06', 'Prueba con tiempo', 'Inyecta retrasos, colas llenas, worker colgado y stop durante IO.', 'confianza real']].map(([number, title, text, result]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p><small><Icon name="check" size={13} /> {result}</small></article>)}</div></DocSection><DocSection id="matrix" number="S.3" eyebrow="MATRIZ DE ELECCIÓN" title="Protege la propiedad correcta."><ComparisonTable headers={['Propiedad', 'Herramienta', 'Pregunta de review']} rows={[[ 'Dato coherente', 'mutex + RAII', '¿La sección crítica es mínima?'], ['Capacidad física', 'counting_semaphore', '¿Dónde se devuelve el permiso?'], ['Flujo de lotes', 'bounded queue', '¿Qué ocurre al llenarse?'], ['Parada cooperativa', 'jthread + stop_token', '¿Qué espera necesita notify?'], ['Progreso', 'atomic + snapshots', '¿Qué métrica demuestra avance?']]}/></DocSection><DocSection id="field" number="S.4" eyebrow="CAMPO" title="Antes de conectar una salida real."><Checklist items={['Dibuja la ruta de energía y la ruta de datos por separado.', 'Define qué ocurre con el lote en vuelo ante cada tipo de parada.', 'Mide la ocupación de cada buffer durante una carga normal y una carga límite.', 'Prueba recovery con el recurso perdido y con el worker detenido.', 'Aísla safety hardware de las decisiones de coordinación software.']} /><Note tone="red" title="Responsabilidad de seguridad">Esta wiki ayuda a estructurar software concurrente. No certifica una instalación ni sustituye análisis de riesgos, PLC safety, relés, enclavamientos físicos o procedimientos de operación.</Note><NavButton onClick={() => onNavigate('simulation')}><span><small>Aplicación aparte</small><strong>Validar decisiones en la simulación</strong></span></NavButton></DocSection></div>
}

export default App
