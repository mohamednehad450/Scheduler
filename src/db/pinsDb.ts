
import EventEmitter from "events"
import { PrismaClient, Pin, } from '@prisma/client'
import { DB } from "./db";
import { ObjectSchema } from "joi";

type PinDbType = Pin

class PinDb extends EventEmitter implements DB<Pin['channel'], PinDbType> {

    validator: ObjectSchema
    partialValidator: ObjectSchema
    prisma: PrismaClient
    constructor(prisma: PrismaClient, validator: ObjectSchema, partialValidator: ObjectSchema) {
        super()
        this.prisma = prisma
        this.validator = validator
        this.partialValidator = partialValidator
    }

    insert = async (arg: any) => {
        const { value: data, error } = this.validator.validate(arg)

        if (error) throw error

        const newPin = await this.prisma.pin.create({ data })

        this.emit('insert', newPin)
        return newPin
    };


    get = (channel: number) => {
        return this.prisma.pin.findUnique({ where: { channel } })
    }


    remove = async (channel: number) => {
        const orders = this.prisma.order.deleteMany({ where: { channel } })
        const sequences = this.prisma.sequence.deleteMany({ where: { orders: { none: {} } } })
        const pin = this.prisma.pin.delete({ where: { channel } })
        await this.prisma.$transaction([orders, sequences, pin])
        this.emit('remove', channel)
    }


    list = () => {
        return this.prisma.pin.findMany()
    }


    set = async (channel: Pin['channel'], arg: any) => {
        const exists = await this.prisma.pin.count({ where: { channel } })
        if (!exists) return null

        const { value: data, error } = this.validator.validate(arg)

        if (error) throw error

        const newPin = await this.prisma.pin.update({
            where: { channel },
            data,
        })
        this.emit('update', newPin)
        return newPin
    }


    update = async (channel: number, obj: any) => {
        const exists = await this.prisma.pin.count({ where: { channel } })
        if (!exists) return null

        const { error, value: data } = this.partialValidator.validate(obj)

        if (error) throw error

        const newPin = await this.prisma.pin.update({
            where: { channel },
            data,
        })
        this.emit('update', newPin)
        return newPin
    }
}

export { PinDb }
export type { PinDbType }