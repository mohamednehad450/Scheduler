import { Schedule, validateDuration, validatePin, validateScheduleData, validateUUID } from './utils'

export const validateSchedule = (m: Partial<Schedule>): Schedule => {
    const id = validateUUID(m.id)
    const name = m.name || `UNNAMED SCHEDULE: (id: ${id})`
    const sched = validateScheduleData(m.sched)
    const lastRun = !m.lastRun ? undefined : new Date(m.lastRun)
    const pins = Array.isArray(m.pins) ? m.pins : []
    pins.map(p => {
        const pin = validatePin({ ...p.pin, label: p.pin?.label || `UNNAMED PIN: (channel: ${p.pin?.channel})` })
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
