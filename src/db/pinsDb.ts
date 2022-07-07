
import EventEmitter from "events"
import { PrismaClient, Pin, } from '@prisma/client'
import { DB } from "./db";

type PinDbType = Pin

class PinDb extends EventEmitter implements DB<Pin['channel'], PinDbType> {

    validator: (obj: Partial<PinDbType>) => PinDbType
    prisma: PrismaClient
    constructor(prisma: PrismaClient, validator: (obj: Partial<PinDbType>,) => PinDbType) {
        super()
        this.prisma = prisma
        this.validator = validator
    }

    insert = async (arg: Partial<PinDbType>) => {
        const obj = this.validator(arg)
        const newPin = await this.prisma.pin.create({ data: obj })
        this.emit('insert', newPin)
        return newPin
    };


    get = (channel: number) => {
        return this.prisma.pin.findUnique({ where: { channel } })
    }


    remove = async (channel: number) => {
        const orders = this.prisma.order.deleteMany({ where: { channel } })
        const pin = this.prisma.pin.delete({ where: { channel } })
        await this.prisma.$transaction([orders, pin])
        this.emit('remove', channel)
    }


    list = () => {
        return this.prisma.pin.findMany()
    }


    set = async (channel: Pin['channel'], arg: Partial<PinDbType>) => {
        const data = this.validator(arg)
        const newPin = await this.prisma.pin.update({
            where: { channel },
            data,
        })
        this.emit('update', newPin)
        return newPin
    }


    update = async (channel: number, obj: Partial<PinDbType>) => {
        const oldPin = await this.prisma.pin.findUnique({ where: { channel } })
        const data = this.validator({ ...oldPin, ...obj, channel })

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