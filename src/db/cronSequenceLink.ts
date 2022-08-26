import { PrismaClient } from "@prisma/client";
import { CronDbType } from "./cronDb";
import { SequenceDBType } from "./sequenceDb";


class CronSequenceLink {

    prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    linkSequence = (sequenceId: SequenceDBType['id'], cronsIds: CronDbType['id'][]) => {
        const oldLinks = this.prisma.cronSequence.deleteMany({ where: { sequenceId } })
        const newLinks = cronsIds.map(cronId => this.prisma.cronSequence.create({
            data: {
                sequenceId,
                cronId
            }
        }))
        return this.prisma.$transaction([oldLinks, ...newLinks])
    }

    linkCron = (cronId: CronDbType['id'], sequencesIds: SequenceDBType['id'][]) => {
        const oldLinks = this.prisma.cronSequence.deleteMany({ where: { cronId } })
        const newLinks = sequencesIds.map(sequenceId => this.prisma.cronSequence.create({
            data: {
                sequenceId,
                cronId
            }
        }))
        return this.prisma.$transaction([oldLinks, ...newLinks])
    }
}

export default CronSequenceLink