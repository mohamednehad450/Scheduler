import { Express } from 'express'
import { validateMultiPins, validateSinglePin } from '../pi'
import { AppDB } from '../db'
const routes = {
    LIST_SINGLEPIN: "/single-scheds",
    SINGLE_SINGLEPIN: "/single-sched",
    LIST_MULTIPINS: "/multi-scheds",
    SINGLE_MULTIPIN: "/multi-sched"
}


export default (app: Express, db: AppDB) => {

    const { singleDb, multiDb } = db

    // List all SinglePin schedules 
    app.get(routes.LIST_SINGLEPIN, (req, res) => {
        singleDb.list((err, ls) => {
            if (err) {
                res.status(500)
                res.json(err)
                return
            }
            ls ? res.json(ls.map(validateSinglePin)) : res.json([])
        })
    })

    // Get SinglePin Schedules
    app.get(routes.SINGLE_SINGLEPIN, (req, res) => {
        const id = req.body.id || ''
        singleDb.get(id, (err, s) => {
            if (err) {
                res.status(400)
                res.json(err)
                return
            }
            if (s) {
                res.json(s)
            } else {
                res.status(404)
                res.json(err)
            }
        })
    })

    // Create new SinglePin schedule
    app.post(routes.SINGLE_SINGLEPIN, (req, res) => {
        try {
            const s = validateSinglePin({ ...req.body, id: 'MOCKID', })
            singleDb.insert(s, (err, s) => {
                if (err) {
                    res.status(500)
                    res.send(err)
                    return
                }
                if (s) {
                    res.json(s)
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

    // Delete a SinglePin schedule
    app.delete(routes.SINGLE_SINGLEPIN, (req, res) => {
        const id = req.body.id || ''
        singleDb.remove(id, (err) => {
            if (err) {
                res.status(400)
                res.json(err)
            }
            else {
                res.send()
            }
        })
    })

    // Updates a SinglePin schedule
    app.patch(routes.SINGLE_SINGLEPIN, (req, res) => {
        try {
            const s = validateSinglePin(req.body)
            singleDb.set(s, (err, s) => {
                if (err) {
                    res.status(400)
                    res.json(err)
                    return
                }
                s && res.json(s)
            })
        } catch (error: any) {
            res.status(400)
            res.json(error)
        }
    })


    // List all MultiPins schedules 
    app.get(routes.LIST_MULTIPINS, (req, res) => {
        multiDb.list((err, ms) => {
            if (err) {
                res.status(500)
                res.json(err)
                return
            }
            ms && res.json(ms)
        })
    })

    // Get MultiPins Schedules
    app.get(routes.SINGLE_MULTIPIN, (req, res) => {
        const id = req.body.id || ''
        multiDb.get(id, (err, m) => {
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
    app.post(routes.SINGLE_MULTIPIN, (req, res) => {
        try {
            const m = validateMultiPins({ ...req.body, id: 'MOCKID', })
            multiDb.insert(m, (err, m) => {
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
    app.delete(routes.SINGLE_MULTIPIN, (req, res) => {
        const id = req.body.id || ''
        multiDb.remove(id, (err) => {
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
    app.patch(routes.SINGLE_MULTIPIN, (req, res) => {
        try {
            const m = validateMultiPins(req.body)
            multiDb.set(m, (err, m) => {
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