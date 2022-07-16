import PinManager from './PinManager'
import later, { setInterval, } from "later"
import { AppDB, SequenceDBType } from "../db"
import { ScheduleDbType } from '../db/scheduleDb'


class Sequence {

    id: SequenceDBType['id']
    scheduleId: ScheduleDbType['id']
    pm: PinManager
    interval?: later.Timer
    db: AppDB

    constructor(seq: SequenceDBType, pm: PinManager, appDb: AppDB) {

        this.id = seq.id
        this.scheduleId = seq.scheduleId
        this.pm = pm
        this.db = appDb

        const update = (newData: SequenceDBType) => {
            if (newData.id !== this.id) return
            this.scheduleId = newData.scheduleId
            if (newData.active) {
                this.activate(newData.schedule)
            }
            else {
                this.deactivate()
            }
        }
        const updateSchedule = (newSchedule: ScheduleDbType) => {
            if (newSchedule.id !== this.scheduleId) return
            this.isActive() && this.activate(newSchedule)
        }


        const remove = (id: number) => {
            if (id !== this.id) return
            this.stop()
            this.deactivate()
            this.db.sequencesDb.removeListener('update', update)
            this.db.sequencesDb.removeListener('remove', remove)
            this.db.scheduleDb.removeListener('update', updateSchedule)
        }



        this.db.sequencesDb.addListener('update', update)
        this.db.sequencesDb.addListener('remove', remove)
        this.db.scheduleDb.addListener('update', updateSchedule)
    }


    run = () => {
        this.db.sequencesDb.get(this.id)
            .then(seq => {
                if (!seq) return
                this.pm.run(seq)
                this.db.sequencesDb.update(this.id, { lastRun: new Date() })
            })
            .catch(err => {
                // TODO
            })
    }


    stop = () => {
        this.pm.stop(this.id)
    }


    isRunning = () => {
        return this.pm.isRunning(this.id)
    }

    private activate = (schedule: ScheduleDbType) => {
        this.deactivate()
        this.interval = setInterval(() => this.run(), JSON.parse(schedule.scheduleJson))
        return

    }

    private deactivate = () => {
        this.interval?.clear()
        this.interval = undefined
    }

    isActive = (): boolean => {
        return !!this.interval
    }
}



export default Sequence