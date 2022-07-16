import PinManager from './PinManager'
import later, { setInterval, } from "later"
import { AppDB, SequenceDBType } from "../db"


class Sequence {

    data: SequenceDBType
    pm: PinManager
    interval?: later.Timer
    db: AppDB

    constructor(data: SequenceDBType, pm: PinManager, appDb: AppDB) {
        this.data = data
        this.pm = pm
        this.db = appDb

        this.db.sequencesDb.addListener('update', (newData: SequenceDBType) => {
            if (newData.id !== this.data.id) return
            this.data = newData
            if (newData.active) {
                this.deactivate()
                this.activate()
            }
            else {
                this.deactivate()
            }
        })

        this.db.sequencesDb.addListener('remove', (id) => {
            if (id !== this.data.id) return
            this.stop()
            this.deactivate()
            this.data.id = -1
        })

        data.active && this.activate()
    }


    run = () => {
        this.pm.run(this.data)
        this.db.sequencesDb.update(this.data.id, { lastRun: new Date() })
    }


    stop = () => {
        this.pm.stop(this.data.id)
    }


    isRunning = () => {
        return this.pm.isRunning(this.data.id)
    }

    private activate = () => {
        if (this.interval) return
        this.db.scheduleDb.get(this.data.scheduleId)
            .then(v => {
                if (!v) return
                const schedule = JSON.parse(v.scheduleJson)
                this.interval = setInterval(() => this.run(), schedule)
            })
            .catch(err => {
                // TODO
            })

    }

    private deactivate = () => {
        this.interval?.clear()
        this.interval = undefined
    }

    isActive = (): boolean => {
        return this.data.active
    }
}



export default Sequence