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
    removeByObject = async (sequenceId: number) => {
        await this.prisma.sequenceEvent.deleteMany({ where: { sequenceId } })
    }
    removeAll = async () => {
        await this.prisma.sequenceEvent.deleteMany()
    }



    listAll = () => this.prisma.sequenceEvent.findMany({ orderBy: { date: 'desc' } })
    listByObject = (sequenceId: number) => this.prisma.sequenceEvent.findMany({ where: { sequenceId }, orderBy: { date: 'desc' } })
}

export { SequenceEventsDb }
export type { SequenceEvent as SequenceEventDBType }