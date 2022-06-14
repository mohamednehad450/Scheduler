import { promise, setMode as _setMode } from 'rpi-gpio'
import { readFileSync } from 'fs'

type Gpio = typeof promise & { setMode: typeof _setMode }

type GpioConfig = {
    validPins: number[],
    boardMode: typeof promise.MODE_BCM,
}
const config: GpioConfig = JSON.parse(readFileSync('config.json', 'utf8'))

let setMode = _setMode

function logArgs(func: string, ...args: any) { console.log({ time: new Date().toLocaleTimeString(), func, args: JSON.stringify(args) }) }

if (process.env.NODE_ENV === 'development') {

    console.warn('rpi-gpio running in dev mode');

    const channelState = new Map<number, boolean>()

    promise.destroy = async (...args) => logArgs('destroy', args)

    promise.setup = async (c, state, ...args) => {
        channelState.set(c, state === "high")
        logArgs('setup', c, state, args)
        return true
    }
    setMode = (...args) => logArgs('setMode', args)

    promise.read = async (c, ...args) => {
        logArgs('read', c, ...args)
        return !!channelState.get(c)
    }

    promise.write = async (c, bool, ...args) => {
        channelState.set(c, bool)
        logArgs('write', c, bool, args)
    }
}


export default { ...promise, setMode }
export { config, Gpio, GpioConfig }