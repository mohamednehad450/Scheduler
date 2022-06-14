import { SequenceData, validateSequenceData } from "./utils"
import PinManager from './PinManager'
import later, { setInterval, } from "later"


class Sequence {

    data: SequenceData
    pm: PinManager
    interval?: later.Timer

    constructor(data: SequenceData, pm: PinManager) {
        this.data = validateSequenceData(data)
        this.pm = pm
    }


    run = () => {
        this.pm.run(this.data)
    }


    stop = () => {
        this.pm.stop(this.data.id)
    }


    isRunning = () => {
        return this.pm.isRunning(this.data.id)
    }

    activate = () => {
        if (!this.interval) {
            this.interval = setInterval(() => this.run(), this.data.schedule)
        }
    }

    deactivate = () => {
        this.interval?.clear()
        this.interval = undefined
    }

    isActive = (): boolean => {
        return !!this.interval
    }
}



export default Sequence