import { v4, } from "uuid"
import { writeFile, readdir, readFile, readFileSync, rm, existsSync } from 'fs'
import { join } from 'path'


interface jsonWithId {
    id: string
}

type CallBack<T> = (err: Error | undefined | null, t?: T) => void

interface DB<T extends jsonWithId> {
    insert: (obj: T, cb: CallBack<T>) => void
    get: (id: string, cb: CallBack<T>) => void
    set: (obj: T, cb: CallBack<T>) => void
    remove: (id: string, cb: CallBack<void>) => void
    update: (id: string, obj: Partial<T>, cb: CallBack<T>) => void
    list: (cb: CallBack<T[]>) => void
    exists: (id: string) => boolean
}

const nameFromId = (id: string) => `${id}.json`


// TODO: Error Handling
// TODO: Adding Custom De/Serializer
// TODO: Adding Validators
class LocalJsonDb<T extends jsonWithId> implements DB<T> {
    path: string;
    constructor(path: string) {
        this.path = path
    }


    exists = (id: string) => existsSync(join(this.path, nameFromId(id)))


    insert = (json: T, cb: CallBack<T>) => {
        const obj: T = {
            ...json,
            id: v4()
        }
        writeFile(
            join(this.path, nameFromId(obj.id)),
            JSON.stringify(obj),
            (err) => cb(err, obj)
        )
    }


    get = (id: string, cb: CallBack<T>) => this.exists(id) ?
        readFile(
            join(this.path, nameFromId(id)),
            'utf-8',
            (err, date) => cb(err, JSON.parse(date))
        ) :
        cb(Error('Doesn\'t exist'))


    set = (json: T, cb: CallBack<T>) => this.exists(json.id) ?
        writeFile(
            join(this.path, nameFromId(json.id)),
            JSON.stringify(json),
            (err) => cb(err, json)
        ) :
        cb(Error('Doesn\'t exist'))


    remove = (id: string, cb: CallBack<void>) => this.exists(id) ?
        rm(join(this.path, nameFromId(id)), (err) => cb(err)) :
        cb(Error('Doesn\'t exist'))


    update = (id: string, json: Partial<T>, cb: CallBack<T>) => this.exists(id) ?
        this.get(id, (err, oldObj) => {
            if (err) {
                cb(err)
                return
            }
            oldObj && cb(null, {
                ...oldObj,
                ...json,
            })

        }) :
        cb(Error('Doesn\'t exist'))


    list = (cb: CallBack<T[]>) => {
        readdir(this.path, (err, files) => {
            if (err) {
                cb(err)
                return
            }
            const objs = files.map(f => JSON.parse(readFileSync(join(this.path, f), 'utf-8')))
            cb(null, objs)
        })
    }
}
export { LocalJsonDb, DB }