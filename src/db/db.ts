import { v4, } from "uuid"
import { writeFile, writeFileSync, readdir, readFile, readFileSync, rm, existsSync } from 'fs'
import { join } from 'path'
import EventEmitter from "events"


export interface withId<T> {
    id: T
}

type CallBack<T> = (err: Error | undefined | null, t?: T) => void

interface DB<key, T extends withId<key>> extends EventEmitter {
    insert: (obj: Partial<T>, cb: CallBack<T>) => void
    get: (id: key, cb: CallBack<T>) => void
    set: (obj: Partial<T>, cb: CallBack<T>) => void
    remove: (id: key, cb: CallBack<void>) => void
    update: (id: key, obj: Partial<T>, cb: CallBack<T>) => void
    list: (cb: CallBack<T[]>) => void
    exists: (id: key) => boolean
}

const nameFromId = (id: string) => `${id}.json`


// TODO: Error Handling
// TODO: Adding Custom De/Serializer
// TODO: Adding Validators
class LocalJsonDb<T extends withId<string>> extends EventEmitter implements DB<string, T> {

    path: string;
    validator: (t: Partial<T>) => T

    constructor(path: string, validator: (t: Partial<T>) => T) {
        super()
        this.path = path
        this.validator = validator
    }

    exists = (id: T['id']) => existsSync(join(this.path, nameFromId(id)))

    insert = (json: Partial<T>, cb: CallBack<T>) => {
        try {
            const obj: T = {
                ...this.validator(json),
                id: v4()
            }
            writeFile(
                join(this.path, nameFromId(obj.id)),
                JSON.stringify(obj),
                (err) => {
                    if (err) {
                        cb(err)
                        return
                    }
                    cb(null, obj)
                    this.emit('insert', obj)
                }
            )
        } catch (error: any) {
            // Validation error
            cb(error)
        }
    }


    get = (id: T['id'], cb: CallBack<T>) => this.exists(id) ?
        readFile(
            join(this.path, nameFromId(id)),
            'utf-8',
            (err, date) => cb(err, JSON.parse(date))
        ) :
        cb(Error('Doesn\'t exist'))


    set = (json: Partial<T>, cb: CallBack<T>) => {

        try {
            const newObj = this.validator(json)

            if (!newObj.id || !this.exists(newObj.id)) {
                cb(Error('Doesn\'t exist'))
                return
            }
            writeFile(
                join(this.path, nameFromId(newObj.id)),
                JSON.stringify(newObj),
                (err) => {
                    if (err) {
                        cb(err)
                        return
                    }
                    cb(null, newObj)
                    this.emit('update', newObj)
                }
            )
        } catch (error: any) {
            // Validation Error
            cb(error)
        }

    }

    remove = (id: T['id'], cb: CallBack<void>) => this.exists(id) ?
        rm(join(this.path, nameFromId(id)), (err) => {
            if (err) {
                cb(err)
                return
            }
            cb(null)
            this.emit('remove', id)
        }) :
        cb(Error('Doesn\'t exist'))


    update = (id: T['id'], json: Partial<T>, cb: CallBack<T>) => this.exists(id) ?
        this.get(id, (err, oldObj) => {
            if (err) {
                cb(err)
                return
            }
            oldObj &&
                this.set({ ...oldObj, ...json, id }, cb)

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

class LocalObjectDb<T extends withId<string | number>> extends EventEmitter implements DB<string | number, T> {

    filePath: string
    file: T[]
    validator: (t: Partial<T>) => T

    constructor(path: string, fileName: string, validator: (t: Partial<T>) => T) {
        super()
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

    exists = (id: T['id']) => {
        return !!this.file.find(obj => obj.id === id)
    };


    insert = (json: Partial<T>, cb: CallBack<T>) => {

        try {
            const newObj = this.validator(json)

            if (this.exists(newObj.id)) {
                cb(new Error('object already exist'))
                return
            }

            this.file.push(newObj)
            this.updateFile((err) => {
                if (err) {
                    cb(err)
                    return
                }
                cb(null, newObj)
                this.emit('insert', newObj)
            })
        } catch (error: any) {
            // Validation Error
            cb(error)
        }


    };


    get = (id: T['id'], cb: CallBack<T>) => {
        const obj = this.file.find(obj => obj.id === id)
        obj ? cb(null, obj) : cb(new Error('object doesn\'t exist'))
    };


    set = (obj: Partial<T>, cb: CallBack<T>) => {
        try {

            const newObj = this.validator(obj)

            const index = this.file.findIndex(old => old.id === newObj.id)
            if (index < 0) {
                cb(new Error('Object doesn\'t exist'))
                return
            }
            this.file[index] = newObj
            this.updateFile((err) => {
                if (err) {
                    cb(err)
                    return
                }
                cb(null, newObj)
                this.emit('update', newObj)
            })
        } catch (error: any) {
            // Validation error
            cb(error)
        }
    };


    update = (id: T['id'], obj: Partial<T>, cb: CallBack<T>) => {
        const index = this.file.findIndex(old => old.id === id)
        if (index < 0) {
            cb(new Error('Object doesn\'t exist'))
            return
        }
        this.set({ ...this.file[index], ...obj, id }, cb)
    };


    list = (cb: CallBack<T[]>) => {
        cb(null, this.file)
    };


    remove = (id: T['id'], cb: CallBack<void>) => {
        this.file = this.file.filter(obj => obj.id !== id)
        this.updateFile((err) => {
            if (err) {
                cb(err)
                return
            }
            cb(null)
            this.emit('remove', id)
        })
    };

}

export { LocalJsonDb, LocalObjectDb, DB }