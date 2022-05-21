
import { AppDB } from '../db'
import PinManager from './PinManager'
import Sequence from './Sequence'
import { ID, } from './utils'

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface SchedulerInterface {
    activate: (id: ID, cb: CallBack<void>) => void
    deactivate: (id: ID, cb: CallBack<void>) => void
    isActive: (id: ID, cb: CallBack<boolean>) => void
    run: (id: ID, cb: CallBack<void>) => void
    stop: (id: ID, cb: CallBack<void>) => void
    isRunning: (id: ID, cb: CallBack<boolean>) => void
}

class Scheduler implements SchedulerInterface {

    pinManager: PinManager
    sequences: Map<ID, Sequence>
    db: AppDB



    constructor(db: AppDB, pinManager: PinManager) {
        this.db = db
        this.pinManager = pinManager
        this.sequences = new Map()

        db.sequencesDb.list((err, seqData) => {
            if (err) {
                // TODO
                return
            }
            seqData && seqData.forEach(d => this.sequences.set(d.id, new Sequence(d, this.pinManager)))

            db.activeSequences.list((err, ids) => {
                if (err) {
                    // TODO
                    return
                }
                ids && ids.forEach(({ id }) => this.activate(id, (err) => {
                    if (err) {
                        // TODO
                        return
                    }
                }))
            })
        })
    }


    activate = (id: ID, cb: CallBack<void>) => {

        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (seq.isActive()) {
            cb(null)
            return
        }

        seq.activate((err) => {
            if (err) {
                cb(err)
                return
            }
            this.db.activeSequences.insert({ id: seq.data.id }, (err, id) => {
                if (err) {
                    cb(err)
                    return
                }
                cb(null)
            })
        })
    };


    deactivate = (id: ID, cb: CallBack<void>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (!seq.isActive()) {
            cb(null)
            return
        }

        seq.deactivate((err) => {
            if (err) {
                cb(err)
                return
            }
            this.db.activeSequences.remove(seq.data.id, (err, id) => {
                if (err) {
                    cb(err)
                    return
                }
                cb(null)
            })
        })
    };


    isActive = (id: ID, cb: CallBack<boolean>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }
        cb(null, seq.isActive())

    }


    active = (cb: CallBack<ID[]>) => {
        cb(null,
            [...this.sequences.entries()]
                .filter(([_, seq]) => seq.isActive())
                .map(([id]) => id)
        )
    }


    run = (id: ID, cb: CallBack<void>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (seq.isRunning()) {
            cb(null)
            return
        }
        seq.run(cb)
    }



    isRunning = (id: ID, cb: CallBack<boolean>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }
        return seq.isRunning()
    }

    stop = (id: ID, cb: CallBack<void>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (seq.isRunning()) {
            cb(null)
            return
        }

        seq.stop(cb)
    }

}



export default Scheduler