import { compare } from "bcrypt"
import { Handler, Router } from "express"
import { sign, verify } from "jsonwebtoken"
import AdminManager from "../db/AdminManager"




export default function AuthRouter(adminManager: AdminManager) {

    const router = Router()

    router.post("/login", async (req, res) => {

        if (!adminManager.isRegistered()) {
            res.status(409).json({ error: "Admin account not registered" })
            return
        }

        const { username, password } = req.body

        if (!username || !password) {
            res.status(400).json({ error: "Missing username or password" })
            return
        }

        const admin = adminManager.getAdmin(username)

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

        if (adminManager.isRegistered()) {
            res.status(409).json({ error: "Admin account already registered" })
            return
        }

        adminManager.register(req.body)
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

