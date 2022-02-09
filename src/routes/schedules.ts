import { Express } from 'express'
import { validateSchedule } from '../pi'
import { AppDB } from '../db'
const routes = {
    LIST_SCHEDULES: "/schedules",
    SINGLE_SCHEDULE: "/schedule",
}


export default (app: Express, db: AppDB) => {

    const { schedulesDb } = db
    // List all MultiPins schedules 
    app.get(routes.LIST_SCHEDULES, (req, res) => {
        schedulesDb.list((err, ms) => {
            if (err) {
                res.status(500)
                res.json(err)
                return
            }
            ms && res.json(ms)
        })
    })

    // Get MultiPins Schedules
    app.get(routes.SINGLE_SCHEDULE, (req, res) => {
        const id = req.body.id || ''
        schedulesDb.get(id, (err, m) => {
            if (err) {
                res.status(400)
                res.json(err)
                return
            }
            if (m) {
                res.json(m)
            } else {
                res.status(404)
                res.json(err)
            }
        })
    })

    // Create new MultiPins schedule
    app.post(routes.SINGLE_SCHEDULE, (req, res) => {
        try {
            const m = validateSchedule({ ...req.body, id: 'MOCK_ID', })
            schedulesDb.insert(m, (err, m) => {
                if (err) {
                    res.status(500)
                    res.send(err)
                    return
                }
                if (m) {
                    res.json(m)
                } else {
                    res.status(400)
                    res.send(err)
                }
            })
        } catch (error: any) {
            res.status(400)
            res.json(error)
        }
    })

    // Delete a MultiPins schedule
    app.delete(routes.SINGLE_SCHEDULE, (req, res) => {
        const id = req.body.id || ''
        schedulesDb.remove(id, (err) => {
            if (err) {
                res.status(400)
                res.json(err)
            }
            else {
                res.send()
            }
        })
    })

    // Updates a MultiPins schedule
    app.patch(routes.SINGLE_SCHEDULE, (req, res) => {
        try {
            const m = validateSchedule(req.body)
            schedulesDb.set(m, (err, m) => {
                if (err) {
                    res.status(400)
                    res.json(err)
                    return
                }
                m && res.json(m)
            })
        } catch (error: any) {
            res.status(400)
            res.json(error)
        }
    })
}