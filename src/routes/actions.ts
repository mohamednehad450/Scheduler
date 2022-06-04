import { AppDB } from '../db'
import gpio, { config } from '../pi/gpio'
import { PinManager, Scheduler } from '../pi'
import { Server } from 'socket.io'


enum ACTIONS {
    RUN = "run",
    STOP = 'stop',
    ACTIVATE = 'activate',
    DEACTIVATE = 'deactivate',
    RUNNING = 'running',
    ACTIVE = 'active',
    RUNNING_PINS = 'runningPins'
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

export default (io: Server, db: AppDB) => {

    const pinManager = new PinManager(gpio, config, db.pinsDb)
    const scheduler = new Scheduler(db, pinManager)


    io.on('connection', (socket) => {
        console.log('Socket Connected.')
        console.log(`Socket ID: ${socket.id}`)


        // Run schedule
        socket.on(ACTIONS.RUN, (id) => {
            scheduler.run(id, (err) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.RUN, err, id))
                    return
                }
                socket.emit('success', createSuccess(ACTIONS.RUN, '', id))
            })
        })


        // Stop schedule
        socket.on(ACTIONS.STOP, (id) => {
            scheduler.stop(id || 'EMPTY_ID', (err) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.STOP, err, id))
                    return
                }
                socket.emit('success', createSuccess(ACTIONS.STOP, '', id))
            })
        })



        // Running schedules
        socket.on(ACTIONS.RUNNING, () => {
            pinManager.running((err, ids) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.RUNNING, err))
                    return
                }
                socket.emit('state', { runningSchedules: ids })
            })
        })



        // Activate schedule
        socket.on(ACTIONS.ACTIVATE, (id) => {
            scheduler.activate(id || 'EMPTY_ID', (err) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.ACTIVATE, err, id))
                    return
                }
                socket.emit('success', createSuccess(ACTIONS.ACTIVATE, '', id))
            })
        })



        // Deactivate schedule
        socket.on(ACTIONS.DEACTIVATE, (id) => {
            scheduler.deactivate(id || 'EMPTY_ID', (err) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.DEACTIVATE, err, id))
                    return
                }
                socket.emit('success', createSuccess(ACTIONS.DEACTIVATE, '', id))
            })
        })



        // Active schedules
        socket.on(ACTIONS.ACTIVE, () => {
            scheduler.active((err, ids) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.ACTIVE, err))
                    return
                }
                socket.emit('state', { activeSchedules: ids })
            })
        })


        // Pins status
        socket.on(ACTIONS.RUNNING_PINS, () => {
            pinManager.pinsStatus((err, pins) => {
                if (err) {
                    socket.emit('error', createErr(ACTIONS.RUNNING_PINS, err))
                    return
                }
                socket.emit('state', { pins })
            })
        })
    })
}