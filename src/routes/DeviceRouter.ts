import { Router } from "express"
import { Scheduler } from "../pi"




export default function DeviceRouter(scheduler: Scheduler) {

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
        scheduler.run(req.params.id)
            .then(async (s) => {
                if (!s) {
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
        scheduler.stop(req.params.id)
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


    return router
}