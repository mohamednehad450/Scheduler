import JSONDb from "./JSONDb"
import { BaseCron, BaseSequence, Pin } from "./types"


type ForeignKeyValidator<K, T, FK> = (db: JSONDb<K, T>) => (fk: FK) => Promise<void>

const channelsExistsValidator: ForeignKeyValidator<Pin['channel'], Pin, Set<Pin['channel']>> = (db) => async (channels) => {
    const pins = await Promise.all([...channels].map(channel => {
        const a = async () => {
            return {
                exists: await db.exists(channel),
                channel
            }
        }
        return a()
    }))
    if (pins.some(p => !p.exists)) {
        throw new Error(`Channels: [${pins.filter(p => !p.exists).map(p => p.channel).join(", ")}] are not defined`)
    }
}

const sequenceExistsValidator: ForeignKeyValidator<BaseSequence['id'], BaseSequence, BaseSequence['id']> = (db) => async (sequenceId) => {
    if (!await db.exists(sequenceId))
        throw new Error(`Sequence: ${sequenceId} doesn't exist.`)
}

const cronExistsValidator: ForeignKeyValidator<BaseCron['id'], BaseCron, BaseCron['id']> = (db) => async (cronId) => {
    if (!await db.exists(cronId))
        throw new Error(`Cron: ${cronId} doesn't exist.`)
}



export {
    channelsExistsValidator,
    sequenceExistsValidator,
    cronExistsValidator,
}

