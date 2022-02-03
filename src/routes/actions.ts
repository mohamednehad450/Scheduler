import { Express } from 'express'
import { AppDB } from '../db'


const routes = {
    RUN: "actions/run",
    ACTIVATE: 'actions/activate',
}


export default (app: Express, db: AppDB) => {

    // Run schedule
    app.post(routes.RUN, (req, res) => {

    })


    // Stop schedule
    app.delete(routes.RUN, (req, res) => {

    })


    // Running schedules
    app.get(routes.RUN, (req, res) => {

    })


    // Acivate schedule
    app.post(routes.ACTIVATE, (req, res) => {

    })


    // Deactivate schedule
    app.delete(routes.ACTIVATE, (req, res) => {

    })


    // Active schedules
    app.get(routes.ACTIVATE, (req, res) => {

    })
}