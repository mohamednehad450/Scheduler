import { ID, Pin, Schedule } from "../pi/utils"
import { LocalJsonDb, LocalObjectDb } from "./db"

type AppDB = {
    schedulesDb: LocalJsonDb<Schedule>,
    pinsDb: LocalObjectDb<Pin>
    activeSchedules: LocalObjectDb<{ id: ID }>
}

const paths = {
    SCHEDULES: 'schedules/',
    OBJECTS: 'objects/'
}


const schedulesDb = new LocalJsonDb<Schedule>(paths.SCHEDULES)
const pinsDb = new LocalObjectDb<Pin>(paths.OBJECTS, 'pins')
const activeSchedules = new LocalObjectDb<{ id: ID }>(paths.OBJECTS, 'activeSchedules')

const appDb: AppDB = {
    schedulesDb,
    pinsDb,
    activeSchedules
}
export { appDb, AppDB }
