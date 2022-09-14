import { Express } from 'express'
import { AppDB } from '../db'

import { DB, EventsDB, } from "../db/db"


export const CRUD = <K, T>(app: Express, db: DB<K, T>, route: string, stringToKey: (s: string) => K) => {

    // List all objects
    app.get(route + 's', (req, res) => {
        db.list()
            .then(ms => {
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
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Delete an object
    app.delete(route + "/:id", (req, res) => {
        db.remove(stringToKey(req.params.id))
            .then(() => {
                res.json()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Updates an object completely
    app.put(route + '/:id', (req, res) => {
        db.set(stringToKey(req.params.id), req.body)
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Updates an object
    app.patch(route + '/:id', (req, res) => {
        db.update(stringToKey(req.params.id), req.body)
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })
}



export const Events = <K, T>(app: Express, db: EventsDB<K, T>, route: string, stringToKey: (s: string) => K) => {

    // List all Events 
    app.get(route + 's', (req, res) => {
        db.listAll()
            .then(ms => {
                res.json(ms)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // List Events by parameter
    app.get(route + 's/:id', (req, res) => {
        db.listByObject(stringToKey(req.params.id))
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Get Event
    app.get(route + '/:id', (req, res) => {
        db.get(stringToKey(req.params.id))
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Delete an Event
    app.delete(route + "/:id", (req, res) => {
        db.remove(stringToKey(req.params.id))
            .then(() => {
                res.json()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Delete Events by parameter
    app.delete(route + "s/:id", (req, res) => {
        db.removeByObject(stringToKey(req.params.id))
            .then(() => {
                res.json()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Delete all Events 
    app.delete(route + "s", (req, res) => {
        db.removeAll()
            .then(() => {
                res.json()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

}

export const cronSequenceLink = (app: Express, db: AppDB['cronSequenceLink'], route: string, stringToKey: (s: string) => number) => {

    // Create new object
    app.post(route + '/sequence/:id', (req, res) => {
        db.linkSequence(stringToKey(req.params.id), req.body)
            .then(() => {
                res.send()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })
    // Create new object
    app.post(route + '/cron/:id', (req, res) => {
        db.linkCron(stringToKey(req.params.id), req.body)
            .then(() => {
                res.send()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })
}

