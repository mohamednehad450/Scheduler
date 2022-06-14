
import { AppDB } from '../db'
import PinManager from './PinManager'
import Sequence from './Sequence'
import { Pin, SequenceData, } from './utils'


interface SchedulerInterface {
    activate: (id: SequenceData['id']) => Promise<void>
    deactivate: (id: SequenceData['id']) => Promise<void>
    isActive: (id: SequenceData['id'],) => boolean
    active: () => SequenceData['id'][]
    run: (id: SequenceData['id']) => Promise<void>
    stop: (id: SequenceData['id']) => Promise<void>
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
            seqData.forEach(d => this.sequences.set(d.id, new Sequence(d, this.pinManager)))
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

                    seq.stop()
                    seq.deactivate()

                    const newPins = seq.data.orders.filter((p) => p.channel !== channel)
                    const newSeqData: SequenceData = { ...seq.data, orders: newPins }

                    db.sequencesDb.set(newSeqData)
                        .catch(err => {
                            // TODO
                        })
                }
            }
        })
        db.activeSequences.list()
            .then(ids => {
                ids.forEach(({ id }) => this.activate(id))
            })
            .catch(err => {
                // TODO
            })

    }


    activate = async (id: SequenceData['id']) => {

        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        seq.activate()
        await this.db.activeSequences.insert({ id: seq.data.id })
    };


    deactivate = async (id: SequenceData['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        seq.deactivate()
        await this.db.activeSequences.remove(seq.data.id)
    };


    isActive = (id: SequenceData['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }

        return seq.isActive()
    }


    active = () => {
        return [...this.sequences.values()]
            .filter(s => s.isActive())
            .map((s => s.data.id))
    }


    run = async (id: SequenceData['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        seq.run()
    }

    stop = async (id: SequenceData['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        seq.stop()
    }
}



export default Scheduler