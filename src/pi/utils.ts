import later, { ScheduleData } from "later"
import moment from "moment"
import { config } from "./gpio"

type ID = string | number
type CallBack<T> = (err: Error | null | undefined, v?: T) => void

type Pin = {
    id: ID,
    channel: number,
    label: string,
    onState: "HIGH" | "LOW",
}

interface SequenceData {
    id: ID
    schedule: ScheduleData
    name: string
    lastRun?: Date | string
    pins: {
        pin: Pin
        duration: string
        offset: string
    }[]
}



const validateUUID = (id?: ID) => {

    if (id) {
        return id
    }
    throw Error('Missing UUID')
}


const validateScheduleData = (sched?: ScheduleData) => {
    if (sched) {
        later.schedule(sched)
        return sched
    }
    throw Error('Missing schedule')
}


const validatePin = (p?: Partial<Pin>): Pin => {
    if (p) {
        const { label, channel, onState } = p

        const pins: number[] = config.validPins

        if (channel && label && onState && channel in pins) return { channel, label, id: channel, onState }

        throw Error(`Invalid Pin channel`)
    }
    throw Error('Missing Pin')
}


const validateDuration = (d?: string) => {
    if (d) {
        if (moment.duration(d).isValid()) return d

        throw Error('Invalid duration')
    }

    throw Error('Missing duration')
}


const validateSequenceData = (m: Partial<SequenceData>): SequenceData => {
    const id = validateUUID(m.id)
    const name = m.name || `UNNAMED SCHEDULE: (id: ${id})`
    const schedule = validateScheduleData(m.schedule)
    const lastRun = !m.lastRun ? undefined : new Date(m.lastRun)
    const pins = Array.isArray(m.pins) ?
        m.pins.map(p => {
            const pin = validatePin({ ...p.pin, label: p.pin?.label || `UNNAMED PIN: (channel: ${p.pin?.channel})` })
            const duration = validateDuration(p.duration)
            const offset = validateDuration(p.offset)
            return {
                pin,
                duration,
                offset
            }
        }) : []
    return {
        id,
        name,
        schedule,
        lastRun,
        pins,
    }
}


export { validateUUID, validateScheduleData, validatePin, validateDuration, validateSequenceData }
export type { ID, SequenceData, Pin, CallBack }