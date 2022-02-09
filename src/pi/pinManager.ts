import { Gpio, GpioConfig } from "./gpio";
import { Pin, validatePin } from "./utils";

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface GpioManager {
    isRunning: (p: Pin, cb: CallBack<boolean>) => void
    run: (p: Pin, cb: CallBack<void>) => void
    stop: (p: Pin, cb: CallBack<void>) => void
    pinsStatus: (cb: CallBack<{ p: Pin, running: boolean, err: Error | null | undefined }[]>) => void
    rest: (cb: CallBack<void>) => void
    destroy: (cb: CallBack<void>) => void
}

const HIGH = true
const LOW = false

class PinManager implements GpioManager {

    pins: Map<Pin['channel'], Pin>
    gpio: Gpio
    config: GpioConfig

    constructor(gpio: Gpio, config: GpioConfig, pins: Pin[]) {

        this.config = config
        this.pins = new Map()
        this.gpio = gpio

        const { boardMode } = this.config

        const validatedPins = pins.map(validatePin)
        validatedPins.forEach(p => this.pins.set(p.channel, p))

        this.gpio.setMode(boardMode)

        this.pins.forEach((p) => gpio.setup(p.channel, gpio.DIR_HIGH))
    }



    isRunning = (p: Pin, cb: CallBack<boolean>) => {
        this.pins.has(p.channel) ?
            this.gpio.read(p.channel, (err, high) => cb(err, !high)) :
            cb(new Error('Invalid Pin'))
    };

    run = (p: Pin, cb: CallBack<void>) => {
        this.isRunning(p, (err, running) => {
            if (err) {
                cb(err)
                return
            }
            running ? cb(null) : this.gpio.write(p.channel, LOW, cb)
        })
    }

    stop = (p: Pin, cb: CallBack<void>) => {
        this.isRunning(p, (err, running) => {
            if (err) {
                cb(err)
                return
            }
            !running ? cb(null) : this.gpio.write(p.channel, HIGH, cb)
        })
    };

    pinsStatus = (cb: CallBack<{ p: Pin, running: boolean, err: Error | null | undefined }[]>) => {
        const status: {
            p: Pin,
            running: boolean
            err: Error | null | undefined
        }[] = []
        this.pins.forEach((p) => {
            this.isRunning(p, (err, running) => {
                err ?
                    status.push({ p, running: false, err: err }) :
                    status.push({ p, running: !!running, err: null })
                status.length === this.pins.size && cb(null, status)
            })
        })
    };

    rest = () => {
        this.gpio.destroy((err) => {
            if (err) throw err
            this.gpio.setMode(this.config.boardMode)
            this.pins.forEach(p => this.gpio.setup(p.channel, this.gpio.DIR_HIGH))
        })
    };

    destroy = (cb: CallBack<void>) => {
        this.gpio.destroy(cb)
        this.pins.clear()
    };

}

export default PinManager