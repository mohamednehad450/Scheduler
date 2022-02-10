import moment from "moment";
import { DB } from "../db/db";
import PinManager from "./PinManager";
import { ID, Pin, Schedule } from "./utils";

type CallBack<T> = (err: Error | null | undefined, v?: T) => void

interface ScheduleManagerInterface {
    run: (id: ID, cb: CallBack<void>) => void
    stop: (id: ID, cb: CallBack<void>) => void
    isRunning: (id: ID, cb: CallBack<boolean>) => void
    running: (cb: CallBack<ID[]>) => void
}

export default class ScheduleManager implements ScheduleManagerInterface {

    db: DB<Schedule>
    pm: PinManager

    runningPin = new Map<ID,
        {
            pins: {
                offTimer: NodeJS.Timeout,
                onTimer: NodeJS.Timeout,
                pin: Pin
            }[],
            clearTimer: NodeJS.Timeout
        }>()


    constructor(db: DB<Schedule>, pm: PinManager) {
        this.db = db
        this.pm = pm
    }

    run = (id: ID, cb: CallBack<void>) => {
        this.db.get(id, (err, s) => {
            if (err) {
                cb(err)
                return
            }
            if (!s) return

            if (this.runningPin.has(s.id)) {
                cb(null)
                return
            }

            const lastOffTime = Math.max(...s.pins.map(p => moment.duration(p.offset).add(p.duration).as('milliseconds')))

            this.runningPin.set(s.id, {
                pins: s.pins.map((p) => {
                    return {
                        offTimer: setTimeout(() => {
                            this.pm.stop(p.pin.id, (err) => {
                                // TODO
                            })
                        }, moment.duration(p.offset).add(p.duration).as('milliseconds')),
                        onTimer: setTimeout(() => {
                            this.pm.run(p.pin.id, (err) => {
                                // TODO
                            })
                        }, moment.duration(p.offset).as('milliseconds')),
                        pin: p.pin
                    }
                }),
                clearTimer: setTimeout(() => {
                    this.runningPin.delete(s.id)
                }, lastOffTime),
            })
            cb(null)
        })
    }


    stop = (id: ID, cb: CallBack<void>) => {
        if (!this.runningPin.has(id)) {
            cb(null)
            return
        }

        const running = this.runningPin.get(id)
        running?.pins.map(({ offTimer, onTimer, pin }) => {
            clearTimeout(onTimer)
            clearTimeout(offTimer)
            this.pm.stop(pin.id, (err) => cb(err))
        })
        running && clearTimeout(running?.clearTimer)
        this.runningPin.delete(id)
        cb(null)

    }



    running = (cb: CallBack<ID[]>) => {
        cb(null, [...this.runningPin.keys()])
    }


    isRunning = (id: ID, cb: CallBack<boolean>) => {
        cb(null, this.runningPin.has(id))
    }
}