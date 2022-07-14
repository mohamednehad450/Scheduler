import PinManager from './PinManager'
import later, { setInterval, } from "later"
import { SequenceDBType } from "../db"
import { SequenceDb } from "../db/sequenceDb"


class Sequence {

    data: SequenceDBType
    pm: PinManager
    interval?: later.Timer
    db: SequenceDb

    constructor(data: SequenceDBType, pm: PinManager, db: SequenceDb) {
        this.data = data
        this.pm = pm
        this.db = db

        db.addListener('update', (newData: SequenceDBType) => {
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

        db.addListener('remove', (id) => {
            if (id !== this.data.id) return
            this.stop()
            this.deactivate()
            this.data.id = -1
        })

        data.active && this.activate()
    }


    run = () => {
        this.pm.run(this.data)
        this.db.update(this.data.id, { lastRun: new Date() })
    }


    stop = () => {
        this.pm.stop(this.data.id)
    }


    isRunning = () => {
        return this.pm.isRunning(this.data.id)
    }

    private activate = () => {
        if (!this.interval && this.data.schedule) {
            const schedule = JSON.parse(this.data.schedule.scheduleJson)
            this.interval = setInterval(() => this.run(), schedule)
        }
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