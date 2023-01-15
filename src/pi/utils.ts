import { AppDB, CronDbType, SequenceDBType } from "../db";
import PinManager, { RunnableSequence } from "./PinManager";
import gpio from 'rpi-gpio'
import { sequenceInclude } from "../db/sequenceDb";

type GpioConfig = {
    validPins: number[],
    boardMode: typeof gpio.promise.MODE_BCM,
}

const config: GpioConfig = {
    validPins: [
        3,
        5,
        7,
        8,
        10,
        11,
        12,
        13,
        15,
        16,
        18,
        19,
        21,
        22,
        23,
        24,
        26,
        29,
        31,
        32,
        33,
        35,
        36,
        37,
        38,
        40
    ],
    boardMode: gpio.MODE_RPI
}


const triggerCron = (id: CronDbType['id'], db: AppDB, pm: PinManager) => {

    db.prisma.sequence.findMany({
        where: { CronSequence: { some: { cronId: id }, }, active: true },
        include: { orders: { include: { Pin: { select: { label: true } } } } },
        orderBy: { lastRun: 'asc' }
    })
        .then(sequences => {
            const updates: any = sequences.map(s => runSequence(s, pm, db)).filter(u => !(typeof u === "string"))
            return db.prisma.$transaction(updates)
        })
        .catch(err => {
            console.error(`Failed to trigger Cronjob (id:${id}), database error`, err)
            // TODO
        })
}

const runSequence = (s: RunnableSequence, pm: PinManager, db: AppDB) => {
    const err = pm.run(s)
    if (err) return err
    const lastRun = new Date()
    return db.prisma.sequence.update({
        where: { id: s.id },
        data: { lastRun },
        include: sequenceInclude,
    })
}

const activationLogger = (initialStatus: { [key: SequenceDBType['id']]: boolean }, db: AppDB) => {
    const status = initialStatus
    const updater = async (seq: SequenceDBType) => {
        if (seq.active !== status[seq.id]) {
            status[seq.id] = seq.active
            await db.sequenceEventsDb.emit({
                eventType: seq.active ? "activate" : "deactivate",
                sequenceId: seq.id,
                date: new Date()
            })
        }
    }
    db.sequencesDb.addListener('update', updater)
    return () => db.sequencesDb.removeListener('update', updater)
}



function logArgs(func: string, ...args: any) { console.log({ time: new Date().toLocaleTimeString(), func, args: JSON.stringify(args) }) }

if (process.env.NODE_ENV === 'development') {

    console.warn('rpi-gpio running in dev mode');

    const channelState = new Map<number, boolean>()

    gpio.promise.destroy = async (...args) => logArgs('destroy', args)

    gpio.promise.setup = async (c, state, ...args) => {
        channelState.set(c, state === "high")
        logArgs('setup', c, state, args)
        return true
    }
    gpio.setMode = (...args) => logArgs('setMode', args)

    gpio.promise.read = async (c, ...args) => {
        logArgs('read', c, ...args)
        return !!channelState.get(c)
    }

    gpio.promise.write = async (c, bool, ...args) => {
        channelState.set(c, bool)
        logArgs('write', c, bool, args)
        gpio.emit('change', c, bool)
    }
}

process.on('SIGTERM', async () => await gpio.promise.destroy())

export {
    gpio,
    config,
    triggerCron,
    runSequence,
    activationLogger
}
export type { GpioConfig }