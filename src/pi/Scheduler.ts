
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

        db.sequencesDb.list().then(seqData => {
            seqData && seqData.forEach(d => this.sequences.set(d.id, new Sequence(d, this.pinManager)))
        })
            .catch(err => {
                // TODO
            })


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

            oldSeq?.deactivate()
            oldSeq?.stop()

            isActive && newSeq.activate()
            isRunning && newSeq.run()

            this.sequences.set(seq.id, newSeq)
        })

        // Old sequence has been removed
        db.sequencesDb.addListener('remove', (seqId: SequenceData['id']) => {
            const oldSeq = this.sequences.get(seqId)

            oldSeq?.deactivate()
            oldSeq?.stop()

            this.sequences.delete(seqId)
        })

        db.pinsDb.addListener('remove', (channel: Pin['id']) => {
            for (const id of this.sequences.keys()) {
                const seq = this.sequences.get(id)
                if (seq?.data.orders.some((p) => p.channel === channel)) {

                    const activated = seq.isActive()

                    seq.stop()
                    seq.deactivate()

                    const newPins = seq.data.orders.filter((p) => p.channel !== channel)
                    const newSeqData: SequenceData = { ...seq.data, orders: newPins }

                    db.sequencesDb.set(newSeqData)
                        .then(newSeqData => {
                            const newSeq = new Sequence(newSeqData, pinManager)
                            activated && newSeq.activate()
                            this.sequences.set(newSeqData.id, newSeq)
                        })
                        .catch(err => {
                            // TODO
                        })
                }
            }
        })
        db.activeSequences.list()
            .then(ids => {
                ids.forEach(({ id }) => this.activate(id, (err) => {
                    // TODO
                }))
            })
            .catch(err => {
                // TODO
            })

    }


    activate = (id: SequenceData['id'], cb: CallBack<void>) => {

        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (!seq.isActive()) {
            seq.activate()
            this.db.activeSequences.insert({ id: seq.data.id })
                .then(() => cb(null))
                .catch(cb)
        }
    };


    deactivate = (id: SequenceData['id'], cb: CallBack<void>) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            cb(new Error('Missing sequence or invalid sequence ID'))
            return
        }

        if (seq.isActive()) {
            seq.deactivate()
            this.db.activeSequences.remove(seq.data.id)
                .then(_ => cb(null))
                .catch(cb)
        }
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
        seq.run()
        cb(null)
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

        seq.stop()
        cb(null)
    }

}



export default Scheduler