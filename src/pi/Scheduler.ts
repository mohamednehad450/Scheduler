
import { Timer, setInterval } from 'later'
import { AppDB } from '../db'
import PinManager from './PinManager'
import ScheduleManager from './ScheduleManager'
import { ID } from './utils'

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface SchedulerInterface {
    activate: (id: ID, cb: CallBack<void>) => void
    deactivate: (id: ID, cb: CallBack<void>) => void
    isActive: (id: ID, cb: CallBack<boolean>) => void
    activeSchedules: (cb: CallBack<ID[]>) => void
    run: (id: ID, cb: CallBack<void>) => void
    stop: (id: ID, cb: CallBack<void>) => void
    isRunning: (id: ID, cb: CallBack<boolean>) => void
    running: (cb: CallBack<ID[]>) => void
}

class Scheduler implements SchedulerInterface {

    active = new Map<ID, Timer>()

    db: AppDB
    pinManager: PinManager
    scheduleManager: ScheduleManager



    constructor(db: AppDB, pinManager: PinManager) {
        this.db = db
        this.pinManager = pinManager
        this.scheduleManager = new ScheduleManager(db.schedulesDb, pinManager)
        this.active = new Map()
        db.activeSchedules.list((err, ids) => {
            if (err) {
                // TODO
                return
            }
            ids && ids.forEach(({ id }) => this.activate(id, (err) => {
                if (err) {
                    // TODO
                    return
                }
            }))
        })
    }


    run = (id: ID, cb: CallBack<void>) => {
        this.scheduleManager.run(id, (err) => {
            if (err) {
                cb(err)
                return
            }
            this.db.schedulesDb.update(id, { lastRun: new Date() }, (err) => {
                // TODO
            })
            cb(null)
        })
    };


    stop = (id: ID, cb: CallBack<void>) => {
        this.db.schedulesDb.get(id, (err, s) => {
            if (err) {
                cb(err)
                return
            }

            s && this.scheduleManager.stop(s.id, (err) => {
                if (err) {
                    cb(err)
                    return
                }
                this.db.schedulesDb.update(s.id, { lastRun: new Date() }, (err) => {
                    // TODO
                })
                cb(null)
            })
        })
    };


    isRunning = (id: ID, cb: CallBack<boolean>) => {
        this.scheduleManager.isRunning(id, cb)
    };


    activate = (id: ID, cb: CallBack<void>) => {
        if (this.active.has(id)) {
            cb(null)
            return
        }
        this.db.schedulesDb.get(id, (err, s) => {
            if (err) {
                cb(err)
                return
            }
            s && this.active.set(s.id, setInterval(() => {
                this.scheduleManager.run(id, (err) => {
                    // TODO
                })
            }, s.sched)) &&
                this.db.activeSchedules.insert({ id: s.id }, (err,) => {
                    if (err) {
                        cb(err)
                        return
                    }
                    cb(null)
                })

        })

    };


    deactivate = (id: ID, cb: CallBack<void>) => {
        if (!this.active.has(id)) {
            cb(null)
            return
        }
        this.active.get(id)?.clear()
        this.active.delete(id)
        this.db.activeSchedules.remove(id, cb)
    };


    isActive = (id: ID, cb: CallBack<boolean>) => {
        cb(null, this.active.has(id))
    };


    running = (cb: CallBack<ID[]>) => {
        this.scheduleManager.running(cb)
    };


    activeSchedules = (cb: CallBack<ID[]>) => {
        cb(null, [...this.active.keys()])
    }
}



export default Scheduler