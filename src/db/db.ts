import { v4, } from "uuid"
import { writeFile, writeFileSync, readdir, readFile, readFileSync, rm, existsSync } from 'fs'
import { join } from 'path'


export interface withId {
    id: string | number
}

type CallBack<T> = (err: Error | undefined | null, t?: T) => void

interface DB<T extends withId> {
    insert: (obj: Partial<T>, cb: CallBack<T>) => void
    get: (id: withId['id'], cb: CallBack<T>) => void
    set: (obj: Partial<T>, cb: CallBack<T>) => void
    remove: (id: withId['id'], cb: CallBack<void>) => void
    update: (id: withId['id'], obj: Partial<T>, cb: CallBack<T>) => void
    list: (cb: CallBack<T[]>) => void
    exists: (id: withId['id']) => boolean
}

const nameFromId = (id: withId['id']) => `${id}.json`


// TODO: Error Handling
// TODO: Adding Custom De/Serializer
// TODO: Adding Validators
class LocalJsonDb<T extends withId> implements DB<T> {

    path: string;
    validator: (t: Partial<T>) => T

    constructor(path: string, validator: (t: Partial<T>) => T) {
        this.path = path
        this.validator = validator
    }

    exists = (id: withId['id']) => existsSync(join(this.path, nameFromId(id)))

    insert = (json: Partial<T>, cb: CallBack<T>) => {
        try {
            const obj: T = {
                ...this.validator(json),
                id: v4()
            }
            writeFile(
                join(this.path, nameFromId(obj.id)),
                JSON.stringify(obj),
                (err) => cb(err, obj)
            )
        } catch (error: any) {
            // Validation error
            cb(error)
        }
    }


    get = (id: withId['id'], cb: CallBack<T>) => this.exists(id) ?
        readFile(
            join(this.path, nameFromId(id)),
            'utf-8',
            (err, date) => cb(err, JSON.parse(date))
        ) :
        cb(Error('Doesn\'t exist'))


    set = (json: Partial<T>, cb: CallBack<T>) => {

        if (!json.id || !this.exists(json.id)) {
            cb(Error('Doesn\'t exist'))
            return
        }

        try {
            const newObj = this.validator(json)
            writeFile(
                join(this.path, nameFromId(json.id)),
                JSON.stringify(newObj),
                (err) => cb(err, newObj)
            )
        } catch (error: any) {
            // Validation Error
            cb(error)
        }

    }

    remove = (id: withId['id'], cb: CallBack<void>) => this.exists(id) ?
        rm(join(this.path, nameFromId(id)), (err) => cb(err)) :
        cb(Error('Doesn\'t exist'))


    update = (id: withId['id'], json: Partial<T>, cb: CallBack<T>) => this.exists(id) ?
        this.get(id, (err, oldObj) => {
            if (err) {
                cb(err)
                return
            }
            oldObj &&
                this.set({ ...oldObj, ...json, id: oldObj?.id }, cb)

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

class LocalObjectDb<T extends withId> implements DB<T> {

    filePath: string
    file: T[]
    validator: (t: Partial<T>) => T

    constructor(path: string, fileName: string, validator: (t: Partial<T>) => T) {
        this.filePath = join(path, nameFromId(fileName))
        this.validator = validator
        if (!existsSync(this.filePath)) {
            writeFileSync(this.filePath, '[]')
            this.file = []
            return
        }
        this.file = JSON.parse(readFileSync(this.filePath, 'utf-8'))
    }

    private updateFile = (cb: CallBack<void>) => {
        writeFile(this.filePath, JSON.stringify(this.file), cb)
    }

    exists = (id: withId['id']) => {
        return !!this.file.find(obj => obj.id === id)
    };


    insert = (json: Partial<T>, cb: CallBack<T>) => {

        if (this.exists(json.id || '')) {
            cb(new Error('object already exist'))
            return
        }

        try {
            const newObj = this.validator(json)
            this.file.push(newObj)
            this.updateFile((err) => {
                err ? cb(err) : cb(null, newObj)
            })
        } catch (error: any) {
            // Validation Error
            cb(error)
        }


    };


    get = (id: withId['id'], cb: CallBack<T>) => {
        const obj = this.file.find(obj => obj.id === id)
        obj ? cb(null, obj) : cb(new Error('object doesn\'t exist'))
    };


    set = (obj: Partial<T>, cb: CallBack<T>) => {

        const index = this.file.findIndex(old => old.id === obj.id)
        if (index < 0) {
            cb(new Error('obj doesn\'t exist'))
            return
        }

        try {
            const newObj = this.validator(obj)
            this.file[index] = newObj
            this.updateFile((err) => err ? cb(err) : cb(null, newObj))
        } catch (error: any) {
            // Validation error
            cb(error)
        }
    };


    update = (id: withId['id'], obj: Partial<T>, cb: CallBack<T>) => {
        const index = this.file.findIndex(old => old.id === obj.id)
        if (index < 0) {
            cb(new Error('obj doesn\'t exist'))
            return
        }
        this.set({ ...this.file[index], ...obj }, cb)
    };


    list = (cb: CallBack<T[]>) => {
        cb(null, this.file)
    };


    remove = (id: withId['id'], cb: CallBack<void>) => {
        this.file = this.file.filter(obj => obj.id !== id)
        this.updateFile((err) => err ? cb(err) : cb(null))
    };

}

export { LocalJsonDb, LocalObjectDb, DB }