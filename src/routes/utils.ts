import { json } from 'body-parser'
import { Express, Router } from 'express'
import { AppDB } from '../db'
import { DB, EventsDB, } from "../db/db"


export const CRUD = <K, T>(db: DB<K, T>, stringToKey: (s: string) => K) => {

    const router = Router()
    // List all objects
    router.get('/', (req, res) => {
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
    router.get('/:id', (req, res) => {
        db.get(stringToKey(req.params.id))
            .then(m => {
                if (m) {
                    res.json(m)
                    return
                }
                res.status(404)
                res.json({ error: "NOT FOUND" })
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Create new object
    router.post('/', (req, res) => {
        db.insert(req.body)
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                // TODO: Validation error
                if (err.isJoi) {
                    res.status(400)
                    res.json({ ...err, error: "VALIDATION ERROR" })
                    return
                }
                res.status(500)
                res.json(err)
            })
    })

    // Delete an object
    router.delete("/:id", (req, res) => {
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
    router.put('/:id', (req, res) => {
        db.set(stringToKey(req.params.id), req.body)
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                // TODO: Validation error
                if (err.isJoi) {
                    res.status(400)
                    res.json({ ...err, error: "VALIDATION ERROR" })
                    return
                }
                res.status(500)
                res.json(err)
            })
    })

    // Updates an object
    router.patch('/:id', (req, res) => {
        db.update(stringToKey(req.params.id), req.body)
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                // TODO: Validation error
                if (err.isJoi) {
                    res.status(400)
                    res.json({ ...err, error: "VALIDATION ERROR" })
                    return
                }
                res.status(500)
                res.json(err)
            })
    })

    return router
}



export const Events = <K, T>(db: EventsDB<K, T>, stringToKey: (s: string) => K) => {

    const router = Router()
    // List all Events 
    router.get("/", (req, res) => {
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
    router.get('/:id', (req, res) => {
        db.listByObject(stringToKey(req.params.id))
            .then(m => {
                res.json(m)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    // Delete Events by parameter
    router.delete("/:id", (req, res) => {
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
    router.delete("/", (req, res) => {
        db.removeAll()
            .then(() => {
                res.json()
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })

    return router

}

export const cronSequenceLink = (db: AppDB['cronSequenceLink'], stringToKey: (s: string) => number) => {

    const router = Router()
    // Link a Sequence to a list of crons
    router.post('/sequence/:id', (req, res) => {
        db.linkSequence(stringToKey(req.params.id), req.body)
            .then((sequence) => {
                res.json(sequence)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })
    // Link a cron to a list of Sequences
    router.post('/cron/:id', (req, res) => {
        db.linkCron(stringToKey(req.params.id), req.body)
            .then((cron) => {
                res.json(cron)
            })
            .catch(err => {
                res.status(500)
                res.json(err)
            })
    })


    return router
}

