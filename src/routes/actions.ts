import { AppDB } from '../db'
import { Scheduler } from '../pi'
import { Server, Socket } from 'socket.io'
import { verify } from 'jsonwebtoken'
import { Router } from 'express'


enum ACTIONS {
    RUN = "run",
    STOP = 'stop',
    RESET = "reset",
    STATE = "state",
    TICK = "tick"
}


const addAction = (a: ACTIONS, func: (...args: any) => Promise<any>, socket: Socket) => {
    socket.on(a, (actionId, ...args) => {
        func(...args)
            .then(() => actionId && socket.emit(actionId, true, null))
            .catch(err => actionId && socket.emit(actionId, false, err))
    })
}

// NOTE: the actions router DOES NOT handle authentication, but the socket connection does.
export default async (io: Server, db: AppDB) => {

    const scheduler = new Scheduler(db)

    await scheduler.start()

    async function getState() {
        return {
            runningSequences: scheduler.running(),
            reservedPins: scheduler.getReservedPins(),
            channelsStatus: await scheduler.channelsStatus(),
        }
    }


    const router = Router()

    // Run sequence
    router.post("/run/:id", (req, res) => {
        scheduler.run(Number(req.params.id) || -1)
            .then(async (s) => {
                if (s === null) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
                if (typeof s === "string") {
                    res.status(400)
                    res.json({ error: s })
                    return
                }
                return {
                    state: await getState(),
                    sequence: s,
                }
            })
            .then((s) => res.json(s))
            .catch(err => {
                res.status(500)
                res.json(err)
                return
            })
    })


    // Stop sequence
    router.post("/stop/:id", (req, res) => {
        scheduler.stop(Number(req.params.id) || -1)
            .then(getState)
            .then((s) => res.json(s))
            .catch(err => {
                res.status(500)
                res.json(err)
                return
            })
    })

    // Rest pin manager sequence
    router.post("/reset", (req, res) => {
        scheduler.resetPinManager()
            .then(getState)
            .then((s) => res.json(s))
            .catch(err => {
                res.status(500)
                res.json(err)
                return
            })
    })


    // Get state 
    router.get("/state", (req, res) => {
        getState()
            .then((s) => res.json(s))
            .catch(err => {
                res.status(500)
                res.json(err)
                return
            })
    })

    // Get time
    router.get("/time", (req, res) => {
        res.json({ time: new Date() })
    })


    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token
            verify(token, process.env.TOKEN_KEY || '')
            next()
        } catch (error) {
            next(new Error('invalid token'))
        }
    })

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
            socket.emit('state', await getState())
        }

        async function onTick(on: boolean) {
            if (on) {
                clearTimeout(tick)
                tickHandler((d) => socket.emit('tick', d))
            } else clearTimeout(tick)
        }



        addAction(ACTIONS.RUN, scheduler.run, socket)
        addAction(ACTIONS.STOP, scheduler.stop, socket)
        addAction(ACTIONS.RESET, scheduler.resetPinManager, socket)
        addAction(ACTIONS.STATE, sendState, socket)
        addAction(ACTIONS.TICK, onTick, socket)

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

    return router
}