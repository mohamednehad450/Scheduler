import later, { ScheduleData } from "later"
import moment from "moment"
import { config } from "./gpio"

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

type Pin = {
    id: number,
    channel: number,
    label: string,
    onState: "HIGH" | "LOW",
}

interface SequenceData {
    id: string
    schedule: ScheduleData
    name: string
    lastRun?: Date | string
    pins: {
        channel: Pin['channel']
        duration: string
        offset: string
    }[]
}



const validateUUID = (id?: string) => {

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


const validatePinChannel = (channel: Pin['channel']): Pin['channel'] => {
    if (channel && channel in config.validPins) {
        return channel
    }
    throw Error(`Invalid Pin channel`)
}

const validatePin = (pin: Partial<Pin>): Pin => {
    const { channel, label, onState } = pin

    if (!channel || !(channel in config.validPins)) throw new Error('Invalid channel.')
    const id = channel

    if (!label) throw new Error('Missing label.')

    if (!onState || (onState !== "HIGH" && onState !== "LOW")) throw new Error('Missing onState.')

    return {
        channel,
        id,
        label,
        onState,
    }
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
            const channel = validatePinChannel(p.channel)
            const duration = validateDuration(p.duration)
            const offset = validateDuration(p.offset)
            return {
                channel,
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
export type { SequenceData, Pin, CallBack }