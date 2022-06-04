
import { AppDB } from '../db'
import PinManager from './PinManager'
import Sequence from './Sequence'
import { Pin, SequenceData, } from './utils'

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface SchedulerInterface {
    activate: (id: SequenceData['id'], cb: CallBack<void>) => void
    deactivate: (id: SequenceData['id'], cb: CallBack<void>) => void
    isActive: (id: SequenceData['id'], cb: CallBack<boolean>) => void
    run: (id: SequenceData['id'], cb: CallBack<void>) => void
    stop: (id: SequenceData['id'], cb: CallBack<void>) => void
    isRunning: (id: SequenceData['id'], cb: CallBack<boolean>) => void
}

class Scheduler implements SchedulerInterface {

    pinManager: PinManager
    sequences: Map<SequenceData['id'], Sequence>
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

            // New sequence added
            db.sequencesDb.addListener('insert', (newSeq: SequenceData) => {
                this.sequences.set(newSeq.id, new Sequence(newSeq, this.pinManager))
            })

            // Old sequence has been updated
            db.sequencesDb.addListener('update', (seq: SequenceData) => {
                const oldSeq = this.sequences.get(seq.id)
                const newSeq = new Sequence(seq, this.pinManager)
                const isActive = oldSeq?.isActive()
                const isRunning = oldSeq?.isRunning()
                if (isActive) {
                    oldSeq?.deactivate((err) => {
                        if (err) {
                            // TODO
                            return
                        }
                        newSeq.activate(err => {
                            // TODO
                        })
                    })

                }
                if (isRunning) {
                    oldSeq?.stop((err) => {
                        if (err) {
                            // TODO
                            return
                        }
                        newSeq.run(err => {
                            // TODO
                        })
                    })
                }
                this.sequences.set(seq.id, newSeq)
            })

            // Old sequence has been removed
            db.sequencesDb.addListener('remove', (seqId: SequenceData['id']) => {
                const oldSeq = this.sequences.get(seqId)
                if (oldSeq?.isActive()) {
                    oldSeq?.deactivate((err) => {
                        // TODO
                    })
                }
                if (oldSeq?.isRunning()) {
                    oldSeq?.stop((err) => {
                        // TODO
                    })
                }
                this.sequences.delete(seqId)
            })

            db.pinsDb.addListener('remove', (pinId: Pin['id']) => {
                const channel = Number(pinId)
                for (const id of this.sequences.keys()) {
                    const seq = this.sequences.get(id)
                    if (seq?.data.pins.some((p) => p.channel === channel)) {
                        const newPins = seq.data.pins.filter((p) => p.channel !== channel)
                        const newSeqData: SequenceData = { ...seq.data, pins: newPins }
                        db.sequencesDb.set(newSeqData, (err, seqData) => {
                            // TODO
                        })
                    }
                }
            })


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


    activate = (id: SequenceData['id'], cb: CallBack<void>) => {

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


    deactivate = (id: SequenceData['id'], cb: CallBack<void>) => {
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


    isActive = (id: SequenceData['id'], cb: CallBack<boolean>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }
        cb(null, seq.isActive())

    }


    active = (cb: CallBack<SequenceData['id'][]>) => {
        cb(null,
            [...this.sequences.entries()]
                .filter(([_, seq]) => seq.isActive())
                .map(([id]) => id)
        )
    }


    run = (id: SequenceData['id'], cb: CallBack<void>) => {
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



    isRunning = (id: SequenceData['id'], cb: CallBack<boolean>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }
        return seq.isRunning()
    }

    stop = (id: SequenceData['id'], cb: CallBack<void>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (!seq.isRunning()) {
            cb(null)
            return
        }

        seq.stop(cb)
    }

}



export default Scheduler