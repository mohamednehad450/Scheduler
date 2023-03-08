import { AppDB } from "../db";
import { BaseSequence, Cron } from '../db/types'
import PinManager from "./PinManager";
import gpio from 'rpi-gpio'


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


const triggerCron = (cronId: Cron['id'], db: AppDB, pm: PinManager) => {

    const cronSequences = db.cronSequenceLink.db.findBy(cs => cs.cronId === cronId)
    const sequences = cronSequences.map(cs => db.sequenceCRUD.db.findByKey(cs.sequenceId))

    const shouldRun = sequences.filter(s => s && s.active) as BaseSequence[]
    shouldRun.sort((s1, s2) => {
        if (!s1.lastRun && s2.lastRun) return 0
        if (!s1.lastRun) return 1
        if (!s2.lastRun) return -1
        return Date.parse(s1.lastRun) > Date.parse(s2.lastRun) ? 1 : -1
    })


    const running = shouldRun.map(s => runSequence(s, pm, db)).filter(result => !(typeof result === 'string'))
    return Promise.all(running)
        .catch(err => {
            console.error(`Failed to update sequences on Cronjob trigger (id:${cronId})`, err)
        })
}

const runSequence = (s: BaseSequence, pm: PinManager, db: AppDB) => {
    const err = pm.run(s)
    if (err) return err
    return db.sequenceCRUD.update(s.id, { lastRun: new Date().toISOString() })
}

const activationLogger = (initialStatus: { [key: BaseSequence['id']]: boolean }, db: AppDB) => {
    const status = initialStatus
    const updater = async (seq: BaseSequence) => {
        if (seq.active !== status[seq.id]) {
            status[seq.id] = seq.active
            await db.sequenceEventCRUD.emit({
                eventType: seq.active ? "activate" : "deactivate",
                sequenceId: seq.id,
                date: new Date().toISOString()
            })
        }
    }
    db.sequenceCRUD.addListener('update', updater)
    return () => db.sequenceCRUD.removeListener('update', updater)
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
        // logArgs('read', c, ...args)
        return !!channelState.get(c)
    }

    gpio.promise.write = async (c, bool, ...args) => {
        channelState.set(c, bool)
        // logArgs('write', c, bool, args)
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