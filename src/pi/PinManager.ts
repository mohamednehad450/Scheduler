import EventEmitter from "events";
import moment, { Duration } from "moment";
import { AppDB } from "../db";
import gpio, { config } from "./gpio";
import { PinDbType, SequenceDBType } from "../db";


export type PinStatus = {
    pin: PinDbType,
    running: boolean,
    err: Error | null | undefined,
    reservedBy?: SequenceDBType['id']
}
interface GpioManager {
    isRunning: (id: SequenceDBType['id'],) => boolean
    run: (data: SequenceDBType) => void
    running: () => SequenceDBType['id'][]
    stop: (id: SequenceDBType['id']) => void
    pinsStatus: () => Promise<PinStatus[]>
    rest: () => void
}

// Used to implement the 'Normally open pin state'
const pState: { [key in PinDbType['onState']]: boolean } = {
    HIGH: true,
    LOW: false,
}

type RunOrder = {
    pin: PinDbType
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



class PinManager extends EventEmitter implements GpioManager {

    db: AppDB['pinsDb']
    pins: Map<PinDbType['channel'], PinDbType>

    // Map of reserved pins channels and the sequence ID
    reservedPins: Map<PinDbType['channel'], SequenceDBType['id']>

    orders: Map<SequenceDBType['id'], SequenceOrder>

    constructor(db: AppDB['pinsDb']) {
        super()
        this.db = db
        this.pins = new Map()
        this.reservedPins = new Map()
        this.orders = new Map()

        const { boardMode } = config

        this.db.list()
            .then(pins => {
                gpio.setMode(boardMode)
                pins?.forEach(
                    (p) => {
                        gpio.promise.setup(
                            p.channel,
                            p.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
                        this.pins.set(p.channel, p)
                    }
                )
            })
            .catch(err => {
                // TODO
            })


        // New pin has been defined
        db.addListener('insert', (pin: PinDbType) => {
            gpio.promise.setup(
                pin.channel,
                pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
            this.pins.set(pin.channel, pin)
        })

        // Old pin has been updated
        db.addListener('update', (newPin: PinDbType) => {
            const oldPin = this.pins.get(newPin.channel)
            if (!oldPin) return
            this.pins.set(newPin.channel, newPin)
            if (oldPin.onState === newPin.onState) return

            const id = this.reservedPins.get(newPin.channel,)
            if (id) {
                this.stop(id)
            }
            gpio.promise.write(newPin.channel, newPin.onState === "LOW")

        })

        // Old pin removed
        db.addListener('remove', (channel: PinDbType['channel']) => {
            const id = this.reservedPins.get(channel)
            if (id) {
                this.stop(id)
            }
            this.pins.delete(channel)
        })

        gpio.addListener('change', (channel, HIGH) => {
            const pin = this.pins.get(channel)
            pin && this.emit('pinChange', pin.channel, pin.onState === "HIGH" ? !!HIGH : !HIGH, this.reservedPins.get(channel))
        })

    }


    isRunning = (id: SequenceDBType['id']) => {
        return this.orders.has(id)
    };


    running = () => {
        return [...this.orders.keys()]
    }


    run = (data: SequenceDBType) => {
        for (const p of data.orders) {
            if (this.reservedPins.has(p.channel)) {
                throw new Error(`channel ${p.channel} is reserved by id: (${this.reservedPins.get(p.channel)})`)
            }
            if (!this.pins.has(p.channel)) {
                throw new Error(`channel ${p.channel} is not defined`)
            }
        }


        data.orders.map(p => this.reservedPins.set(p.channel, data.id))

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

                    gpio.promise.write(pin.channel, pState[pin.onState])
                        .catch(err => {
                            // TODO
                        })

                }, offset.asMilliseconds()),
                closeTimer: setTimeout(() => {

                    gpio.promise.write(p.channel, !pState[pin.onState])
                        .catch(err => {
                            // TODO
                        })

                }, moment.duration(duration).add(offset).asMilliseconds())
            }
        })
        const time = new Date()
        const duration = Math.max(...runOrders.map(r => moment.duration(r.duration).add(r.offset).asMilliseconds())) + 10
        this.orders.set(data.id, {
            runOrders,
            startTime: time,
            clearTimer: setTimeout(
                () => {
                    runOrders.forEach(r => this.reservedPins.delete(r.pin.channel))
                    this.orders.delete(data.id)
                    this.emit('stop', data.id)
                },
                Math.max(...runOrders.map(r => moment.duration(r.duration).add(r.offset).asMilliseconds())) + 10
            )
        })
        this.emit('run', data.id, time, duration)
    }


    stop = (id: SequenceDBType['id']) => {

        const seqOrder = this.orders.get(id)
        if (!seqOrder) {
            return
        }

        seqOrder.runOrders.forEach(({ startTimer, closeTimer, pin, }) => {
            clearTimeout(startTimer)
            clearTimeout(closeTimer)
            gpio.promise.write(pin.channel, !pState[pin.onState])
            this.reservedPins.delete(pin.channel)
        })
        clearTimeout(seqOrder.clearTimer)
        this.orders.delete(id)
        this.emit('stop', id)
    };

    pinsStatus = async () => {
        const status: PinStatus[] = []
        for (const [_, pin] of this.pins) {
            const HIGH = await gpio.promise.read(pin.channel)
                .catch(err => {
                    status.push({
                        pin,
                        running: false,
                        err: err,
                        reservedBy: this.reservedPins.get(pin.channel)
                    })
                })
            status.push({
                pin,
                running: pin.onState === "HIGH" ? !!HIGH : !HIGH,
                err: null,
                reservedBy: this.reservedPins.get(pin.channel)
            })
        }
        return status
    };

    rest = () => {
        // TODO
    };
}

export default PinManager