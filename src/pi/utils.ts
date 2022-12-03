import { CronJob } from "cron";
import { AppDB, CronDbType, SequenceDBType } from "../db";
import Sequence from "./Sequence";


class CronManager {

    jobs: {
        [key: CronDbType['id']]:
        { cron: string, job: CronJob }
    } = {}
    callback: (id: CronDbType['id']) => void


    constructor(crons: { id: CronDbType['id'], cron: CronDbType['cron'] }[], callback: (id: CronDbType['id']) => void) {
        this.callback = callback
        this.jobs = crons.reduce((acc, { id, cron }) => {
            const job = new CronJob(cron, () => this.callback(id))
            return {
                ...acc,
                [id]: {
                    cron,
                    job
                },
            }
        }, {})
    }


    startAll = () => {
        [...Object.keys(this.jobs)].forEach((id: any) => this.jobs[id].job.start())
    }


    start = (id: CronDbType['id']) => {
        if (!this.jobs[id]) return
        this.jobs[id].job.start()
    }


    stopAll = () => {
        [...Object.keys(this.jobs)].map((id: any) => this.jobs[id].job.stop())
    }


    stop = (id: CronDbType['id']) => {
        if (!this.jobs[id]) return
        this.jobs[id].job.stop()
    }


    insert = (id: CronDbType['id'], cron: CronDbType['cron']) => {
        if (this.jobs[id]) return
        const job = {
            cron,
            job: new CronJob(cron, () => this.callback(id))
        }
        this.jobs[id] = job
    }


    remove = (id: CronDbType['id']) => {
        this.stop(id)
        delete this.jobs[id]
    }


    update = (id: CronDbType['id'], cron: CronDbType['cron']) => {
        if (!this.jobs[id]) return
        const job = this.jobs[id]

        if (job.cron === cron) return

        const wasRunning = job.job.running
        job.job.stop()

        job.cron = cron
        job.job = new CronJob(cron, () => this.callback(id))

        this.jobs[id] = job
        wasRunning && job.job.start()
    }
}


const triggerCron = (cronDb: AppDB['cronDb'], id: CronDbType['id'], sequences: { [key: SequenceDBType['id']]: Sequence }) => {
    cronDb.get(id)
        .then(cron => cron && runIfActive(cron.CronSequence, sequences))
        .catch(err => {
            console.error(`Failed to trigger Cronjob (id:${id}), database error`, err)
            // TODO
        })
}



const runIfActive = (ids: CronDbType['CronSequence'], sequences: { [key: SequenceDBType['id']]: Sequence }) => {
    ids.forEach(({ sequence: { id } }) => {
        if (sequences[id]?.isActive()) {
            sequences[id]?.run()
        }
    })
}


export {
    CronManager,
    triggerCron,
    runIfActive,
}