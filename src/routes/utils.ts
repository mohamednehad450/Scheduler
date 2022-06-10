import { Express } from 'express'

import { DB, withId } from "../db/db"


export const CRUD = <K, T extends withId<K>>(app: Express, db: DB<K, T>, route: string, stringToKey: (s: string) => K) => {

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
    app.get(route + '/:id', (req, res) => {
        db.get(stringToKey(req.params.id), (err, m) => {
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
        db.insert(req.body, (err, m) => {
            if (err) {
                res.status(400)
                res.send(err)
                return
            }
            if (m) {
                res.json(m)
            } else {
                res.status(500)
                res.send()
            }
        })
    })

    // Delete an object
    app.delete(route, (req, res) => {
        db.remove(stringToKey(req.params.id), (err) => {
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
        db.set(req.body, (err, m) => {
            if (err) {
                res.status(400)
                res.json(err)
                return
            }
            if (m) {
                res.json(m)
                return
            }
            res.status(500)
            res.send()

        })
    })
}
