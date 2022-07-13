
import EventEmitter from "events"
import { Sequence, Schedule, Order, PrismaClient, } from '@prisma/client'
import { DB } from "./db";


type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

type SequenceWithOrders = (Sequence & { orders: (Order & { Pin: { label: string } })[] })

type SequenceDBType = XOR<(SequenceWithOrders & { schedule: Schedule }), SequenceWithOrders>


class SequenceDb extends EventEmitter implements DB<Sequence['id'], SequenceDBType> {

    validator: (obj: Partial<SequenceDBType>) => SequenceDBType
    prisma: PrismaClient

    constructor(prisma: PrismaClient, validator: (obj: Partial<SequenceDBType>,) => SequenceDBType) {
        super()
        this.prisma = prisma
        this.validator = validator
    }

    insert = async (arg: Partial<SequenceDBType>) => {

        const obj = this.validator(arg)

        const data = obj.schedule ? {
            ...obj,
            id: undefined,
            scheduleId: undefined,
            orders: { create: obj.orders.map(o => ({ ...o, sequenceId: undefined })) },
            schedule: { create: obj.schedule },

        } : {
            ...obj,
            id: undefined,
            orders: { create: obj.orders.map(o => ({ ...o, sequenceId: undefined })) },
            scheduleId: obj.scheduleId,
        }
        const newSeq = await this.prisma.sequence.create({
            data,
            include: { schedule: true, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
        this.emit('insert', newSeq)
        return newSeq
    };


    get = (id: SequenceDBType['id']) => {
        return this.prisma.sequence.findUnique({
            where: { id }, include: { schedule: true, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
    }


    remove = async (id: SequenceDBType['id']) => {
        const orders = this.prisma.order.deleteMany({ where: { sequenceId: id } })
        const sequence = this.prisma.sequence.delete({ where: { id } })
        await this.prisma.$transaction([orders, sequence])
        this.emit('remove', id)
    }


    list = () => {
        return this.prisma.sequence.findMany({
            include: { schedule: true, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
    }


    set = async (id: SequenceDBType['id'], arg: Partial<SequenceDBType>) => {
        const obj = this.validator(arg)
        const data =
            obj.schedule ? {
                ...obj,
                id: undefined,
                scheduleId: undefined,
                schedule: { create: obj.schedule },

            } : {
                ...obj,
                id: undefined,
                scheduleId: obj.scheduleId,
            }
        await this.prisma.order.deleteMany({ where: { sequenceId: id } })
        const newSeq = await this.prisma.sequence.update({
            where: { id },
            data: {
                ...data,
                orders: {
                    create: obj.orders.map(o => ({ ...o, sequenceId: undefined, id: undefined, Pin: undefined })),
                },
            },
            include: { schedule: true, orders: { include: { Pin: { 'select': { label: true } } } } }
        })
        this.emit('update', newSeq)
        return newSeq
    }


    update = async (id: SequenceDBType['id'], obj: Partial<SequenceDBType>) => {

        // NOTICE: this is inefficient since orders will get deleted and recreated 
        // because the set method treats them as new data
        // TODO: FIX THIS MESS
        const oldSeq = await this.get(id)

        if (!oldSeq) throw new Error('Sequence not found')

        const data = obj.schedule ?
            {
                ...oldSeq,
                ...obj,
                id: undefined,
                scheduleId: undefined,
            } :
            {
                ...oldSeq,
                ...obj,
                id: undefined,
                schedule: undefined
            }
        return this.set(id, data)
    }
}

export { SequenceDb }
export type { SequenceDBType }









