import { PrismaClient } from "@prisma/client"
import { PinDb, PinDbType } from "./pinsDb"
import { SequenceDb, SequenceDBType } from "./sequenceDb"
import { PinSchema, PinPartialSchema, SequencePartialSchema, SequenceSchema } from "./validators"

type AppDB = {
    sequencesDb: SequenceDb,
    pinsDb: PinDb
}

const prisma = new PrismaClient()
prisma.$connect()

const sequencesDb = new SequenceDb(prisma, SequenceSchema, SequencePartialSchema)
const pinsDb = new PinDb(prisma, PinSchema, PinPartialSchema)

const appDb: AppDB = {
    sequencesDb,
    pinsDb,
}

export { appDb }
export type { AppDB, SequenceDBType, PinDbType }
