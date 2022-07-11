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
// Enable Cors
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "*");
    next();
});

routes(app, io, appDb)

httpServer.listen(PORT)