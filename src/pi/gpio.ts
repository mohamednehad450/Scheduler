import gpio from 'rpi-gpio'
import { readFileSync } from 'fs'

type Gpio = typeof gpio
type GpioConfig = {
    validPins: number[],
    boardMode: typeof gpio.MODE_BCM,
}

const config: GpioConfig = JSON.parse(readFileSync('config.json', 'utf8'))


function logArgs(func: string, ...args: any) { console.log({ func, args: JSON.stringify(args) }) }
if (process.env.NODE_ENV === 'development') {
    console.warn('rpi-gpio running in dev mode');
    gpio.destroy = (...args) => logArgs('destroy', args)
    gpio.setup = (...args) => logArgs('setup', args)
    gpio.setMode = (...args) => logArgs('setMode', args)
    gpio.read = (...args) => logArgs('read', args)
    gpio.write = (...args) => logArgs('write', args)
}


export default gpio
export { config, Gpio, GpioConfig }