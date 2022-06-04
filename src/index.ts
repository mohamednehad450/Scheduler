import express from 'express'
import bodyParser from 'body-parser'
import { Server } from 'socket.io'
import { createServer, } from 'http'
import routes from './routes'
import { appDb } from './db';


const PORT = 8000;

const app = express();

const httpServer = createServer(app)

const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

routes(app, io, appDb)

httpServer.listen(PORT)