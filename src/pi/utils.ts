import { CronJob } from "cron";
import { AppDB, CronDbType } from "../db";



const cronTrigger = (db: AppDB, runSequences: (ids: CronDbType['CronSequence']) => void) => {

    const cronJobs = new Map<CronDbType['id'], { cron: string, job: CronJob }>()

    const runCron = (id: CronDbType['id']) => () => {
        db.cronDb.get(id)
            .then(cron => cron && runSequences(cron.CronSequence))
            .catch(err => {
                // TODO
            })
    }

    db.cronDb.list()
        .then(crons => crons.forEach(({ id, cron }) => {
            const cronJob = {
                cron,
                job: new CronJob(cron, runCron(id))
            }
            cronJob.job.start()
            cronJobs.set(id, cronJob)
        }))
        .catch(err => {
            // TODO
        })

    db.cronDb.addListener('insert', ({ id, cron }: CronDbType) => {
        const cronJob = {
            cron,
            job: new CronJob(cron, runCron(id))
        }
        cronJob.job.start()
        cronJobs.set(id, cronJob)
    })

    db.cronDb.addListener('remove', (id: CronDbType['id']) => {
        cronJobs.get(id)?.job.stop()
        cronJobs.delete(id)
    })

    db.cronDb.addListener('update', ({ id, cron }: CronDbType) => {
        const oldCronJob = cronJobs.get(id)
        if (!oldCronJob) {
            // Inconsistent state : TODO
            return
        }
        if (oldCronJob.cron !== cron) {
            oldCronJob.job.stop()
            const cronJob = {
                cron,
                job: new CronJob(cron, runCron(id))
            }
            cronJob.job.start()
            cronJobs.set(id, cronJob)
        }
    })
}


export {
    cronTrigger
}