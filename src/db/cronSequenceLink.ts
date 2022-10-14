import { PrismaClient } from "@prisma/client";
import { CronDbType, cronInclude } from "./cronDb";
import { SequenceDBType, sequenceInclude } from "./sequenceDb";


interface CronSequenceLinkInterface {
    linkSequence: (sequenceId: SequenceDBType['id'], cronsIds: CronDbType['id'][]) => Promise<SequenceDBType>
    linkCron: (cronId: CronDbType['id'], sequencesIds: SequenceDBType['id'][]) => Promise<CronDbType>

}

class CronSequenceLink implements CronSequenceLinkInterface {

    prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    linkSequence = async (sequenceId: SequenceDBType['id'], cronsIds: CronDbType['id'][]) => {

        const oldLinks = this.prisma.cronSequence.deleteMany({ where: { sequenceId } })
        const newLinks = this.prisma.sequence.update({
            where: { id: sequenceId },
            data: {
                CronSequence: { create: cronsIds.map(cronId => ({ cronId })) }
            },
            include: sequenceInclude
        })

        const results = await this.prisma.$transaction([oldLinks, newLinks])

        return results[1]
    }

    linkCron = async (cronId: CronDbType['id'], sequencesIds: SequenceDBType['id'][]) => {

        const oldLinks = this.prisma.cronSequence.deleteMany({ where: { cronId } })
        const newLinks = this.prisma.cron.update({
            where: { id: cronId },
            data: {
                CronSequence: { create: sequencesIds.map(sequenceId => ({ sequenceId })) }
            },
            include: cronInclude
        })

        const results = await this.prisma.$transaction([oldLinks, newLinks])

        return results[1]
    }
}

export default CronSequenceLink