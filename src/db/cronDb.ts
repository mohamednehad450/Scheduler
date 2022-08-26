
import EventEmitter from "events"
import { PrismaClient, Cron } from '@prisma/client'
import { DB } from "./db";
import { ObjectSchema } from "joi";

interface CronDbType extends Cron {
    CronSequence: {
        sequenceId: number
    }[]
}

class CronDb extends EventEmitter implements DB<Cron['id'], CronDbType> {

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

        const newCron = await this.prisma.cron.create({ data, include: { CronSequence: { select: { sequenceId: true } } } })

        this.emit('insert', newCron)
        return newCron
    };


    get = (id: number) => {
        return this.prisma.cron.findUnique({ where: { id }, include: { CronSequence: { select: { sequenceId: true } } } })
    }


    remove = async (id: number) => {
        await this.prisma.sequence.delete({ where: { id } })
        this.emit('remove', id)
    }


    list = () => {
        return this.prisma.cron.findMany({ include: { CronSequence: { select: { sequenceId: true } } } })
    }


    set = async (id: CronDbType['id'], arg: any) => {
        const { value: data, error } = this.validator.validate(arg)

        if (error) throw error

        const newCron = await this.prisma.cron.update({
            where: { id },
            data,
            include: { CronSequence: { select: { sequenceId: true } } }
        })
        this.emit('update', newCron)
        return newCron
    }


    update = async (id: number, obj: any) => {

        const { error, value: data } = this.partialValidator.validate(obj)

        if (error) throw error

        const newCron = await this.prisma.cron.update({
            where: { id },
            data,
            include: { CronSequence: { select: { sequenceId: true } } }
        })
        this.emit('update', newCron)
        return newCron
    }
}

export { CronDb }
export type { CronDbType }