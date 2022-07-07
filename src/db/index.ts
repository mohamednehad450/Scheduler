import { PrismaClient } from "@prisma/client"
import { validateSequenceData, validatePin } from "../pi/utils"
import { PinDb, PinDbType } from "./pinsDb"
import { SequenceDb, SequenceDBType } from "./sequenceDb"

type AppDB = {
    sequencesDb: SequenceDb,
    pinsDb: PinDb
}

const prisma = new PrismaClient()
prisma.$connect()

const sequencesDb = new SequenceDb(prisma, validateSequenceData)
const pinsDb = new PinDb(prisma, validatePin)

const appDb: AppDB = {
    sequencesDb,
    pinsDb,
}

export { appDb }
export type { AppDB, SequenceDBType, PinDbType }
