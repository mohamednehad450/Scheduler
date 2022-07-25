import Joi from "joi"
import { ScheduleDataSchema } from "./validators"

type Order = { duration: number, offset: number, channel: number, }


type Period = { start: number, end: number }
const isOverlapping = (t1: Period, t2: Period): boolean => {

    /* 
    Condition 1
        |--- Period 1 ---|
            | --- Period 2 --- |

    Condition 2
            | --- Period 1 --- |
        | --- Period 2 ---- |

    Condition 3
        | -------- Period 1 -------- |
            | --- Period 2 --- |

    Condition 4
            | --- Period 1 --- |
        | -------- Period 2 -------- |

    
    credit: https://stackoverflow.com/a/7325171
    */
    if (t1.start == t2.start || t1.end == t2.end) {
        return true; // If any set is the same time, then by default there must be some overlap. 
    }

    if (t1.start < t2.start) {
        if (t1.end > t2.start && t1.end < t2.end) {
            return true; // Condition 1
        }
        if (t1.end > t2.end) {
            return true; // Condition 3
        }
    }
    else {
        if (t2.end > t1.start && t2.end < t1.end) {
            return true; // Condition 2
        }
        if (t2.end > t1.end) {
            return true; // Condition 4
        }
    }
    return false
}

const getPeriodFromOrder = (order: Order) => ({
    start: order.offset,
    end: order.offset + order.duration
})

const getOverlappingOrders = (order: Order, arr: (Order & { i: number })[]): (Order & { i: number })[] => {
    const t1 = getPeriodFromOrder(order)
    return arr.filter(o => isOverlapping(t1, getPeriodFromOrder(o)))
}

const noOverlappingOrders: Joi.CustomValidator = (v: Order[], helper) => {

    // Sort by channel
    const channels = new Map<number, (Order & { i: number })[]>()

    v.forEach((o, i) => {
        if (channels.has(o.channel)) {
            channels.get(o.channel)?.push({ ...o, i })
        }
        else {
            channels.set(o.channel, [{ ...o, i }])
        }
    })

    const errors: { index: number, overlappingIndexes: number[] }[] = []

    channels.forEach((orderArr) => {
        // skip channels with only 1 order
        if (orderArr.length <= 1) return

        orderArr.reverse().forEach((order, i, arr) => {
            const overlapping = getOverlappingOrders(order, arr.slice(i + 1))

            // No overlapping
            if (overlapping.length === 0) return

            errors.push({
                index: order.i,
                overlappingIndexes: overlapping.map(o => o.i)
            })
        })
    })

    if (errors.length > 0) {
        return helper.error("noOverlappingOrders", { value: errors })
    }

    return v
}

const validScheduleJson: Joi.CustomValidator = (v, helper) => {
    let schedule = {}
    try {
        schedule = JSON.parse(v)
    }
    catch {
        return helper.error('validScheduleJson')
    }
    const { value, error } = ScheduleDataSchema.validate(schedule)
    if (error) throw error
    return JSON.stringify(value)
}


export { noOverlappingOrders, validScheduleJson }