import { Express } from "express"
import { AppDB } from "../db"
import { CRUD } from "./utils"

const route = '/pin'

export default (app: Express, db: AppDB) => CRUD(app, db.pinsDb, route, s => Number(s))