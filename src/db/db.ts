import { v4, } from "uuid"
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { writeFile, readdir, readFile, rm, } from 'fs/promises'
import { join } from 'path'
import EventEmitter from "events"


export interface withId<T> {
    id: T
}

type CallBack<T> = (err: Error | undefined | null, t?: T) => void

interface DB<key, T extends withId<key>> extends EventEmitter {
    insert: (obj: Partial<T>,) => Promise<T>
    get: (id: key,) => Promise<T>
    set: (obj: Partial<T>,) => Promise<T>
    remove: (id: key,) => Promise<void>
    update: (id: key, obj: Partial<T>,) => Promise<T>
    list: () => Promise<T[]>
    exists: (id: key) => Promise<boolean>
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

    exists = async (id: T['id']) => existsSync(join(this.path, nameFromId(id)))

    insert = async (json: Partial<T>) => {
        const obj: T = {
            ...this.validator(json),
            id: v4()
        }

        await writeFile(
            join(this.path, nameFromId(obj.id)),
            JSON.stringify(obj))

        this.emit('insert', obj)

        return obj
    }


    get = async (id: T['id']) => {
        if (await this.exists(id)) {

            const obj = await readFile(
                join(this.path, nameFromId(id)),
                'utf-8')

            return this.validator(JSON.parse(obj))
        }
        throw new Error('Doesn\'t exist')
    }

    set = async (json: Partial<T>) => {

        const newObj = this.validator(json)

        if (await this.exists(newObj.id)) {

            await writeFile(
                join(this.path, nameFromId(newObj.id)),
                JSON.stringify(newObj))

            this.emit('update', newObj)
            return newObj
        }

        throw new Error('Doesn\'t exist')
    }

    remove = async (id: T['id'],) => {
        if (await this.exists(id)) {

            await rm(join(this.path, nameFromId(id)))

            this.emit('remove', id)
        }
        throw new Error('Doesn\'t exist')

    }
    update = async (id: T['id'], json: Partial<T>) => {
        if (await this.exists(id)) {

            const oldObj = await this.get(id)

            // this.set emits the update event
            const newObj = await this.set({ ...oldObj, ...json, id })

            return newObj

        }
        throw new Error('Doesn\'t exist')
    }


    list = async () => {
        const files = await readdir(this.path)
        const objs: T[] = []
        for (const f of files) {
            objs.push(
                // Validator should not throw any errors here
                this.validator(
                    JSON.parse(
                        await readFile(join(this.path, f), 'utf-8'))))
        }
        return objs
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
        }
        else {
            this.file = JSON.parse(readFileSync(this.filePath, 'utf-8'))
        }
    }


    private updateFile = async () => {
        await writeFile(this.filePath, JSON.stringify(this.file))
    }


    exists = async (id: T['id']) => {
        return !!this.file.find(obj => obj.id === id)
    };


    insert = async (json: Partial<T>) => {

        const newObj = this.validator(json)

        if (await this.exists(newObj.id)) {
            throw new Error('object already exist')
        }

        this.file.push(newObj)

        await this.updateFile()

        this.emit('insert', newObj)

        return newObj
    };


    get = async (id: T['id'],) => {
        const obj = this.file.find(obj => obj.id === id)
        if (obj) {
            return obj
        }
        throw new Error('object doesn\'t exist')
    };


    set = async (obj: Partial<T>) => {

        const newObj = this.validator(obj)

        const index = this.file.findIndex(old => old.id === newObj.id)
        if (index >= 0) {

            this.file[index] = newObj

            await this.updateFile()

            this.emit('update', newObj)

            return newObj
        }

        throw new Error('Object doesn\'t exist')
    }


    update = async (id: T['id'], obj: Partial<T>) => {
        const index = this.file.findIndex(old => old.id === id)
        if (index < 0) {
            throw new Error('Object doesn\'t exist')
        }
        return this.set({ ...this.file[index], ...obj, id })
    };


    list = async () => this.file


    remove = async (id: T['id']) => {
        this.file = this.file.filter(obj => obj.id !== id)
        await this.updateFile()
        this.emit('remove', id)
    };

}

export { LocalJsonDb, LocalObjectDb, DB }