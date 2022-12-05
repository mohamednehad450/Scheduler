import EventEmitter from "events";
import gpio, { config } from "./gpio";
import { PinDbType, SequenceDBType } from "../db";


interface GpioManager {
    run: (data: SequenceDBType) => string | void
    running: () => SequenceDBType['id'][]
    stop: (id: SequenceDBType['id']) => Promise<void>
    channelsStatus: () => Promise<{ [key: PinDbType['channel']]: boolean }>
    getReservedPins: () => { pin: PinDbType, sequenceId: SequenceDBType['id'] }[]
    cleanup?: () => Promise<void>
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

    private pins: { [key: PinDbType['channel']]: PinDbType } = {}

    // Map of reserved pins channels and the sequence ID
    private reservedPins: { [key: PinDbType['channel']]: SequenceDBType['id'] } = {}

    private orders: { [key: SequenceDBType['id']]: SequenceOrder } = {}


    constructor() {
        super()
    }


    start = async (pins: PinDbType[]) => {

        const { boardMode } = config
        gpio.setMode(boardMode)

        for (const pin of pins) {
            await gpio.promise.setup(
                pin.channel,
                pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW
            )
            this.pins[pin.channel] = pin
        }

        this.cleanup = async () => {
            await Promise.resolve([...Object.keys(this.orders)].map((id) => this.stop(Number(id))))
            await gpio.promise.destroy()
            this.pins = {}
            this.reservedPins = {}
            this.orders = {}
            this.cleanup = undefined
        }
    }

    cleanup?: () => Promise<void> = undefined

    // New pin has been defined
    insert = (pin: PinDbType) => {
        gpio.promise.setup(
            pin.channel,
            pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
        this.pins[pin.channel] = pin
    }


    // Updated old pin 
    update = (newPin: PinDbType) => {
        const oldPin = this.pins[newPin.channel]
        if (!oldPin) return
        this.pins[newPin.channel] = newPin
        if (oldPin.onState === newPin.onState) return

        const id = this.reservedPins[newPin.channel]
        if (id) {
            this.stop(id)
        }
        gpio.promise.write(newPin.channel, newPin.onState === "LOW")
    }


    // Remove old pin
    remove = (channel: PinDbType['channel']) => {
        const id = this.reservedPins[channel]
        if (id) {
            this.stop(id)
        }
        delete this.pins[channel]
    }



    running = () => {
        return [...Object.keys(this.orders)].map(Number)
    }


    run = (data: SequenceDBType) => {
        if (this.orders[data.id]) {
            this.emit('failed', 'run', `Sequence: ${data.name} is already.`)
            return `Sequence: ${data.name} is already.`
        }
        for (const order of data.orders) {
            if (this.reservedPins[order.channel]) {
                this.emit('failed', 'run', `Pin: ${order.Pin.label} (channel: ${order.channel}) is reserved.`)
                return `Pin: ${order.Pin.label} (channel: ${order.channel}) is reserved.`
            }
            if (!this.pins[order.channel]) {
                this.emit('failed', 'run', `Pin: ${order.Pin.label} (channel: ${order.channel}) is not loaded, Reset PinManager.`)
                return `Pin: ${order.Pin.label} (channel: ${order.channel}) is not loaded, Reset PinManager.`
            }
        }


        data.orders.map(p => { this.reservedPins[p.channel] = data.id })

        const runOrders: RunOrder[] = data.orders.map(order => {
            const pin = this.pins[order.channel]
            if (!pin) throw new Error('Impossible State')

            return {
                pin,
                startTimer: setTimeout(() => {
                    gpio.promise.write(pin.channel, pState[pin.onState])
                        .then(() => this.emit('channelChange', { [pin.channel]: true }))
                        .catch(err => {
                            // TODO
                        })

                }, order.offset),
                closeTimer: setTimeout(() => {
                    gpio.promise.write(order.channel, !pState[pin.onState])
                        .then(() => this.emit('channelChange', { [pin.channel]: false }))
                        .catch(err => {
                            // TODO
                        })

                }, order.duration + order.offset)
            }
        })
        const maxDuration = Math.max(...data.orders.map(r => r.duration + r.offset)) + 10
        this.orders[data.id] = {
            runOrders,
            clearTimer: setTimeout(
                () => {
                    runOrders.forEach(r => delete this.reservedPins[r.pin.channel])
                    delete this.orders[data.id]
                    this.emit('finish', data.id)
                },
                maxDuration
            )
        }
        this.emit('run', data.id)
    }


    stop = async (id: SequenceDBType['id']) => {

        const seqOrder = this.orders[id]
        if (!seqOrder) {
            return
        }

        const pins = new Map<PinDbType['channel'], PinDbType>()
        seqOrder.runOrders.forEach(({ startTimer, closeTimer, pin, }) => {
            clearTimeout(startTimer)
            clearTimeout(closeTimer)
            pins.set(pin.channel, pin)
            delete this.reservedPins[pin.channel]
        })
        const status: { [key: PinDbType['channel']]: boolean } = {}
        clearTimeout(seqOrder.clearTimer);
        await Promise.resolve([...pins.values()].map((pin) => {
            status[pin.channel] = false
            return gpio.promise.write(pin.channel, !pState[pin.onState])
        }))
        delete this.orders[id]
        this.emit('channelChange', status)
        this.emit('stop', id)
    };

    channelsStatus = async () => {
        const status: { [key: PinDbType['channel']]: boolean } = {}
        for (const channel of [...Object.keys(this.pins)]) {
            const pin = this.pins[Number(channel)]
            const HIGH = await gpio.promise.read(pin.channel)
                .catch(err => {
                    // TODO
                });
            status[pin.channel] = (pin.onState === "HIGH" ? !!HIGH : !HIGH)
        }
        return status
    };

    getReservedPins = () => {
        return [...Object.keys(this.reservedPins)].map((channel) => {
            const pin = this.pins[Number(channel)]
            const sequenceId = this.reservedPins[Number(channel)]
            if (!pin) {
                throw new Error('Invalid State: Unknown channel reserved ')
                // TODO
            }
            return { pin, sequenceId }
        })
    }
}

export default PinManager