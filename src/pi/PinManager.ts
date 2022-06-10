import moment, { Duration } from "moment";
import { AppDB } from "../db";
import { Gpio, GpioConfig } from "./gpio";
import { Pin, SequenceData } from "./utils";


type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface GpioManager {
    isRunning: (id: SequenceData['id'],) => boolean
    run: (data: SequenceData, cb: CallBack<void>) => void
    running: (cb: CallBack<SequenceData['id'][]>) => void
    stop: (id: SequenceData['id'], cb: CallBack<void>) => void
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
    pins: Map<Pin['channel'], Pin>

    // Map of reserved pins channels and the sequence ID
    reservedPins: Map<Pin['channel'], SequenceData['id']>

    orders: Map<SequenceData['id'], SequenceOrder>

    constructor(gpio: Gpio, config: GpioConfig, db: AppDB['pinsDb']) {
        this.config = config
        this.gpio = gpio
        this.db = db
        this.pins = new Map()
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
                (p) => {
                    gpio.setup(
                        p.channel,
                        p.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
                    this.pins.set(p.channel, p)
                }
            )

            // New pin has been defined
            db.addListener('insert', (pin: Pin) => {
                gpio.setup(
                    pin.channel,
                    pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
                this.pins.set(pin.channel, pin)
            })

            // Old pin has been updated
            db.addListener('update', (newPin: Pin) => {
                const id = this.reservedPins.get(newPin.channel)
                if (id) {
                    this.stop(id, (err) => {
                        if (err) {
                            // TODO
                            return
                        }
                        this.pins.set(newPin.channel, newPin)
                    })
                    return
                }
                this.pins.set(newPin.channel, newPin)
            })
            db.addListener('remove', (pinId: Pin['id']) => {
                const channel = Number(pinId)
                const id = this.reservedPins.get(channel)
                if (id) {
                    this.stop(id, (err) => {
                        if (err) {
                            // TODO
                            return
                        }
                        this.pins.delete(channel)
                    })
                    return
                }
                this.pins.delete(channel)
            })
        })


    }

    isRunning = (id: SequenceData['id']) => {
        return this.orders.has(id)
    };

    running = (cb: CallBack<SequenceData['id'][]>) => {
        cb(null, [...this.orders.keys()])
    }

    run = (data: SequenceData, cb: CallBack<void>) => {
        for (const p of data.orders) {
            if (this.reservedPins.has(p.channel)) {
                cb(new Error(`channel ${p.channel} is reserved by id: (${this.reservedPins.get(p.channel)})`))
                return
            }
            if (!this.pins.has(p.channel)) {
                cb(new Error(`channel ${p.channel} is not defined`))
                return
            }
        }

        data.orders.map(p => this.reservedPins.set(p.channel, data.id))

        const time = new Date()
        const runOrders: RunOrder[] = data.orders.map(p => {
            const pin = this.pins.get(p.channel)
            if (!pin) throw new Error()

            const duration = moment.duration(p.duration)
            const offset = moment.duration(p.offset)
            return {
                pin,
                duration,
                offset,
                startTimer: setTimeout(() => {
                    this.gpio.write(pin.channel, pState[pin.onState], () => {
                        // TODO
                    })
                }, offset.asMilliseconds()),
                closeTimer: setTimeout(() => {
                    this.gpio.write(p.channel, !pState[pin.onState], () => {
                        // TODO
                    })
                }, moment.duration(duration).add(offset).asMilliseconds())
            }
        })
        this.orders.set(data.id, {
            runOrders,
            startTime: time,
            clearTimer: setTimeout(
                () => {
                    runOrders.forEach(r => this.reservedPins.delete(r.pin.channel))
                    this.orders.delete(data.id)
                },
                Math.max(...runOrders.map(r => moment.duration(r.duration).add(r.offset).asMilliseconds())) + 10
            )
        })
    }

    stop = (id: SequenceData['id'], cb: CallBack<void>) => {
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
            if (err) {
                cb(err)
                return
            }
            if (!pins || pins.length === 0) {
                cb(null, [])
                return
            }
            pins && pins.forEach((p) => {
                this.gpio.read(p.channel, (err, HIGH) => {
                    err ?
                        status.push({ p, running: false, err: err }) :
                        status.push({ p, running: p.onState === "HIGH" ? !!HIGH : !HIGH, err: null })
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