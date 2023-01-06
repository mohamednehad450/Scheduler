import { PrismaClient } from "@prisma/client";
import Joi, { ArraySchema } from "joi";
import { CronDbType, cronInclude } from "./cronDb";
import { SequenceDBType, sequenceInclude } from "./sequenceDb";


interface CronSequenceLinkInterface {
    linkSequence: (sequenceId: SequenceDBType['id'], cronsIds: CronDbType['id'][]) => Promise<SequenceDBType>
    linkCron: (cronId: CronDbType['id'], sequencesIds: SequenceDBType['id'][]) => Promise<CronDbType>

}

class CronSequenceLink implements CronSequenceLinkInterface {

    prisma: PrismaClient
    validator: ArraySchema

    constructor(prisma: PrismaClient, validator: ArraySchema) {
        this.prisma = prisma
        this.validator = validator
    }

    linkSequence = async (sequenceId: SequenceDBType['id'], cronsIds: CronDbType['id'][]) => {
        const { value: data, error }: Joi.ValidationResult<number[]> = this.validator.validate(cronsIds)
        if (error) throw error


        const oldLinks = this.prisma.cronSequence.deleteMany({ where: { sequenceId } })
        const newLinks = this.prisma.sequence.update({
            where: { id: sequenceId },
            data: {
                CronSequence: { create: data?.map(cronId => ({ cronId })) }
            },
            include: sequenceInclude
        })

        const results = await this.prisma.$transaction([oldLinks, newLinks])

        return results[1]
    }

    linkCron = async (cronId: CronDbType['id'], sequencesIds: SequenceDBType['id'][]) => {
        const { value: data, error }: Joi.ValidationResult<number[]> = this.validator.validate(sequencesIds)
        if (error) throw error


        const oldLinks = this.prisma.cronSequence.deleteMany({ where: { cronId } })
        const newLinks = this.prisma.cron.update({
            where: { id: cronId },
            data: {
                CronSequence: { create: data?.map(sequenceId => ({ sequenceId })) }
            },
            include: cronInclude
        })

        const results = await this.prisma.$transaction([oldLinks, newLinks])

        return results[1]
    }
}

export default CronSequenceLink