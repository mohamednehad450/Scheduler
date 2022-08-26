import PinManager from './PinManager'
import { AppDB, SequenceDBType } from "../db"


class Sequence {

    id: SequenceDBType['id']
    pm: PinManager
    db: AppDB

    active: boolean

    constructor(seq: SequenceDBType, pm: PinManager, appDb: AppDB) {

        this.id = seq.id
        this.pm = pm
        this.db = appDb
        this.active = seq.active


        const update = (newData: SequenceDBType) => {
            if (newData.id !== this.id) return
            if (newData.active !== this.active) {
                this.db.sequenceEventsDb.emit({
                    sequenceId: this.id,
                    date: new Date(),
                    eventType: newData.active ? 'activate' : 'deactivate'
                })
            }
            this.active = newData.active
        }


        const remove = (id: number) => {
            if (id !== this.id) return
            this.stop()
            this.db.sequencesDb.removeListener('update', update)
            this.db.sequencesDb.removeListener('remove', remove)
        }


        this.db.sequencesDb.addListener('update', update)
        this.db.sequencesDb.addListener('remove', remove)
    }


    run = () => {
        this.db.sequencesDb.update(this.id, { lastRun: new Date() })
            .then(seq => {
                if (!seq) return
                this.pm.run(seq)
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


    isActive = (): boolean => {
        return this.active
    }
}



export default Sequence