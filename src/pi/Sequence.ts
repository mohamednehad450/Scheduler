import { SequenceData, validateSequenceData } from "./utils"
import PinManager from './PinManager'
import later, { setInterval, } from "later"


type CallBack<T> = (err: Error | null | undefined, v?: T) => void



class Sequence {

    data: SequenceData
    pm: PinManager
    interval?: later.Timer

    constructor(data: SequenceData, pm: PinManager) {
        this.data = validateSequenceData(data)
        this.pm = pm
    }


    run = (cb: CallBack<void>) => {
        this.pm.run(this.data, cb)
    }


    stop = (cb: CallBack<void>) => {
        this.pm.stop(this.data.id, cb)
    }


    isRunning = () => {
        return this.pm.isRunning(this.data.id)
    }

    activate = (cb: CallBack<void>) => {
        if (!this.interval) {
            this.interval = setInterval(() => this.run(() => { }), this.data.schedule)
            cb(null)
        }
    }

    deactivate = (cb: CallBack<void>) => {
        this.interval?.clear()
        this.interval = undefined
        cb(null)
    }

    isActive = (): boolean => {
        return !!this.interval
    }
}



export default Sequence