import moment, { Duration } from "moment";
import { AppDB } from "../db";
import { Gpio, GpioConfig } from "./gpio";
import { ID, Pin, SequenceData } from "./utils";


type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface GpioManager {
    isRunning: (id: ID, cb: CallBack<boolean>) => void
    run: (data: SequenceData, cb: CallBack<void>) => void
    running: (cb: CallBack<ID[]>) => void
    stop: (id: ID, cb: CallBack<void>) => void
    pinsStatus: (cb: CallBack<{ p: Pin, running: boolean, err: Error | null | undefined }[]>) => void
    rest: (cb: CallBack<void>) => void

}

// Used to implement the 'Normally open pin state'
const pState: { [key in Pin['onState']]: boolean } = {
    HIGH: true,
    LOW: false,
}

type RunOrder = {
    pin: Pin
    duration: Duration
    offset: Duration
    startTimer: NodeJS.Timeout
    closeTimer: NodeJS.Timeout
}

type SequenceOrder = {
    runOrders: RunOrder[]
    startTime: Date
    clearTimer: NodeJS.Timeout
}



class PinManager implements GpioManager {

    gpio: Gpio
    config: GpioConfig
    db: AppDB['pinsDb']

    reservedPins: Map<Pin['channel'], ID>

    orders: Map<ID, SequenceOrder>

    constructor(gpio: Gpio, config: GpioConfig, db: AppDB['pinsDb']) {
        this.config = config
        this.gpio = gpio
        this.db = db
        this.reservedPins = new Map()
        this.orders = new Map()

        const { boardMode } = this.config

        this.db.list((err, pins) => {
            if (err) {
                // TODO
                return
            }
            this.gpio.setMode(boardMode)
            pins?.forEach(
                (p) => gpio.setup(
                    p.channel,
                    p.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
            )
        })


    }

    isRunning = (id: ID, cb: CallBack<boolean>) => {
        cb(null, this.orders.has(id))
    };

    running = (cb: CallBack<ID[]>) => {
        cb(null, [...this.orders.keys()])
    }

    run = (data: SequenceData, cb: CallBack<void>) => {
        for (const p of data.pins) {
            const id = this.reservedPins.get(p.pin.channel)
            if (id) {
                cb(new Error(`channel ${p.pin.channel} is reserved by id: (${id})`))
                return
            }
        }

        data.pins.map(p => this.reservedPins.set(p.pin.channel, data.id))

        const time = new Date()
        const runOrders: RunOrder[] = data.pins.map(p => {
            const duration = moment.duration(p.duration)
            const offset = moment.duration(p.offset)
            return {
                pin: p.pin,
                duration,
                offset,
                startTimer: setTimeout(() => {
                    this.gpio.write(p.pin.channel, pState[p.pin.onState], () => {
                        // TODO
                    })
                }, offset.asMilliseconds()),
                closeTimer: setTimeout(() => {
                    this.gpio.write(p.pin.channel, !pState[p.pin.onState], () => {
                        // TODO
                    })
                }, moment.duration(duration).add(offset).asMilliseconds())
            }
        })
        this.orders.set(data.id, {
            runOrders,
            startTime: time,
            clearTimer: setTimeout(
                () => runOrders.forEach(r => this.reservedPins.delete(r.pin.channel)),
                Math.max(...runOrders.map(r => moment.duration(r.duration).add(r.offset).asMilliseconds())) + 10
            )
        })
    }

    stop = (id: ID, cb: CallBack<void>) => {
        const seqOrder = this.orders.get(id)
        if (!seqOrder) {
            cb(null)
            return
        }
        seqOrder.runOrders.forEach(({ startTimer, closeTimer, pin, }) => {
            clearTimeout(startTimer)
            clearTimeout(closeTimer)
            this.gpio.write(pin.channel, !pState[pin.onState], () => { })
            this.reservedPins.delete(pin.channel)
        })
        clearTimeout(seqOrder.clearTimer)
        this.orders.delete(id)
        cb(null)

    };

    pinsStatus = (cb: CallBack<{ p: Pin, running: boolean, err: Error | null | undefined }[]>) => {
        const status: {
            p: Pin,
            running: boolean
            err: Error | null | undefined
        }[] = []
        this.db.list((err, pins) => {
            pins && pins.forEach((p) => {
                this.isRunning(p.id, (err, running) => {
                    err ?
                        status.push({ p, running: false, err: err }) :
                        status.push({ p, running: !!running, err: null })
                    status.length === pins.length && cb(null, status)
                })
            })
        })
    };

    rest = (cb: CallBack<void>) => {
        // TODO
    };
}

export default PinManager