export type StationStatus = 'idle' | 'processing' | 'waiting' | 'safe-stop'
export type LogTone = 'info' | 'success' | 'warning' | 'danger'

export interface PlantConfig {
  queueCapacity: number
  workerCount: number
  arrivalRate: number
}

export interface StationState {
  id: string
  name: string
  role: string
  status: StationStatus
  remaining: number
  total: number
  completed: number
}

export interface PlantLog {
  id: number
  tick: number
  tone: LogTone
  message: string
  line: number
}

export interface PlantState {
  tick: number
  running: boolean
  emergency: boolean
  queue: number
  produced: number
  completed: number
  blocked: number
  activeWorkers: number
  permits: number
  stations: StationState[]
  logs: PlantLog[]
  lastLine: number
  lastEvent: string
}

export const defaultPlantConfig: PlantConfig = {
  queueCapacity: 6,
  workerCount: 2,
  arrivalRate: 3,
}

const stationDefinitions = [
  { id: 'cut', name: 'Corte', role: 'Preparación', total: 4 },
  { id: 'dose', name: 'Dosificación', role: 'Proceso crítico', total: 5 },
  { id: 'inspect', name: 'Inspección', role: 'Visión artificial', total: 3 },
]

export const simulatedCode = [
  { line: 1, text: 'std::counting_semaphore<3> permits{2};' },
  { line: 2, text: 'BoundedQueue<Batch> buffer{6};' },
  { line: 3, text: 'std::jthread feeder([&](std::stop_token stop) {' },
  { line: 4, text: '  while (!stop.stop_requested()) {' },
  { line: 5, text: '    if (!buffer.try_push(batch)) {' },
  { line: 6, text: '      metrics.blocked.fetch_add(1);' },
  { line: 7, text: '    }' },
  { line: 8, text: 'std::jthread station([&](std::stop_token stop) {' },
  { line: 9, text: '  permits.acquire();' },
  { line: 10, text: '  Batch item = buffer.pop(stop);' },
  { line: 11, text: '  process(item);' },
  { line: 12, text: '  permits.release();' },
  { line: 13, text: '}); // jthread solicita stop y hace join' },
]

function normalizeConfig(config: PlantConfig): PlantConfig {
  return {
    queueCapacity: Math.max(2, Math.round(config.queueCapacity)),
    workerCount: Math.max(1, Math.round(config.workerCount)),
    arrivalRate: Math.min(5, Math.max(1, Math.round(config.arrivalRate))),
  }
}

export function createInitialPlantState(config = defaultPlantConfig): PlantState {
  const safeConfig = normalizeConfig(config)
  return {
    tick: 0,
    running: false,
    emergency: false,
    queue: 0,
    produced: 0,
    completed: 0,
    blocked: 0,
    activeWorkers: 0,
    permits: safeConfig.workerCount,
    stations: stationDefinitions.map((station) => ({
      ...station,
      status: 'idle' as StationStatus,
      remaining: 0,
      completed: 0,
    })),
    logs: [
      {
        id: 0,
        tick: 0,
        tone: 'info',
        message: 'Simulación lista. El buffer está vacío y todos los permisos disponibles.',
        line: 1,
      },
    ],
    lastLine: 1,
    lastEvent: 'Sistema preparado',
  }
}

function addLog(
  state: PlantState,
  tone: LogTone,
  message: string,
  line: number,
): PlantState {
  const log: PlantLog = {
    id: state.tick * 100 + state.logs.length + 1,
    tick: state.tick,
    tone,
    message,
    line,
  }

  return {
    ...state,
    logs: [log, ...state.logs].slice(0, 10),
    lastLine: line,
    lastEvent: message,
  }
}

export function stepPlant(state: PlantState, config = defaultPlantConfig): PlantState {
  if (state.emergency) return state

  const safeConfig = normalizeConfig(config)
  let next: PlantState = {
    ...state,
    tick: state.tick + 1,
    stations: state.stations.map((station) => ({ ...station })),
  }
  let line = 1
  let tone: LogTone = 'info'
  let event = `Ciclo ${next.tick}: sin cambios de estado`

  next.stations = next.stations.map((station) => {
    if (station.status !== 'processing') return station
    if (station.remaining <= 1) {
      next.completed += 1
      next.activeWorkers -= 1
      next.permits += 1
      line = 12
      tone = 'success'
      event = `${station.name} libera un lote y devuelve el permiso`
      return { ...station, status: 'idle', remaining: 0, completed: station.completed + 1 }
    }
    return { ...station, remaining: station.remaining - 1 }
  })

  const interval = Math.max(1, 6 - safeConfig.arrivalRate)
  if (next.tick % interval === 0) {
    if (next.queue < safeConfig.queueCapacity) {
      next.queue += 1
      next.produced += 1
      line = 5
      tone = 'info'
      event = `Lote ${next.produced.toString().padStart(3, '0')} entra en el buffer`
    } else {
      next.blocked += 1
      line = 6
      tone = 'warning'
      event = 'Entrada bloqueada: buffer lleno, se aplica backpressure'
    }
  }

  for (const station of next.stations) {
    if (station.status !== 'idle' || next.queue <= 0 || next.permits <= 0) continue
    next.queue -= 1
    next.activeWorkers += 1
    next.permits -= 1
    station.status = 'processing'
    station.remaining = station.total
    line = 9
    tone = 'success'
    event = `Permiso adquirido: ${station.name} comienza a procesar`
  }

  if (next.queue > 0 && next.permits === 0) {
    next.stations = next.stations.map((station) =>
      station.status === 'idle' ? { ...station, status: 'waiting' } : station,
    )
    line = 9
    tone = 'warning'
    event = 'Trabajadores esperando: no quedan permisos del semáforo'
  }

  return addLog(
    { ...next, running: state.running },
    tone,
    event,
    line,
  )
}

export function togglePlant(state: PlantState): PlantState {
  if (state.emergency) return state
  return {
    ...state,
    running: !state.running,
    lastEvent: state.running ? 'Simulación pausada' : 'Simulación en marcha',
    lastLine: 4,
  }
}

export function setEmergencyStop(state: PlantState, enabled: boolean): PlantState {
  if (enabled) {
    const stopped = state.stations.map((station) => ({
      ...station,
      status: station.status === 'processing' || station.status === 'waiting' ? 'safe-stop' : station.status,
      remaining: 0,
    }))
    return addLog(
      {
        ...state,
        running: false,
        emergency: true,
        activeWorkers: 0,
        permits: state.permits + state.activeWorkers,
        stations: stopped,
      },
      'danger',
      'PARADA DE EMERGENCIA: todos los hilos pasan a estado seguro',
      4,
    )
  }

  return addLog(
    {
      ...state,
      emergency: false,
      stations: state.stations.map((station) =>
        station.status === 'safe-stop' ? { ...station, status: 'idle' } : station,
      ),
    },
    'info',
    'Enclavamiento liberado: se requiere arrancar de nuevo la simulación',
    13,
  )
}
