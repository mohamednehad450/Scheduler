import { Pin, SequenceData, validateSequenceData, validatePin, validateUUID } from "../pi/utils"
import { LocalJsonDb, LocalObjectDb } from "./db"

type AppDB = {
    sequencesDb: LocalJsonDb<SequenceData>,
    pinsDb: LocalObjectDb<Pin>
    activeSequences: LocalObjectDb<{ id: SequenceData['id'] }>
}

const paths = {
    SEQUENCES: 'sequences/',
    OBJECTS: 'objects/'
}


const sequencesDb = new LocalJsonDb<SequenceData>(paths.SEQUENCES, validateSequenceData)
const pinsDb = new LocalObjectDb<Pin>(paths.OBJECTS, 'pins', validatePin)
const activeSequences = new LocalObjectDb<{ id: SequenceData['id'] }>(paths.OBJECTS, 'activeSequences', ({ id }: { id?: SequenceData['id'] }) => ({ id: validateUUID(String(id)) }))

const appDb: AppDB = {
    sequencesDb,
    pinsDb,
    activeSequences
}
export { appDb, AppDB }
