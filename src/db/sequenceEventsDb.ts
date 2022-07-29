import { PrismaClient, SequenceEvent } from "@prisma/client"
import { ObjectSchema } from "joi"
import { EventsDB } from "./db"




class SequenceEventsDb implements EventsDB<SequenceEvent['id'], SequenceEvent> {

    prisma: PrismaClient
    validator: ObjectSchema


    constructor(prisma: PrismaClient, validator: ObjectSchema) {
        this.prisma = prisma
        this.validator = validator
    }


    emit = async (e: any) => {
        const { error, value } = this.validator.validate(e)
        if (error) throw error
        return await this.prisma.sequenceEvent.create({
            data: value
        })
    }


    get = (id: any) => this.prisma.sequenceEvent.findUnique({ where: { id } })


    remove = async (id: any) => {
        await this.prisma.sequenceEvent.delete({ where: { id } })
    }


    listAll = () => this.prisma.sequenceEvent.findMany()
    list = (sequenceId: number) => this.prisma.sequenceEvent.findMany({ where: { sequenceId } })
}

export { SequenceEventsDb }
export type { SequenceEvent as SequenceEventDBType }