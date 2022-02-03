import { MultiPins, SinglePin, validateDuration, validatePin, validateSchedule, validateUUID } from './utils'




export const validateSinglePin = (s: Partial<SinglePin>): SinglePin => {
    const id = validateUUID(s.id)
    const name = s.name || `UNNAMED SCHEDULE: (id: ${id})`
    const sched = validateSchedule(s.sched)
    const lastRun = !s.lastRun ? undefined : new Date(s.lastRun)
    const pin = validatePin({ ...s.pin, label: s.pin?.label || `UNAMED PIN: (channel: ${s.pin?.channel})` })
    const duration = validateDuration(s.duration)
    return {
        id,
        name,
        sched,
        lastRun,
        pin,
        duration
    }
}

export const validateMultiPins = (m: Partial<MultiPins>): MultiPins => {
    const id = validateUUID(m.id)
    const name = m.name || `UNNAMED SCHEDULE: (id: ${id})`
    const sched = validateSchedule(m.sched)
    const lastRun = !m.lastRun ? undefined : new Date(m.lastRun)
    const pins = Array.isArray(m.pins) ? m.pins : []
    pins.map(p => {
        const pin = validatePin({ ...p.pin, label: p.pin?.label || `UNAMED PIN: (channel: ${p.pin?.channel})` })
        const duration = validateDuration(p.duration)
        const offset = validateDuration(p.offset)
        return {
            pin,
            duration,
            offset
        }
    })
    return {
        id,
        name,
        sched,
        lastRun,
        pins,
    }


}
