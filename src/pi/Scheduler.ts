
import { AppDB } from '../db'
import PinManager, { PinStatus } from './PinManager'
import Sequence from './Sequence'
import { PinDbType, SequenceDBType } from '../db'
import EventEmitter from 'events'

interface SchedulerInterface<K> {
    isActive: (id: K,) => boolean
    active: () => K[]
    run: (id: K) => Promise<void>
    running: () => K[]
    stop: (id: K) => Promise<void>
    pinsStatus: () => Promise<PinStatus[]>
}

class Scheduler extends EventEmitter implements SchedulerInterface<SequenceDBType['id']> {

    pinManager: PinManager
    sequences: Map<SequenceDBType['id'], Sequence>
    db: AppDB



    constructor(db: AppDB) {
        super()
        this.db = db
        this.pinManager = new PinManager(db.pinsDb)
        this.sequences = new Map()

        db.sequencesDb.list().then(seqData => {
            seqData.forEach(d => this.sequences.set(d.id, new Sequence(d, this.pinManager, this.db)))
        })
            .catch(err => {
                // TODO
            })


        // New sequence added
        db.sequencesDb.addListener('insert', (newSeq: SequenceDBType) => {
            this.sequences.set(newSeq.id, new Sequence(newSeq, this.pinManager, this.db))
        })

        // Old sequence has been removed
        db.sequencesDb.addListener('remove', (seqId: SequenceDBType['id']) => {
            this.sequences.delete(seqId)
        })

        db.pinsDb.addListener('remove', (channel: PinDbType['channel']) => {

            for (const id of this.sequences.keys()) {
                const seq = this.sequences.get(id)
                if (seq?.data.orders.some((p) => p.channel === channel)) {
                    // HACK: Trigger the update event to update effected sequences
                    db.sequencesDb.update(id, {})
                }
            }
        })

        // PinManager events pass through
        this.pinManager.on('pinChange', (...args) => this.emit('pinChange', ...args))
        this.pinManager.on('stop', (...args) => this.emit('stop', ...args))
        this.pinManager.on('run', (...args) => this.emit('run', ...args))
    }

    isActive = (id: SequenceDBType['id']) => {
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


    run = async (id: SequenceDBType['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        seq.run()
    }

    stop = async (id: SequenceDBType['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        seq.stop()
    }


    pinsStatus = () => this.pinManager.pinsStatus();
    running = () => this.pinManager.running();

}



export default Scheduler