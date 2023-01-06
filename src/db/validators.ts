import Joi from "joi"
import { config } from "../pi/utils"
import { noOverlappingOrders, cronValidation } from "./customValidators"

const Channel = Joi.number().valid(...config.validPins)

const PinSchema = Joi.object({
    label: Joi.string().required(),
    onState: Joi.string().valid('HIGH', 'LOW').required(),
    channel: Channel.required()
})
const PinPartialSchema = Joi.object({
    label: Joi.string(),
    onState: Joi.string().valid('HIGH', 'LOW'),
    channel: Channel
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


const CronString = Joi.string()
    .custom(cronValidation)
    .messages({ 'cronValidation': 'Invalid cron string' })

const CronSchema = Joi.object({
    cron: CronString.required(),
    label: Joi.string().required()
})

const CronPartialSchema = Joi.object({
    cron: CronString,
    label: Joi.string(),
})



const SequenceSchema = Joi.object({
    name: Joi.string().required(),
    active: Joi.boolean(),
    orders: OrderListSchema.required(),
    lastRun: Joi.date(),
})

const SequencePartialSchema = Joi.object({
    name: Joi.string(),
    active: Joi.boolean(),
    orders: OrderListSchema,
    lastRun: Joi.date(),
})

type SequenceEvent = "run" | 'stop' | 'finish' | 'activate' | 'deactivate'
const sequenceEvents: SequenceEvent[] = ["run", 'stop', 'finish', 'activate', 'deactivate']


const SequenceEventSchema = Joi.object({
    eventType: Joi.string().valid(...sequenceEvents).required(),
    sequenceId: Joi.number().required(),
    date: Joi.date().required(),
})

const UserSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(1)
        .max(128)
        .required()
    ,
    password: Joi.string()
        .pattern(/^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=[^0-9]*[0-9]).{6,}$/)
        .message("weak password")
        .required()
})

const LinkArraySchema = Joi.array()
    .items(
        Joi.number()
            .min(1)
    )
    .required()

export {
    SequenceSchema,
    SequencePartialSchema,
    PinSchema,
    PinPartialSchema,
    OrderSchema,
    SequenceEventSchema,
    CronSchema,
    CronPartialSchema,
    UserSchema,
    LinkArraySchema,
}

