import { Schedule } from "../pi/utils"
import { LocalJsonDb } from "./db"

type AppDB = {
    schedulesDb: LocalJsonDb<Schedule>,
}

const paths = {
    SCHEDULES: 'schedules/',
}


const schedulesDb = new LocalJsonDb<Schedule>(paths.SCHEDULES)


const appDb: AppDB = {
    schedulesDb
}
export { appDb, AppDB }
