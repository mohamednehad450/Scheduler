import { AppDB } from '../db'
import gpio, { config } from '../pi/gpio'
import { PinManager, Scheduler } from '../pi'
import { Server, Socket } from 'socket.io'


enum ACTIONS {
    RUN = "run",
    STOP = 'stop',
    ACTIVATE = 'activate',
    DEACTIVATE = 'deactivate',
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

const addAction = (a: ACTIONS, func: (id: string) => Promise<void>, socket: Socket) => {
    socket.on(a, (id) => {
        func(id)
            .then(() => socket.emit('success', createSuccess(a, '', id)))
            .catch(err => socket.emit('error', createErr(a, err, id)))
    })
}

export default (io: Server, db: AppDB) => {

    const pinManager = new PinManager(gpio, config, db.pinsDb)
    const scheduler = new Scheduler(db, pinManager)


    io.on('connection', (socket) => {
        console.log('Socket Connected.')
        console.log(`Socket ID: ${socket.id}`)

        async function sendState() {

            // Send running Sequences status
            socket.emit('state', {
                runningSequences: pinManager.running(),
                activeSequences: scheduler.active()
            })

            // Send Pins Status
            pinManager.pinsStatus()
                .then(pins => {
                    socket.emit('state', { pins })
                })
                .catch(err => {
                    socket.emit('error', createErr(ACTIONS.REFRESH, err))
                })
        }
        sendState()
        socket.on(ACTIONS.REFRESH, () => sendState())

        addAction(ACTIONS.RUN, scheduler.run, socket)
        addAction(ACTIONS.STOP, scheduler.stop, socket)
        addAction(ACTIONS.ACTIVATE, scheduler.activate, socket)
        addAction(ACTIONS.DEACTIVATE, scheduler.deactivate, socket)
    })
}


