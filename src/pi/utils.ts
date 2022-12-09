import { AppDB, CronDbType } from "../db";
import PinManager, { RunnableSequence } from "./PinManager";

const triggerCron = (id: CronDbType['id'], db: AppDB, pm: PinManager) => {

    db.prisma.sequence.findMany({
        where: { CronSequence: { some: { cronId: id }, }, active: true },
        include: { orders: { include: { Pin: { select: { label: true } } } } },
        orderBy: { lastRun: 'asc' }
    })
        .then(sequences => {
            const updates: any = sequences.map(s => runSequence(s, pm, db)).filter(u => u)
            return db.prisma.$transaction(updates)
        })
        .catch(err => {
            console.error(`Failed to trigger Cronjob (id:${id}), database error`, err)
            // TODO
        })
}

const runSequence = (s: RunnableSequence, pm: PinManager, db: AppDB) => {
    const err = pm.run(s)
    if (err) return false
    const lastRun = new Date()
    return db.prisma.sequence.update({
        where: { id: s.id },
        data: { lastRun }
    })
}


export {
    triggerCron,
    runSequence,
}