import { CronJob } from "cron";
import { AppDB, CronDbType } from "../db";



const cronTrigger = (db: AppDB, runSequences: (ids: CronDbType['CronSequence']) => void) => {

    const cronJobs = new Map<CronDbType['id'], CronDbType & { job: CronJob }>()

    const runCron = (id: CronDbType['id']) => () => {
        db.cronDb.get(id)
            .then(cron => cron && runSequences(cron.CronSequence))
            .catch(err => {
                // TODO
            })
    }

    db.cronDb.list()
        .then(crons => crons.forEach(c => {
            const cronJob = {
                ...c,
                job: new CronJob(c.cron, runCron(c.id))
            }
            cronJob.job.start()
            cronJobs.set(c.id, cronJob)
        }))

    db.cronDb.addListener('insert', (cron: CronDbType) => {
        const cronJob = {
            ...cron,
            job: new CronJob(cron.cron, runCron(cron.id))
        }
        cronJob.job.start()
        cronJobs.set(cron.id, cronJob)
    })

    db.cronDb.addListener('remove', (id: CronDbType['id']) => {
        const oldCron = cronJobs.get(id)
        if (!oldCron) return
        oldCron.job.stop()
        cronJobs.delete(id)
    })

    db.cronDb.addListener('update', (newCron: CronDbType) => {
        const oldCron = cronJobs.get(newCron.id)
        if (!oldCron) {
            // Inconsistent state : TODO
            return
        }
        if (oldCron.cron !== newCron.cron) {
            oldCron.job.stop()
            const cron = {
                ...newCron,
                job: new CronJob(newCron.cron, runCron(newCron.id))
            }
            cron.job.start()
            cronJobs.set(cron.id, cron)
        } else {
            cronJobs.set(newCron.id, { ...oldCron, ...newCron })
        }
    })
}


export {
    cronTrigger
}