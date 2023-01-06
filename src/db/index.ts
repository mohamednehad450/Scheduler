import { PrismaClient } from "@prisma/client"
import { CronDb, CronDbType } from "./cronDb"
import CronSequenceLink from "./cronSequenceLink"
import { PinDb, PinDbType } from "./pinsDb"
import { SequenceDb, SequenceDBType } from "./sequenceDb"
import { SequenceEventsDb, SequenceEventDBType } from "./sequenceEventsDb"
import AdminDb from "./adminDb"
import { PinSchema, PinPartialSchema, SequencePartialSchema, SequenceSchema, SequenceEventSchema, CronSchema, CronPartialSchema, LinkArraySchema } from "./validators"

type AppDB = {
    sequencesDb: SequenceDb,
    sequenceEventsDb: SequenceEventsDb
    pinsDb: PinDb,
    cronDb: CronDb,
    cronSequenceLink: CronSequenceLink
    adminDb: AdminDb,
    prisma: PrismaClient
}


const initDb = async (): Promise<AppDB> => {
    const prisma = new PrismaClient()
    await prisma.$connect()

    const sequencesDb = new SequenceDb(prisma, SequenceSchema, SequencePartialSchema)
    const sequenceEventsDb = new SequenceEventsDb(prisma, SequenceEventSchema)
    const pinsDb = new PinDb(prisma, PinSchema, PinPartialSchema)
    const cronDb = new CronDb(prisma, CronSchema, CronPartialSchema)
    const cronSequenceLink = new CronSequenceLink(prisma, LinkArraySchema)
    const adminDb = new AdminDb(prisma)

    return {
        sequencesDb,
        sequenceEventsDb,
        pinsDb,
        cronDb,
        cronSequenceLink,
        adminDb,
        prisma,
    }
}



export { initDb }
export type { AppDB, SequenceDBType, PinDbType, CronDbType, SequenceEventDBType }
