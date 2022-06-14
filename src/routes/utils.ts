import { Express } from 'express'

import { DB, withId } from "../db/db"


export const CRUD = <K, T extends withId<K>>(app: Express, db: DB<K, T>, route: string, stringToKey: (s: string) => K) => {

    // List all objects
    app.get(route + 's', (req, res) => {
        db.list()
            .then(ms => {
                res.header("Access-Control-Allow-Origin", "*");
                res.json(ms)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Get object
    app.get(route + '/:id', (req, res) => {
        db.get(stringToKey(req.params.id))
            .then(m => {
                res.header("Access-Control-Allow-Origin", "*");
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Create new object
    app.post(route, (req, res) => {
        db.insert(req.body)
            .then(m => {
                res.header("Access-Control-Allow-Origin", "*");
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Delete an object
    app.delete(route, (req, res) => {
        db.remove(stringToKey(req.params.id))
            .then(() => {
                res.header("Access-Control-Allow-Origin", "*");
                res.json()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Updates an object
    app.patch(route, (req, res) => {
        db.set(req.body)
            .then(m => {
                res.header("Access-Control-Allow-Origin", "*");
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })
}
