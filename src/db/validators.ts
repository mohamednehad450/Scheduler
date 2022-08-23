import Joi from "joi"
import { config } from "../pi/gpio"
import { noOverlappingOrders, validScheduleJson } from "./customValidators"

const Channel = Joi.number().valid(...config.validPins)

const PinSchema = Joi.object({
    label: Joi.string().required(),
    onState: Joi.string().valid('HIGH', 'LOW').required(),
    channel: Channel.required()
})
const PinPartialSchema = Joi.object({
    label: Joi.string(),
    onState: Joi.string().valid('HIGH', 'LOW'),
})

// Order doesn't have a partial schema because it's never updated 
const OrderSchema = Joi.object({
    duration: Joi.number()
        .min(10)
        .required(),
    offset: Joi.number()
        .min(0)
        .required(),
    channel: Channel.required(),
})

const OrderListSchema = Joi.array()
    .items(OrderSchema)
    .min(1)
    .custom(noOverlappingOrders)
    .messages({ noOverlappingOrders: "Orders with the same channel cannot overlap" })

const RecurrenceSchema = Joi.object({
    t: Joi.array().items(Joi.number().min(0).max(86399)).unique().sort(),
    s: Joi.array().items(Joi.number().min(0).max(59)).unique().sort(),
    m: Joi.array().items(Joi.number().min(0).max(59)).unique().sort(),
    h: Joi.array().items(Joi.number().min(0).max(23)).unique().sort(),
    D: Joi.array().items(Joi.number().min(0).max(31)).unique().sort(),
    dw: Joi.array().items(Joi.number().min(0).max(7)).unique().sort(),
    dc: Joi.array().items(Joi.number().min(0).max(5)).unique().sort(),
    dy: Joi.array().items(Joi.number().min(0).max(366)).unique().sort(),
    wm: Joi.array().items(Joi.number().min(0).max(6)).unique().sort(),
    wy: Joi.array().items(Joi.number().min(0).max(52)).unique().sort(),
    M: Joi.array().items(Joi.number().min(0).max(12)).unique().sort(),
    Y: Joi.array().items(Joi.number().min(1970).max(2099)).unique().sort(),
    t_a: Joi.array().items(Joi.number().min(0).max(86399)).unique().sort(),
    s_a: Joi.array().items(Joi.number().min(0).max(59)).unique().sort(),
    m_a: Joi.array().items(Joi.number().min(0).max(59)).unique().sort(),
    h_a: Joi.array().items(Joi.number().min(0).max(23)).unique().sort(),
    D_a: Joi.array().items(Joi.number().min(0).max(31)).unique().sort(),
    dw_a: Joi.array().items(Joi.number().min(0).max(7)).unique().sort(),
    dc_a: Joi.array().items(Joi.number().min(0).max(5)).unique().sort(),
    dy_a: Joi.array().items(Joi.number().min(0).max(366)).unique().sort(),
    wm_a: Joi.array().items(Joi.number().min(0).max(6)).unique().sort(),
    wy_a: Joi.array().items(Joi.number().min(0).max(52)).unique().sort(),
    M_a: Joi.array().items(Joi.number().min(0).max(12)).unique().sort(),
    Y_a: Joi.array().items(Joi.number().min(1970).max(2099)).unique().sort(),
    t_b: Joi.array().items(Joi.number().min(0).max(86399)).unique().sort(),
    s_b: Joi.array().items(Joi.number().min(0).max(59)).unique().sort(),
    m_b: Joi.array().items(Joi.number().min(0).max(59)).unique().sort(),
    h_b: Joi.array().items(Joi.number().min(0).max(23)).unique().sort(),
    D_b: Joi.array().items(Joi.number().min(0).max(31)).unique().sort(),
    dw_b: Joi.array().items(Joi.number().min(0).max(7)).unique().sort(),
    dc_b: Joi.array().items(Joi.number().min(0).max(5)).unique().sort(),
    dy_b: Joi.array().items(Joi.number().min(0).max(366)).unique().sort(),
    wm_b: Joi.array().items(Joi.number().min(0).max(6)).unique().sort(),
    wy_b: Joi.array().items(Joi.number().min(0).max(52)).unique().sort(),
    M_b: Joi.array().items(Joi.number().min(0).max(12)).unique().sort(),
    Y_b: Joi.array().items(Joi.number().min(1970).max(2099)).unique().sort(),
}).min(1)

const ScheduleDataSchema = Joi.object({
    schedules: Joi.array().items(RecurrenceSchema).required().min(1),
    exceptions: Joi.array().items(RecurrenceSchema),
    error: Joi.number()
})


const ScheduleSchema = Joi.object({
    scheduleJson: Joi.string()
        .custom(validScheduleJson)
        .messages({ validScheduleJson: 'Schedule json parsing error' })
        .required(),
    label: Joi.string().required(),
})
const SchedulePartialSchema = Joi.object({
    scheduleJson: Joi.string()
        .custom(validScheduleJson)
        .messages({ validScheduleJson: 'Schedule json parsing error' }),
    label: Joi.string(),
})


const SequenceSchema = Joi.object({
    name: Joi.string().required(),
    active: Joi.boolean(),
    orders: Joi.object({ create: OrderListSchema.required() }).required(),
    lastRun: Joi.date(),
    scheduleId: Joi.number(),
    schedule: Joi.object({ create: ScheduleSchema.required() }),
}).xor('schedule', 'scheduleId')

const SequencePartialSchema = Joi.object({
    name: Joi.string(),
    active: Joi.boolean(),
    orders: Joi.object({
        create: OrderListSchema.required(),
    }),
    lastRun: Joi.date(),
    scheduleId: Joi.number(),
    schedule: Joi.object({ create: ScheduleSchema.required() }),
}).oxor('schedule', 'scheduleId')

type SequenceEvent = "run" | 'stop' | 'finish' | 'activate' | 'deactivate'
const sequenceEvents: SequenceEvent[] = ["run", 'stop', 'finish', 'activate', 'deactivate']


const SequenceEventSchema = Joi.object({
    eventType: Joi.string().valid(...sequenceEvents).required(),
    sequenceId: Joi.number().required(),
    date: Joi.date().required(),
})


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
    SequenceEventSchema,
}

