import { compare } from 'bcrypt'
import { Router, Handler } from 'express'
import { sign, verify } from 'jsonwebtoken'
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
                if (!m) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
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
                if (!m) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
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
        db.listAll({
            page: Number(req.query.page),
            perPage: Number(req.query.perPage)
        })
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
        db.listByObject(
            stringToKey(req.params.id),
            {
                page: Number(req.query.page),
                perPage: Number(req.query.perPage)
            })
            .then(m => {
                if (!m) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
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
            .then((success) => {
                if (!success) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
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
                if (!sequence) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
                res.json(sequence)
            })
            .catch(err => {
                if (err.isJoi) {
                    res.status(400)
                    res.json({ ...err, error: "VALIDATION ERROR" })
                    return
                }
                res.status(500)
                res.json(err)
            })
    })
    // Link a cron to a list of Sequences
    router.post('/cron/:id', (req, res) => {
        db.linkCron(stringToKey(req.params.id), req.body)
            .then((cron) => {
                if (!cron) {
                    res.status(404)
                    res.json({ error: "NOT FOUND" })
                    return
                }
                res.json(cron)
            })
            .catch(err => {
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


export const authCRUD = (db: AppDB['adminDb']) => {

    const router = Router()

    router.post("/login", async (req, res) => {

        if (!(await db.isRegistered())) {
            res.status(409).json({ error: "Admin account not registered" })
            return
        }

        const { username, password } = req.body

        if (!username || !password) {
            res.status(400).json({ error: "Missing username or password" })
            return
        }

        const admin = await db.getAdmin(username)

        if (!admin) {
            res.status(404).json({ username: "username not found" })
            return
        }


        const pass = await compare(password, admin.password)
        if (!pass) {
            res.status(403).json({ password: "password is incorrect" })
            return
        }

        try {
            const token = sign(
                { username: admin.username },
                process.env.TOKEN_KEY || '',
                { expiresIn: "24h" }
            );
            res.json({
                username: admin.username,
                token
            })
        } catch (error) {
            res.status(500).json(error)
        }
    })

    router.post('/register', async (req, res) => {

        if (await db.isRegistered()) {
            res.status(409).json({ error: "Admin account already registered" })
            return
        }

        db.register(req.body)
            .then((admin) => {
                if (!admin) {
                    res.status(500).json({ error: "Failed to create admin user" })
                    return
                }
                try {
                    const token = sign(
                        { username: admin.username },
                        process.env.TOKEN_KEY || '',
                        { expiresIn: "24h" }
                    );
                    res.json({
                        username: admin.username,
                        token
                    })
                } catch (error) {
                    res.status(500).json(error)
                }

            })
            .catch(error => {
                res.status(400).json(error)
            })
    })

    router.post('/validate', (req, res) => {
        try {
            verify(req.body.token, process.env.TOKEN_KEY || '')
            res.send()
        } catch (error) {
            res.status(403).send()
        }
    })


    return router
}

export const withAuth: Handler = (req, res, next) => {
    try {
        const token: any = req.query.token
        verify(token, process.env.TOKEN_KEY || '')
        next()
    } catch (error) {
        res.status(403).send()
    }
}

