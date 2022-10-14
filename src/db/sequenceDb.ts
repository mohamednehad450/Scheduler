
import EventEmitter from "events"
import { Sequence, Order, PrismaClient, Cron, } from '@prisma/client'
import { DB } from "./db";
import { ObjectSchema } from "joi";



type SequenceWithOrders = (Sequence & { orders: (Order & { Pin: { label: string } })[] })

type SequenceDBType = SequenceWithOrders & { CronSequence: { cron: Cron }[] }

const include = {
    CronSequence:
    {
        select: {
            cron: true
        }
    },
    orders: {
        include: {
            Pin: {
                'select': {
                    label: true
                }
            }
        }
    }
}

class SequenceDb extends EventEmitter implements DB<Sequence['id'], SequenceDBType> {

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

        const { value, error } = this.validator.validate(arg)

        if (error) throw error

        const newSeq = await this.prisma.sequence.create({
            data: value,
            include
        })
        this.emit('insert', newSeq)
        return newSeq
    };


    get = (id: SequenceDBType['id']) => {
        return this.prisma.sequence.findUnique({
            where: { id }, include
        })
    }


    remove = async (id: SequenceDBType['id']) => {
        const orders = this.prisma.order.deleteMany({ where: { sequenceId: id } })
        const events = this.prisma.sequenceEvent.deleteMany({ where: { sequenceId: id } })
        const links = this.prisma.cronSequence.deleteMany({ where: { sequenceId: id } })
        const sequence = this.prisma.sequence.delete({ where: { id } })
        await this.prisma.$transaction([orders, events, links, sequence])
        this.emit('remove', id)
    }


    list = async () => {
        return this.prisma.sequence.findMany({
            include
        })
    }


    set = async (id: SequenceDBType['id'], arg: any) => {

        const { value: data, error } = this.validator.validate(arg)

        if (error) throw error

        const removeOldOrders = this.prisma.order.deleteMany({ where: { sequenceId: id } })
        const createNewSequence = this.prisma.sequence.update({
            where: { id },
            data,
            include
        })

        const [_, newSeq] = await this.prisma.$transaction([removeOldOrders, createNewSequence])

        this.emit('update', newSeq)
        return newSeq
    }


    update = async (id: SequenceDBType['id'], obj: any) => {

        const { value: data, error } = this.partialValidator.validate(obj)

        if (error) throw error

        const removeOldOrders = data.orders ? this.prisma.order.deleteMany({ where: { sequenceId: id } }) : null
        const createNewSequence = this.prisma.sequence.update({
            where: { id },
            data,
            include
        })

        if (removeOldOrders) {
            const [_, newSeq] = await this.prisma.$transaction([removeOldOrders, createNewSequence])
            this.emit('update', newSeq)
            return newSeq
        } else {
            const newSeq = await createNewSequence
            this.emit('update', newSeq)
            return newSeq
        }


    }
}

export { SequenceDb, include as sequenceInclude }
export type { SequenceDBType }









