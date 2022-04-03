import { AppDB } from "../db";
import { Gpio, GpioConfig } from "./gpio";
import { ID, Pin, validatePin } from "./utils";

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface GpioManager {
    isRunning: (id: ID, cb: CallBack<boolean>) => void
    run: (id: ID, cb: CallBack<void>) => void
    stop: (id: ID, cb: CallBack<void>) => void
    pinsStatus: (cb: CallBack<{ p: Pin, running: boolean, err: Error | null | undefined }[]>) => void
    rest: (cb: CallBack<void>) => void
}

// Used to implement the 'Normally open pin state'
const pState: { [key in GpioConfig['openPinState']]: boolean } = {
    HIGH: true,
    LOW: false,
}

class PinManager implements GpioManager {

    gpio: Gpio
    config: GpioConfig
    db: AppDB['pinsDb']

    constructor(gpio: Gpio, config: GpioConfig, db: AppDB['pinsDb']) {

        this.config = config
        this.gpio = gpio
        this.db = db

        const { boardMode } = this.config

        this.db.list((err, pins) => {
            if (err) {
                //TODO
                return
            }
            this.gpio.setMode(boardMode)
            pins?.forEach((p) => gpio.setup(p.channel, gpio.DIR_HIGH))
        })


    }



    isRunning = (id: ID, cb: CallBack<boolean>) => {
        this.db.get(id, (err, p) => {
            if (err) {
                cb(err)
                return
            }
            p && this.gpio.read(p.channel, (err, high) => cb(err, pState[this.config.openPinState] ? high : !high))
        })
    };

    run = (id: ID, cb: CallBack<void>) => {
        this.db.get(id, (err, p) => {
            if (err) {
                cb(err)
                return
            }
            p && this.gpio.write(p.channel, pState[this.config.openPinState], cb)
        })
    }

    stop = (id: ID, cb: CallBack<void>) => {
        this.db.get(id, (err, p) => {
            if (err) {
                cb(err)
                return
            }
            p && this.gpio.write(p.channel, !pState[this.config.openPinState], cb)
        })
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
        this.gpio.destroy((err) => {
            if (err) {
                cb(err)
                return
            }
            this.db.list((err, pins) => {
                if (err) {
                    cb(err)
                    return
                }
                this.gpio.setMode(this.config.boardMode)
                pins && pins.forEach(p => this.gpio.setup(p.channel, this.gpio.DIR_HIGH))
            })
        })
    };
}

export default PinManager