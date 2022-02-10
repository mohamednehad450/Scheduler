import { Express } from 'express'

import { DB, withId } from "../db/db"






export const CRUD = <T extends withId>(app: Express, db: DB<T>, route: string, validator: (t: Partial<T>) => T) => {

    // List all objects
    app.get(route + 's', (req, res) => {
        db.list((err, ms) => {
            if (err) {
                res.status(500)
                res.json(err)
                return
            }
            ms && res.json(ms)
        })
    })

    // Get object
    app.get(route, (req, res) => {
        const id = req.body.id || ''
        db.get(id, (err, m) => {
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

    // Create new object
    app.post(route, (req, res) => {
        try {
            db.insert(validator(req.body), (err, m) => {
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

    // Delete an object
    app.delete(route, (req, res) => {
        const id = req.body.id || ''
        db.remove(id, (err) => {
            if (err) {
                res.status(400)
                res.json(err)
            }
            else {
                res.send()
            }
        })
    })

    // Updates an object
    app.patch(route, (req, res) => {
        try {
            db.set(validator(req.body), (err, m) => {
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
