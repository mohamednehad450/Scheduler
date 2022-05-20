import { ID, Pin, SequenceData, validateSequenceData, validatePin, validateUUID } from "../pi/utils"
import { LocalJsonDb, LocalObjectDb } from "./db"

type AppDB = {
    sequencesDb: LocalJsonDb<SequenceData>,
    pinsDb: LocalObjectDb<Pin>
    activeSequences: LocalObjectDb<{ id: ID }>
}

const paths = {
    SEQUENCES: 'sequences/',
    OBJECTS: 'objects/'
}


const sequencesDb = new LocalJsonDb<SequenceData>(paths.SEQUENCES, validateSequenceData)
const pinsDb = new LocalObjectDb<Pin>(paths.OBJECTS, 'pins', validatePin)
const activeSequences = new LocalObjectDb<{ id: ID }>(paths.OBJECTS, 'activeSequences', ({ id }: { id?: ID }) => ({ id: validateUUID(id) }))

const appDb: AppDB = {
    sequencesDb,
    pinsDb,
    activeSequences
}
export { appDb, AppDB }
