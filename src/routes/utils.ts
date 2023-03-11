import { compare } from 'bcrypt'
import { Router, Handler } from 'express'
import { sign, verify } from 'jsonwebtoken'
import { AppDB } from '../db'
import { DbInterface, EventCRUD, } from "../db/misc"
import { BaseCron, BaseSequence } from '../db/types'



export const CRUDRouter = <K, BaseT, T extends BaseT>(
    db: DbInterface<K, BaseT>,
    stringToKey: (s: string) => K,
    resolver?: (item: BaseT) => T
) => {

    const router = Router()
    // List all objects
    router.get('/', (req, res) => {
        try {
            const list = resolver ? db.findAll().map(resolver) : db.findAll()
            res.json(list)
        } catch (error) {
            res.status(500)
            res.json(error)
        }
    })

    // Get object
    router.get('/:id', (req, res) => {
        try {
            const item = db.findByKey(stringToKey(req.params.id))
            if (item) {
                res.json(resolver ? resolver(item) : item)
                return
            }
            res.status(404)
            res.json({ error: "NOT FOUND" })
        } catch (error) {
            res.status(500)
            res.json(error)
        }
    })

    // Create new object
    router.post('/', (req, res) => {
        try {
            const item = db.insert(req.body)
            res.json(resolver ? resolver(item) : item)
        } catch (error: any) {
            if (error.isJoi) {
                res.status(400)
                res.json({ ...error, error: "VALIDATION ERROR" })
                return
            }
            res.status(500)
            res.json(error)
        }
    })

    // Delete an object
    router.delete("/:id", (req, res) => {
        try {
            db.deleteByKey(stringToKey(req.params.id))
            res.json()
        } catch (error) {
            res.status(500)
            res.json(error)
        }
    })

    // Updates an object completely
    router.put('/:id', (req, res) => {
        try {
            const item = db.update(stringToKey(req.params.id), req.body)
            if (!item) {
                res.status(404)
                res.json({ error: "NOT FOUND" })
                return
            }
            res.json(resolver ? resolver(item) : item)
        } catch (error: any) {
            if (error.isJoi) {
                res.status(400)
                res.json({ ...error, error: "VALIDATION ERROR" })
                return
            }
            res.status(500)
            res.json(error)
        }
    })

    // Updates an object
    router.patch('/:id', (req, res) => {
        try {
            const item = db.update(stringToKey(req.params.id), req.body)
            if (!item) {
                res.status(404)
                res.json({ error: "NOT FOUND" })
                return
            }
            res.json(resolver ? resolver(item) : item)
        } catch (error: any) {
            if (error.isJoi) {
                res.status(400)
                res.json({ ...error, error: "VALIDATION ERROR" })
                return
            }
            res.status(500)
            res.json(error)
        }
    })

    return router
}



export const EventRouter = <K, T>(db: EventCRUD<K, T>, stringToKey: (s: string) => K) => {

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
        db.listByEmitter(
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
        db.removeByEmitter(stringToKey(req.params.id))
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

export const cronSequenceLink = (cronSequence: AppDB['cronSequenceLink'], stringToKey: (s: string) => BaseSequence['id'] | BaseCron['id']) => {

    const router = Router()
    // Link a Sequence to a list of crons
    router.post('/sequence/:id', (req, res) => {
        try {
            const sequence = cronSequence.linkSequence(stringToKey(req.params.id), req.body)
            if (!sequence) {
                res.status(404)
                res.json({ error: "NOT FOUND" })
                return
            }
            res.json(sequence)
        } catch (error: any) {
            if (error.isJoi) {
                res.status(400)
                res.json({ ...error, error: "VALIDATION ERROR" })
                return
            }
            res.status(500)
            res.json(error)
        }
    })
    // Link a cron to a list of Sequences
    router.post('/cron/:id', (req, res) => {
        try {
            const cron = cronSequence.linkCron(stringToKey(req.params.id), req.body)
            if (!cron) {
                res.status(404)
                res.json({ error: "NOT FOUND" })
                return
            }
            res.json(cron)
        } catch (error: any) {
            if (error.isJoi) {
                res.status(400)
                res.json({ ...error, error: "VALIDATION ERROR" })
                return
            }
            res.status(500)
            res.json(error)
        }
    })


    return router
}


export const authCRUD = (db: AppDB['adminManager']) => {

    const router = Router()

    router.post("/login", async (req, res) => {

        if (!db.isRegistered()) {
            res.status(409).json({ error: "Admin account not registered" })
            return
        }

        const { username, password } = req.body

        if (!username || !password) {
            res.status(400).json({ error: "Missing username or password" })
            return
        }

        const admin = db.getAdmin(username)

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

        if (db.isRegistered()) {
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

