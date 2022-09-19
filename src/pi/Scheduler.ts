
import { AppDB, } from '../db'
import PinManager from './PinManager'
import Sequence from './Sequence'
import { PinDbType, SequenceDBType, CronDbType } from '../db'
import EventEmitter from 'events'
import { cronTrigger } from './utils'

interface SchedulerInterface<K> {
    isActive: (id: K,) => boolean
    run: (id: K) => Promise<void>
    running: () => K[]
    stop: (id: K) => Promise<void>
    channelsStatus: () => Promise<{ [key: PinDbType['channel']]: boolean }>
    getReservedPins: () => { pin: PinDbType, sequenceId: SequenceDBType['id'] }[]
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


        const runIfActive = (ids: CronDbType['CronSequence']) => {
            ids.forEach(({ sequence: { id } }) => {
                if (this.sequences.get(id)?.isActive()) {
                    this.sequences.get(id)?.run()
                }
            })
        }

        db.sequencesDb.list()
            .then(seqData => {
                seqData.forEach(d => this.sequences.set(d.id, new Sequence(d, this.pinManager, this.db)))
            })
            .then(() => cronTrigger(db, runIfActive))
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

        const eventHandler = (event: string) => (id: SequenceDBType['id']) => {
            this.emit(event, id)
            this.db.sequenceEventsDb.emit({
                sequenceId: id,
                eventType: event,
                date: new Date()
            })
        }
        // PinManager events pass through
        this.pinManager.on('channelChange', (...args) => this.emit('channelChange', ...args))
        this.pinManager.on('stop', eventHandler('stop'))
        this.pinManager.on('run', eventHandler('run'))
        this.pinManager.on('finish', eventHandler('finish'))
    }

    isActive = (id: SequenceDBType['id']) => {
        const seq = this.sequences.get(id)

        if (!seq) {
            throw new Error('Missing sequence or invalid sequence ID')
        }
        return seq.isActive()
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


    getReservedPins: () => { pin: PinDbType; sequenceId: number }[] = () => this.pinManager.getReservedPins()
    channelsStatus: () => Promise<{ [key: number]: boolean }> = () => this.pinManager.channelsStatus();
    running = () => this.pinManager.running();

}



export default Scheduler