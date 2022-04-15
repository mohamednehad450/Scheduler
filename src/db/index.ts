import { ID, Pin, SequenceData } from "../pi/utils"
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


const sequencesDb = new LocalJsonDb<SequenceData>(paths.SEQUENCES)
const pinsDb = new LocalObjectDb<Pin>(paths.OBJECTS, 'pins')
const activeSequences = new LocalObjectDb<{ id: ID }>(paths.OBJECTS, 'activeSequences')

const appDb: AppDB = {
    sequencesDb,
    pinsDb,
    activeSequences
}
export { appDb, AppDB }
