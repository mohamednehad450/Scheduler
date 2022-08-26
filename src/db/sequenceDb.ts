
import EventEmitter from "events"
import { Sequence, Order, PrismaClient, Cron, } from '@prisma/client'
import { DB } from "./db";
import { ObjectSchema } from "joi";



type SequenceWithOrders = (Sequence & { orders: (Order & { Pin: { label: string } })[] })

type SequenceDBType = SequenceWithOrders & { CronSequence: { cron: Cron }[] }


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
            include: { CronSequence: { select: { cron: true } }, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
        this.emit('insert', newSeq)
        return newSeq
    };


    get = (id: SequenceDBType['id']) => {
        return this.prisma.sequence.findUnique({
            where: { id }, include: { CronSequence: { select: { cron: true } }, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
    }


    remove = async (id: SequenceDBType['id']) => {
        const orders = this.prisma.order.deleteMany({ where: { sequenceId: id } })
        const events = this.prisma.sequenceEvent.deleteMany({ where: { sequenceId: id } })
        const sequence = this.prisma.sequence.delete({ where: { id } })
        await this.prisma.$transaction([orders, events, sequence])
        this.emit('remove', id)
    }


    list = async () => {
        return this.prisma.sequence.findMany({
            include: { CronSequence: { select: { cron: true } }, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
    }


    set = async (id: SequenceDBType['id'], arg: any) => {

        const { value: data, error } = this.validator.validate(arg)

        if (error) throw error

        const oldOrders = await this.prisma.order.findMany({ where: { sequenceId: id } })

        const newSeq = await this.prisma.sequence.update({
            where: { id },
            data,
            include: { CronSequence: { select: { cron: true } }, orders: { include: { Pin: { 'select': { label: true } } } } }
        })

        const deleteOldOrders = oldOrders.map(o => this.prisma.order.delete({ where: { id: o.id } }))
        await this.prisma.$transaction(deleteOldOrders)

        this.emit('update', newSeq)
        return newSeq
    }


    update = async (id: SequenceDBType['id'], obj: any) => {

        const { value: data, error } = this.partialValidator.validate(obj)

        if (error) throw error

        const oldOrders = data.orders ? await this.prisma.order.findMany({ where: { sequenceId: id } }) : []

        const newSeq = await this.prisma.sequence.update({
            where: { id },
            data,
            include: { CronSequence: { select: { cron: true } }, orders: { include: { Pin: { 'select': { label: true } } } } }
        })

        const deleteOldOrders = oldOrders.map(o => this.prisma.order.delete({ where: { id: o.id } }))
        await this.prisma.$transaction(deleteOldOrders)

        this.emit('update', newSeq)
        return newSeq
    }
}

export { SequenceDb }
export type { SequenceDBType }









