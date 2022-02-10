import { Express } from "express"
import { AppDB } from "../db"
import { validatePin } from "../pi/utils"
import { CRUD } from "./utils"

const route = '/pin'

export default (app: Express, db: AppDB) => CRUD(app, db.pinsDb, route, validatePin)