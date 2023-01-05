
import { AppDB, } from '../db'
import PinManager from './PinManager'
import CronManager from './CronManager'
import { PinDbType, SequenceDBType, CronDbType } from '../db'
import EventEmitter from 'events'
import { runSequence, triggerCron } from './utils'

interface SchedulerInterface<K> {
    start: () => Promise<void>
    run: (id: K) => Promise<void>
    running: () => K[]
    stop: (id: K) => Promise<void>
    channelsStatus: () => Promise<{ [key: PinDbType['channel']]: boolean }>
    getReservedPins: () => { pin: PinDbType, sequenceId: SequenceDBType['id'] }[]
    resetPinManager: () => Promise<void>
}

class Scheduler extends EventEmitter implements SchedulerInterface<SequenceDBType['id']> {

    pinManager: PinManager
    db: AppDB
    cleanup?: () => void


    constructor(db: AppDB) {
        super()
        this.db = db
        this.pinManager = new PinManager()
    }


    start = async () => {

        const [pins, cronTriggers] = await this.db.prisma.$transaction([
            this.db.prisma.pin.findMany(),
            this.db.prisma.cron.findMany({ select: { cron: true, id: true } }),
        ])

        await this.pinManager.start(pins)

        const cronManager = new CronManager(
            cronTriggers.map(({ id, cron }) => ({ id, cron })),
            (id) => triggerCron(id, this.db, this.pinManager)
        )


        const insertCron = ({ id, cron }: CronDbType) => {
            cronManager.insert(id, cron)
            cronManager.start(id)
        }
        const updateCron = ({ id, cron }: CronDbType) => {
            cronManager.update(id, cron)
        }
        const removeCron = (id: CronDbType['id']) => {
            cronManager.remove(id)
        }


        // PinDb life cycle                
        this.db.pinsDb.addListener('insert', this.pinManager.insert)
        this.db.pinsDb.addListener('update', this.pinManager.update)
        this.db.pinsDb.addListener('remove', this.pinManager.remove)


        // CronDB life cycle
        this.db.cronDb.addListener('update', updateCron)
        this.db.cronDb.addListener('insert', insertCron)
        this.db.cronDb.addListener('remove', removeCron)


        const eventHandler = (event: 'run' | 'stop' | 'finish' | 'activate' | 'deactivate') => (id: SequenceDBType['id']) => {
            const date = Date()
            this.emit(event, id, date)

            setTimeout(() => {
                this.db.sequenceEventsDb.emit({
                    sequenceId: id,
                    eventType: event,
                    date,
                })
                    .catch(err => {
                        console.error(`Failed to emit SequenceEvent (id:${id}, event:${event}), database error`, err)
                        // TODO
                    })
            }, 100)
        }

        const channelChange = (...args: any) => this.emit('channelChange', ...args)
        const stop = eventHandler('stop')
        const run = eventHandler('run')
        const finish = eventHandler('finish')


        // PinManager events pass through
        this.pinManager.addListener('channelChange', channelChange)
        this.pinManager.addListener('stop', stop)
        this.pinManager.addListener('run', run)
        this.pinManager.addListener('finish', finish)

        // Start All Cron jobs
        cronManager.startAll()

        this.cleanup = () => {

            // Clean PinDb life cycle                
            this.db.pinsDb.removeListener('insert', this.pinManager.insert)
            this.db.pinsDb.removeListener('update', this.pinManager.update)
            this.db.pinsDb.removeListener('remove', this.pinManager.remove)

            // Clean CronDB life cycle
            this.db.cronDb.removeListener('update', updateCron)
            this.db.cronDb.removeListener('insert', insertCron)
            this.db.cronDb.removeListener('remove', removeCron)

            // Clean PinManager events pass through
            this.pinManager.removeListener('channelChange', channelChange)
            this.pinManager.removeListener('stop', stop)
            this.pinManager.removeListener('run', run)
            this.pinManager.removeListener('finish', finish)

            // Stop all Cron jobs
            cronManager.stopAll()
        }
    }




    run = async (id: SequenceDBType['id']) => {
        const sequence = await this.db.prisma.sequence
            .findUnique({
                where: { id },
                include: { orders: { include: { Pin: { select: { label: true } } } } },
            })
        const result = sequence && runSequence(sequence, this.pinManager, this.db)
        if (result) {
            result
                .catch(err => console.error("Failed to update lasRun, err: ", err))
        }
    }
    stop = async (id: SequenceDBType['id']) => this.pinManager.stop(id)
    resetPinManager = async () => {
        this.pinManager.cleanup && await this.pinManager.cleanup()
        const pins = await this.db.pinsDb.list()
        await this.pinManager.start(pins)
    }
    getReservedPins: () => { pin: PinDbType; sequenceId: number }[] = () => this.pinManager.getReservedPins()
    channelsStatus: () => Promise<{ [key: number]: boolean }> = () => this.pinManager.channelsStatus();
    running = () => this.pinManager.running();

}



export default Scheduler