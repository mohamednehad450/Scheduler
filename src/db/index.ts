import { PrismaClient } from "@prisma/client"
import { PinDb, PinDbType } from "./pinsDb"
import { ScheduleDb, ScheduleDbType } from "./scheduleDb"
import { SequenceDb, SequenceDBType } from "./sequenceDb"
import { SequenceEventsDb, SequenceEventDBType } from "./sequenceEventsDb"
import { PinSchema, PinPartialSchema, SequencePartialSchema, SequenceSchema, ScheduleSchema, SchedulePartialSchema, SequenceEventSchema } from "./validators"

type AppDB = {
    sequencesDb: SequenceDb,
    sequenceEventsDb: SequenceEventsDb
    pinsDb: PinDb,
    scheduleDb: ScheduleDb
}

const prisma = new PrismaClient()
prisma.$connect()

const sequencesDb = new SequenceDb(prisma, SequenceSchema, SequencePartialSchema)
const sequenceEventsDb = new SequenceEventsDb(prisma, SequenceEventSchema)
const pinsDb = new PinDb(prisma, PinSchema, PinPartialSchema)
const scheduleDb = new ScheduleDb(prisma, ScheduleSchema, SchedulePartialSchema)


const appDb: AppDB = {
    sequencesDb,
    sequenceEventsDb,
    pinsDb,
    scheduleDb,
}

export { appDb }
export type { AppDB, SequenceDBType, PinDbType, ScheduleDbType, SequenceEventDBType }
