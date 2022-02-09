import later, { ScheduleData, setInterval, Timer } from "later"
import moment, { Duration } from "moment"
import { config } from "./gpio"

type ID = string

type Pin = {
    channel: number,
    label: string,
}

interface Schedule {
    id: ID
    sched: ScheduleData
    name: string
    lastRun?: Date
    pins: {
        pin: Pin
        duration: Duration
        offset: Duration
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
        const { label, channel } = p
        const pins: number[] = config.validPins

        if (channel && label && channel in pins) return { channel, label }

        throw Error(`Invalid Pin channel`)
    }
    throw Error('Missing Pin')
}

const validateDuration = (d?: Duration) => {
    if (d) {
        if (moment.duration(d).isValid()) return d

        throw Error('Invalid duration')
    }

    throw Error('Missing duration')
}

export { validateUUID, validateScheduleData, validatePin, validateDuration }
export type { ID, Schedule, Pin }