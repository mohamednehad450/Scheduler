import { MultiPins, SinglePin } from "../pi/utils"
import { LocalJsonDb } from "./db"

const paths = {
    SINGLEPIN: 'schedules/single/',
    MULTIPINS: 'schedules/multi/'
}


const singleDb = new LocalJsonDb<SinglePin>(paths.SINGLEPIN)
const multiDb = new LocalJsonDb<MultiPins>(paths.MULTIPINS)

type AppDB = {
    singleDb: LocalJsonDb<SinglePin>,
    multiDb: LocalJsonDb<MultiPins>
}

const appDb: AppDB = {
    singleDb,
    multiDb
}
export { appDb, AppDB }
