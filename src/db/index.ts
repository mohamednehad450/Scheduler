import { PrismaClient } from "@prisma/client"
import { PinDb, PinDbType } from "./pinsDb"
import { ScheduleDb } from "./scheduleDb"
import { SequenceDb, SequenceDBType } from "./sequenceDb"
import { PinSchema, PinPartialSchema, SequencePartialSchema, SequenceSchema, ScheduleSchema, SchedulePartialSchema } from "./validators"

type AppDB = {
    sequencesDb: SequenceDb,
    pinsDb: PinDb,
    scheduleDb: ScheduleDb
}

const prisma = new PrismaClient()
prisma.$connect()

const sequencesDb = new SequenceDb(prisma, SequenceSchema, SequencePartialSchema)
const pinsDb = new PinDb(prisma, PinSchema, PinPartialSchema)
const scheduleDb = new ScheduleDb(prisma, ScheduleSchema, SchedulePartialSchema)

const appDb: AppDB = {
    sequencesDb,
    pinsDb,
    scheduleDb,
}

export { appDb }
export type { AppDB, SequenceDBType, PinDbType }
