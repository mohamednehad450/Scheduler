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

        // Send time every second
        const tickInterval = setInterval(() => socket.emit('tick', new Date()), 1000)

        // On pin change: update state and emit pinChange 
        scheduler.on('channelChange', async (...args) => {
            socket.emit('channelChange', ...args)
        })


        // On sequence stop: update state and emit stop 
        scheduler.on('stop', async (...args) => {
            socket.emit('stop', ...args)
            socket.emit('state', {
                reservedPins: scheduler.getReservedPins(),
                runningSequences: scheduler.running(),
            })
        })

        // On sequence finish: update state and emit stop 
        scheduler.on('finish', async (...args) => {
            socket.emit('finish', ...args)
            socket.emit('state', {
                reservedPins: scheduler.getReservedPins(),
                runningSequences: scheduler.running(),
            })
        })



        // On sequence run: update state and emit run 
        scheduler.on('run', (...args) => {
            socket.emit('run', ...args)
            socket.emit('state', {
                runningSequences: scheduler.running(),
                reservedPins: scheduler.getReservedPins(),
            })
        })

        async function sendState() {
            socket.emit('state', {
                runningSequences: scheduler.running(),
                reservedPins: scheduler.getReservedPins(),
                runningChannel: await scheduler.runningChannel(),
            })
        }
        sendState()
            .catch(err => socket.emit('failed', createErr(ACTIONS.REFRESH, err)))

        socket.on(ACTIONS.REFRESH, () => sendState()
            .catch(err => socket.emit('failed', createErr(ACTIONS.REFRESH, err))))


        addAction(ACTIONS.RUN, scheduler.run, socket)
        addAction(ACTIONS.STOP, scheduler.stop, socket)


        socket.on('disconnect', () => {
            scheduler.removeAllListeners()
            socket.removeAllListeners()
            clearInterval(tickInterval)
        })
    })
}