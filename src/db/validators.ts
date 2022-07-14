import Joi from "joi"
import { config } from "../pi/gpio"

const Channel = Joi.number().valid(...config.validPins)

const PinSchema = Joi.object({
    label: Joi.string().required(),
    onState: Joi.string().allow('HIGH', 'LOW').required(),
    channel: Channel.required()
})
const PinPartialSchema = Joi.object({
    label: Joi.string(),
    onState: Joi.string().allow('HIGH', 'LOW'),
})

// Order doesn't have a partial schema because it's never updated 
const OrderSchema = Joi.object({
    duration: Joi.string().isoDuration().required(),
    offset: Joi.string().isoDuration().required(),
    channel: Channel,
    Pin: Joi.object({ create: PinSchema.required() }),
}).xor('channel', 'Pin')

const RecurrenceSchema = Joi.object({
    t: Joi.array().items(Joi.number().min(0).max(86399)),
    s: Joi.array().items(Joi.number().min(0).max(59)),
    m: Joi.array().items(Joi.number().min(0).max(59)),
    h: Joi.array().items(Joi.number().min(0).max(23)),
    D: Joi.array().items(Joi.number().min(0).max(31)),
    dw: Joi.array().items(Joi.number().min(0).max(7)),
    dc: Joi.array().items(Joi.number().min(0).max(5)),
    dy: Joi.array().items(Joi.number().min(0).max(366)),
    wm: Joi.array().items(Joi.number().min(0).max(5)),
    M: Joi.array().items(Joi.number().min(0).max(12)),
    Y: Joi.array().items(Joi.number().min(1970).max(2099)),
})

const ScheduleDataSchema = Joi.object({
    schedules: Joi.array().items(RecurrenceSchema).required(),
    exceptions: Joi.array().items(RecurrenceSchema),
    error: Joi.number()
})

const ScheduleSchema = Joi.object({
    scheduleJson: Joi.string().custom((v, helper) => {
        let schedule = {}
        try {
            schedule = JSON.parse(v)
        }
        catch {
            return helper.error('scheduleJson parse error: schedulerJson is an invalid JSON')
        }
        const { value, error } = ScheduleDataSchema.validate(schedule)
        if (error) throw error
        return JSON.stringify(value)
    }).required(),
    label: Joi.string().required(),
})
const SchedulePartialSchema = Joi.object({
    scheduleJson: Joi.string().custom((v, helper) => {
        let schedule = {}
        try {
            schedule = JSON.parse(v)
        }
        catch {
            return helper.error('scheduleJson parse error: schedulerJson is an invalid JSON')
        }
        const { value, error } = ScheduleDataSchema.validate(schedule)
        if (error) throw error
        return value
    }),
    label: Joi.string(),
})


const SequenceSchema = Joi.object({
    name: Joi.string().required(),
    active: Joi.boolean(),
    orders: Joi.object({ create: Joi.array().items(OrderSchema).required() }).required(),
    lastRun: Joi.date(),
    scheduleId: Joi.number(),
    schedule: Joi.object({ create: ScheduleSchema.required() }),
}).xor('schedule', 'scheduleId')

const SequencePartialSchema = Joi.object({
    name: Joi.string(),
    active: Joi.boolean(),
    orders: Joi.object({ create: Joi.array().items(OrderSchema).required() }),
    lastRun: Joi.date(),
    scheduleId: Joi.number(),
    schedule: Joi.object({ create: ScheduleSchema.required() }),
}).oxor('schedule', 'scheduleId')



export {
    SequenceSchema,
    SequencePartialSchema,
    ScheduleSchema,
    SchedulePartialSchema,
    PinSchema,
    PinPartialSchema,
    OrderSchema,
    ScheduleDataSchema,
    RecurrenceSchema,
}

