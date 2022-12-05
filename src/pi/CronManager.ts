import { CronJob } from "cron"
import { CronDbType } from "../db"


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


export default CronManager