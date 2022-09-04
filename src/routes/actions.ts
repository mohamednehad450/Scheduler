import { AppDB } from '../db'
import { PinManager, Scheduler } from '../pi'
import { Server, Socket } from 'socket.io'


enum ACTIONS {
    RUN = "run",
    STOP = 'stop',
    REFRESH = "refresh"
}

type ErrorObject = {
    action: ACTIONS,
    message: string,
    errName: string
    args: any[]
}
type SuccessObject = {
    action: ACTIONS,
    message?: string,
    args: any[]
}

const createErr = (action: ACTIONS, err: Error, ...args: any[]): ErrorObject => ({
    action,
    message: err.message,
    errName: err.name,
    args
})

const createSuccess = (action: ACTIONS, message?: string, ...args: any[]): SuccessObject => ({
    action,
    message,
    args
})

const addAction = (a: ACTIONS, func: (id: number) => Promise<void>, socket: Socket) => {
    socket.on(a, (id) => {
        func(id)
            .then(() => socket.emit('success', createSuccess(a, '', id)))
            .catch(err => socket.emit('failed', createErr(a, err, id)))
    })
}

export default (io: Server, db: AppDB) => {

    const scheduler = new Scheduler(db)


    io.on('connection', (socket) => {
        console.log('Socket Connected.')
        console.log(`Socket ID: ${socket.id}`)

        // Send time every TICK
        const TICK = 1000
        let tick: NodeJS.Timeout
        const tickHandler = (cb: (d: Date) => void) => {
            const d = new Date()
            cb(d)
            tick = setTimeout(() => tickHandler(cb), TICK - (d.getTime() % TICK))
        }
        tickHandler((d) => socket.emit('tick', d))


        // On channel change: update state and emit pinChange 
        const channelChange = async (...args: any) => {
            socket.emit('channelChange', ...args)
        }


        // On sequence stop: update state and emit stop 
        const stop = async (...args: any) => {
            socket.emit('stop', ...args)
            socket.emit('state', {
                reservedPins: scheduler.getReservedPins(),
                runningSequences: scheduler.running(),
            })
        }


        // On sequence finish: update state and emit stop 
        const finish = async (...args: any) => {
            socket.emit('finish', ...args)
            socket.emit('state', {
                reservedPins: scheduler.getReservedPins(),
                runningSequences: scheduler.running(),
            })
        }


        // On sequence run: update state and emit run 
        const run = (...args: any) => {
            socket.emit('run', ...args)
            socket.emit('state', {
                runningSequences: scheduler.running(),
                reservedPins: scheduler.getReservedPins(),
            })
        }


        async function sendState() {
            socket.emit('state', {
                runningSequences: scheduler.running(),
                reservedPins: scheduler.getReservedPins(),
                channelsStatus: await scheduler.channelsStatus(),
            })
        }
        sendState()
            .catch(err => socket.emit('failed', createErr(ACTIONS.REFRESH, err)))

        socket.on(ACTIONS.REFRESH, () => sendState()
            .catch(err => socket.emit('failed', createErr(ACTIONS.REFRESH, err))))


        addAction(ACTIONS.RUN, scheduler.run, socket)
        addAction(ACTIONS.STOP, scheduler.stop, socket)

        scheduler.on('channelChange', channelChange)
        scheduler.on('stop', stop)
        scheduler.on('run', run)
        scheduler.on('finish', finish)


        socket.on('disconnect', () => {
            scheduler.removeListener('channelChange', channelChange)
            scheduler.removeListener('run', run)
            scheduler.removeListener('stop', stop)
            scheduler.removeListener('finish', finish)
            socket.removeAllListeners()
            clearTimeout(tick)
        })
    })
}