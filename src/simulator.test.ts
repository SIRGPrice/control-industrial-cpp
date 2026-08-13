import { describe, expect, it } from 'vitest'
import {
  createInitialPlantState,
  defaultPlantConfig,
  setEmergencyStop,
  stepPlant,
} from './simulator'

describe('simulador de planta', () => {
  it('adquiere y devuelve permisos al procesar un lote', () => {
    const config = { ...defaultPlantConfig, arrivalRate: 1, workerCount: 1 }
    let state = createInitialPlantState(config)

    for (let index = 0; index < 5; index += 1) state = stepPlant(state, config)
    expect(state.produced).toBe(1)
    expect(state.activeWorkers).toBe(1)
    expect(state.permits).toBe(0)

    for (let index = 0; index < 4; index += 1) state = stepPlant(state, config)
    expect(state.completed).toBe(1)
    expect(state.permits).toBe(1)
  })

  it('aplica backpressure cuando el buffer alcanza su capacidad', () => {
    const config = { queueCapacity: 2, workerCount: 1, arrivalRate: 5 }
    let state = createInitialPlantState(config)

    for (let index = 0; index < 5; index += 1) state = stepPlant(state, config)
    expect(state.queue).toBeLessThanOrEqual(config.queueCapacity)
    expect(state.blocked).toBeGreaterThan(0)
  })

  it('lleva la planta a un estado seguro', () => {
    const config = { ...defaultPlantConfig, arrivalRate: 5 }
    let state = stepPlant(createInitialPlantState(config), config)
    state = setEmergencyStop(state, true)

    expect(state.emergency).toBe(true)
    expect(state.running).toBe(false)
    expect(state.stations.some((station) => station.status === 'safe-stop')).toBe(true)
  })
})
