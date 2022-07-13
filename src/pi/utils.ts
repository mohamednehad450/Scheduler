import { Schedule } from "@prisma/client"
import later from "later"
import moment from "moment"
import { PinDbType } from "../db/pinsDb"
import { SequenceDBType } from "../db"
import { config } from "./gpio"


const validateScheduleData = (schedule?: Schedule) => {
    const s = JSON.parse(schedule?.scheduleJson || '')
    later.schedule(s)
    return schedule

}


const validatePinChannel = (channel?: PinDbType['channel']): PinDbType['channel'] => {
    if (channel && config.validPins.some(c => c === channel)) {
        return channel
    }
    throw Error(`Invalid Pin channel`)
}

const validatePin = (pin: Partial<PinDbType>): PinDbType => {
    const { channel, label, onState } = pin


    if (!label) throw new Error('Missing label.')

    if (!onState || (onState !== "HIGH" && onState !== "LOW")) throw new Error('Missing onState.')

    return {
        channel: validatePinChannel(channel),
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


const validateSequenceData = (seq: Partial<SequenceDBType>): SequenceDBType => {
    const validated = {
        id: seq.id || -1,
        name: seq.name || '',
        lastRun: seq.lastRun || null,
        active: !!seq.active,
        scheduleId: seq.scheduleId || -1,
        orders: Array.isArray(seq.orders) ? seq.orders.map(p => {
            const channel = validatePinChannel(p.channel)
            const duration = validateDuration(p.duration)
            const offset = validateDuration(p.offset)
            return {
                channel,
                duration,
                offset,
                id: p.id || -1,
                sequenceId: p.sequenceId || -1,
                Pin: p.Pin
            }
        }) : []
    }
    return seq.schedule ? {
        ...validated,
        schedule: validateScheduleData(seq.schedule),
    } : validated
}


export { validateScheduleData, validatePin, validateDuration, validateSequenceData }