import { Express } from 'express'
import { AppDB } from '../db'
import gpio, { config } from '../pi/gpio'
import { PinManager, Scheduler } from '../pi'


const routes = {
    RUN: "/sequence",
    ACTIVATE: '/scheduler',
    PM: '/pm'
}


export default (app: Express, db: AppDB) => {

    const pinManager = new PinManager(gpio, config, db.pinsDb)
    const scheduler = new Scheduler(db, pinManager)

    // Run schedule
    app.post(routes.RUN, (req, res) => {
        scheduler.run(req.body.id, (err) => {
            if (err) {
                res.status(400)
                res.send()
                return
            }
            res.status(204)
            res.send()
        })
    })


    // Stop schedule
    app.delete(routes.RUN, (req, res) => {
        scheduler.stop(req.body.id || 'EMPTY_ID', (err) => {
            if (err) {
                res.status(400)
                res.send()
                return
            }
            res.status(204)
            res.send()
        })
    })


    // Running schedules
    app.get(routes.RUN, (req, res) => {
        pinManager.running((err, ids) => {
            if (err) {
                res.status(500)
                res.send()
                return
            }
            res.json(ids || [])
        })
    })


    // Activate schedule
    app.post(routes.ACTIVATE, (req, res) => {
        scheduler.activate(req.body.id || 'EMPTY_ID', (err) => {
            if (err) {
                res.status(400)
                res.send()
                return
            }
            res.status(204)
            res.send()
        })
    })


    // Deactivate schedule
    app.delete(routes.ACTIVATE, (req, res) => {
        scheduler.deactivate(req.body.id || 'EMPTY_ID', (err) => {
            if (err) {
                res.status(400)
                res.send()
                return
            }
            res.status(204)
            res.send()
        })
    })


    // Active schedules
    app.get(routes.ACTIVATE, (req, res) => {
        pinManager.running((err, ids) => {
            if (err) {
                res.status(500)
                return
            }
            res.json(ids || [])
        })
    })

    // Pins status
    app.get(routes.PM, (req, res) => {
        pinManager.pinsStatus((err, pins) => {
            if (err) {
                res.status(500)
                return
            }
            res.json(pins || [])
        })
    })
}