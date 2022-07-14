
import EventEmitter from "events"
import { PrismaClient, Schedule } from '@prisma/client'
import { DB } from "./db";
import { ObjectSchema } from "joi";

type ScheduleDbType = Schedule

class ScheduleDb extends EventEmitter implements DB<Schedule['id'], ScheduleDbType> {

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

        const newSchedule = await this.prisma.schedule.create({ data })

        this.emit('insert', newSchedule)
        return newSchedule
    };


    get = (id: number) => {
        return this.prisma.schedule.findUnique({ where: { id } })
    }


    remove = async (id: number) => {
        await this.prisma.sequence.delete({ where: { id } })
        this.emit('remove', id)
    }


    list = () => {
        return this.prisma.schedule.findMany()
    }


    set = async (id: ScheduleDbType['id'], arg: any) => {
        const { value: data, error } = this.validator.validate(arg)

        if (error) throw error

        console.log(data)
        const newSchedule = await this.prisma.schedule.update({
            where: { id },
            data,
        })
        this.emit('update', newSchedule)
        return newSchedule
    }


    update = async (id: number, obj: any) => {

        const { error, value: data } = this.partialValidator.validate(obj)

        if (error) throw error

        const newSchedule = await this.prisma.schedule.update({
            where: { id },
            data,
        })
        this.emit('update', newSchedule)
        return newSchedule
    }
}

export { ScheduleDb }
export type { ScheduleDbType }