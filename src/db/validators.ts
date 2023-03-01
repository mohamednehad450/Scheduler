import Joi from "joi"
import { v4 } from "uuid"
import { config } from "../pi/utils"
import { noOverlappingOrders, cronValidation } from "./customValidators"
import { ObjectValidators } from "./misc"
import { BaseCron, BaseSequence, BaseSequenceEvent, Pin, sequenceEventTypes } from "./types"

const Channel = Joi.number().valid(...config.validPins)

const PinSchema = Joi.object<Pin>({
    label: Joi.string().required(),
    onState: Joi.string().valid('HIGH', 'LOW').required(),
    channel: Channel.required()
})
const PinPartialSchema = Joi.object<Partial<Pin>>({
    label: Joi.string(),
    onState: Joi.string().valid('HIGH', 'LOW'),
    channel: Channel
})

const pinsValidators: ObjectValidators<Pin> = {
    loadValidator: PinSchema,
    inputValidator: PinSchema,
    updateValidator: PinPartialSchema
}


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

const UUID = Joi.string().uuid()

const SequenceSchema = Joi.object<BaseSequence>({
    id: UUID.default(() => v4()),
    name: Joi.string().required(),
    active: Joi.boolean().default(false),
    orders: OrderListSchema.required(),
    lastRun: Joi.string().isoDate(),
})

const SequencePartialSchema = Joi.object<Partial<BaseSequence>>({
    id: UUID,
    name: Joi.string(),
    active: Joi.boolean(),
    orders: OrderListSchema,
    lastRun: Joi.string().isoDate(),
})

const sequenceValidators: ObjectValidators<BaseSequence> = {
    loadValidator: SequenceSchema,
    inputValidator: SequenceSchema,
    updateValidator: SequencePartialSchema,
}


const CronString = Joi.string()
    .custom(cronValidation)
    .messages({ 'cronValidation': 'Invalid cron string' })

const CronSchema = Joi.object<BaseCron>({
    id: UUID.default(() => v4()),
    cron: CronString.required(),
    label: Joi.string().required(),
})

const CronPartialSchema = Joi.object({
    id: UUID,
    cron: CronString,
    label: Joi.string(),
})

const cronValidators: ObjectValidators<BaseCron> = {
    loadValidator: CronSchema,
    inputValidator: CronSchema,
    updateValidator: CronPartialSchema
}


const SequenceEventSchema = Joi.object({
    id: UUID.default(() => v4()),
    eventType: Joi.string().valid(...sequenceEventTypes).required(),
    sequenceId: UUID.required(),
    date: Joi.string().isoDate().required(),
})

const sequenceEventsValidators: ObjectValidators<BaseSequenceEvent> = {
    loadValidator: SequenceEventSchema,
    inputValidator: SequenceEventSchema,
}



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

export {
    sequenceValidators,
    pinsValidators,
    cronValidators,
    sequenceEventsValidators,
    UserSchema,
}

