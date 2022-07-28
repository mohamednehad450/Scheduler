import EventEmitter from "events";
import { AppDB } from "../db";
import gpio, { config } from "./gpio";
import { PinDbType, SequenceDBType } from "../db";


interface GpioManager {
    isRunning: (id: SequenceDBType['id'],) => boolean
    run: (data: SequenceDBType) => void
    running: () => SequenceDBType['id'][]
    stop: (id: SequenceDBType['id']) => void
    runningChannel: () => Promise<PinDbType['channel'][]>
    getReservedPins: () => { pin: PinDbType, sequenceId: SequenceDBType['id'] }[]
    rest: () => void
}

// Used to implement the 'Normally open pin state'
const pState: { [key in PinDbType['onState']]: boolean } = {
    HIGH: true,
    LOW: false,
}

type RunOrder = {
    pin: PinDbType
    startTimer: NodeJS.Timeout
    closeTimer: NodeJS.Timeout
}

type SequenceOrder = {
    runOrders: RunOrder[]
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
            if (!pin) {
                // TODO
                return
            }
            const on = pin.onState === "HIGH" ? !!HIGH : !HIGH
            pin && this.emit('channelChange', pin.channel, on)
        })

    }


    isRunning = (id: SequenceDBType['id']) => {
        return this.orders.has(id)
    };


    running = () => {
        return [...this.orders.keys()]
    }


    run = (data: SequenceDBType) => {
        if (this.orders.has(data.id)) {
            this.emit('failed', 'run', data, `Sequence: ${data.name} is already.`)
            return
        }
        for (const order of data.orders) {
            if (this.reservedPins.has(order.channel)) {
                this.emit('failed', 'run', data, `Pin: ${order.Pin.label} (channel: ${order.channel}) is reserved.`)
                return
            }
            if (!this.pins.has(order.channel)) {
                this.emit('failed', 'run', data, `Pin: ${order.Pin.label} (channel: ${order.channel}) is not loaded, reset PinManager.`)
                return
            }
        }


        data.orders.map(p => this.reservedPins.set(p.channel, data.id))

        const runOrders: RunOrder[] = data.orders.map(order => {
            const pin = this.pins.get(order.channel)
            if (!pin) throw new Error('Impossible State')

            return {
                pin,
                startTimer: setTimeout(() => {

                    gpio.promise.write(pin.channel, pState[pin.onState])
                        .catch(err => {
                            // TODO
                        })

                }, order.offset),
                closeTimer: setTimeout(() => {

                    gpio.promise.write(order.channel, !pState[pin.onState])
                        .catch(err => {
                            // TODO
                        })

                }, order.duration + order.offset)
            }
        })
        const maxDuration = Math.max(...data.orders.map(r => r.duration + r.offset)) + 10
        this.orders.set(data.id, {
            runOrders,
            clearTimer: setTimeout(
                () => {
                    runOrders.forEach(r => this.reservedPins.delete(r.pin.channel))
                    this.orders.delete(data.id)
                    this.emit('finish', data.id)
                },
                maxDuration
            )
        })
        this.emit('run', data.id)
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

    runningChannel = async () => {
        const status: PinDbType['channel'][] = []
        for (const [_, pin] of this.pins) {
            const HIGH = await gpio.promise.read(pin.channel)
                .catch(err => {
                    // TODO
                });
            (pin.onState === "HIGH" ? !!HIGH : !HIGH) && status.push(pin.channel)
        }
        return status
    };

    getReservedPins = () => {
        return [...this.reservedPins.entries()].map(([channel, sequenceId]) => {
            const pin = this.pins.get(channel)
            if (!pin) {
                throw new Error('Invalid State: Unknown channel reserved ')
            }
            return { pin, sequenceId }
        })
    }

    rest = () => {
        // TODO
    };
}

export default PinManager