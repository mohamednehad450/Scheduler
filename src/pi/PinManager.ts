import moment, { Duration } from "moment";
import { AppDB } from "../db";
import { Gpio, GpioConfig } from "./gpio";
import { Pin, SequenceData } from "./utils";


type PinStatus = {
    pin: Pin,
    running: boolean,
    err: Error | null | undefined,
    reservedBy?: SequenceData['id']
}
interface GpioManager {
    isRunning: (id: SequenceData['id'],) => boolean
    run: (data: SequenceData) => void
    running: () => SequenceData['id'][]
    stop: (id: SequenceData['id']) => void
    pinsStatus: () => Promise<PinStatus[]>
    rest: () => void
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

        this.db.list()
            .then(pins => {
                this.gpio.setMode(boardMode)
                pins?.forEach(
                    (p) => {
                        gpio.setup(
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
        db.addListener('insert', (pin: Pin) => {
            gpio.setup(
                pin.channel,
                pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW)
            this.pins.set(pin.channel, pin)
        })

        // Old pin has been updated
        db.addListener('update', (newPin: Pin) => {
            this.pins.set(newPin.channel, newPin)
        })

        // Old pin removed
        db.addListener('remove', (channel: Pin['id']) => {
            const id = this.reservedPins.get(channel)
            if (id) {
                this.stop(id)
            }
            this.pins.delete(channel)
        })

    }


    isRunning = (id: SequenceData['id']) => {
        return this.orders.has(id)
    };


    running = () => {
        return [...this.orders.keys()]
    }


    run = (data: SequenceData) => {
        for (const p of data.orders) {
            if (this.reservedPins.has(p.channel)) {
                throw new Error(`channel ${p.channel} is reserved by id: (${this.reservedPins.get(p.channel)})`)
            }
            if (!this.pins.has(p.channel)) {
                throw new Error(`channel ${p.channel} is not defined`)
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

                    this.gpio.write(pin.channel, pState[pin.onState])
                        .catch(err => {
                            // TODO
                        })

                }, offset.asMilliseconds()),
                closeTimer: setTimeout(() => {

                    this.gpio.write(p.channel, !pState[pin.onState])
                        .catch(err => {
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


    stop = (id: SequenceData['id']) => {

        const seqOrder = this.orders.get(id)
        if (!seqOrder) {
            return
        }

        seqOrder.runOrders.forEach(({ startTimer, closeTimer, pin, }) => {
            clearTimeout(startTimer)
            clearTimeout(closeTimer)
            this.gpio.write(pin.channel, !pState[pin.onState])
            this.reservedPins.delete(pin.channel)
        })
        clearTimeout(seqOrder.clearTimer)
        this.orders.delete(id)
    };

    pinsStatus = async () => {
        const status: PinStatus[] = []
        for (const [_, pin] of this.pins) {
            const HIGH = await this.gpio.read(pin.channel)
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