import gpio from 'rpi-gpio'
import { readFileSync } from 'fs'

type GpioConfig = {
    validPins: number[],
    boardMode: typeof gpio.promise.MODE_BCM,
}
const config: GpioConfig = JSON.parse(readFileSync('config.json', 'utf8'))

function logArgs(func: string, ...args: any) { console.log({ time: new Date().toLocaleTimeString(), func, args: JSON.stringify(args) }) }

if (process.env.NODE_ENV === 'development') {

    console.warn('rpi-gpio running in dev mode');

    const channelState = new Map<number, boolean>()

    gpio.promise.destroy = async (...args) => logArgs('destroy', args)

    gpio.promise.setup = async (c, state, ...args) => {
        channelState.set(c, state === "high")
        logArgs('setup', c, state, args)
        return true
    }
    gpio.setMode = (...args) => logArgs('setMode', args)

    gpio.promise.read = async (c, ...args) => {
        logArgs('read', c, ...args)
        return !!channelState.get(c)
    }

    gpio.promise.write = async (c, bool, ...args) => {
        gpio.emit('change', c, bool)
        channelState.set(c, bool)
        logArgs('write', c, bool, args)
    }
}

export default gpio
export { config }
export type { GpioConfig }