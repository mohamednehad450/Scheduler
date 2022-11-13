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
    }


    run = () => {
        this.db.sequencesDb.get(this.id)
            .then(seq => {
                if (!seq) return
                const err = this.pm.run(seq)
                if (!err) {
                    this.db.sequencesDb.update(this.id, { lastRun: new Date() })
                        .catch(err => {
                            // TODO
                        })
                }
            })
            .catch(err => {
                // TODO
            })
    }


    stop = () => this.pm.stop(this.id)
    isActive = () => this.active

    update = (newData: SequenceDBType) => {
        if (newData.active !== this.active) {
            this.db.sequenceEventsDb.emit({
                sequenceId: this.id,
                date: new Date(),
                eventType: newData.active ? 'activate' : 'deactivate'
            })
        }
        this.active = newData.active
    }
}


export default Sequence