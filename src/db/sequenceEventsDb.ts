import { PrismaClient, SequenceEvent } from "@prisma/client"
import { ObjectSchema } from "joi"
import { EventsDB, Page } from "./db"


type SequenceEventDBType = (SequenceEvent & { sequence: { name: string } })

const DEFAULT_PER_PAGE = 20

class SequenceEventsDb implements EventsDB<SequenceEvent['id'], SequenceEventDBType> {

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
            data: value,
            include: { sequence: { select: { name: true } } }
        })
    }


    get = (id: any) => this.prisma.sequenceEvent.findUnique({
        where: { id },
        include: { sequence: { select: { name: true } } }
    })


    remove = async (id: any) => {
        await this.prisma.sequenceEvent.delete({ where: { id } })
    }
    removeByObject = async (sequenceId: number) => {
        await this.prisma.sequenceEvent.deleteMany({ where: { sequenceId } })
    }
    removeAll = async () => {
        await this.prisma.sequenceEvent.deleteMany()
    }



    listAll = async (page?: Page) => {
        const current = Math.max(page?.page || 1, 1)
        const perPage = Math.max(page?.perPage || DEFAULT_PER_PAGE, 1)


        const [events, total] = await this.prisma.$transaction([
            this.prisma.sequenceEvent.findMany({
                orderBy: { date: 'desc' },
                include: { sequence: { select: { name: true } } },
                take: perPage,
                skip: (current - 1) * perPage,
            }),
            this.getCount()
        ])
        return {
            events,
            page: {
                current,
                perPage,
                total
            }
        }
    }

    getCount = () => this.prisma.sequenceEvent.count()

    listByObject = async (sequenceId: number, page?: Page) => {
        const exists = await this.prisma.sequence.count({ where: { id: sequenceId } })
        if (!exists) return null

        const current = Math.max(page?.page || 1, 1)
        const perPage = Math.max(page?.perPage || DEFAULT_PER_PAGE, 1)

        const [events, total] = await this.prisma.$transaction([
            this.prisma.sequenceEvent.findMany({
                where: { sequenceId },
                orderBy: { date: 'desc' },
                include: { sequence: { select: { name: true } } },
                take: perPage,
                skip: (current - 1) * perPage,
            }),
            this.getCountByObject(sequenceId)
        ])
        return {
            events,
            page: {
                current,
                perPage,
                total
            }
        }
    }

    getCountByObject = (objId: any) => this.prisma.sequenceEvent.count({ where: { sequenceId: objId } })
}

export { SequenceEventsDb }
export type { SequenceEventDBType }