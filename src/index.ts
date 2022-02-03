import express from 'express'
import bodyParser from 'body-parser'
import routes from './routes'
import { appDb } from './db';


const PORT = 8000;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

routes(app, appDb)

app.listen(PORT, () => { console.log(`Listening on PORT: ${PORT}`) })

