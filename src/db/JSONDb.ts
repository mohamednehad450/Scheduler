import EventEmitter from "events";
import { DB } from "./db";
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { ObjectSchema } from "joi";


export default class JSONDb<K, T> extends EventEmitter implements DB<K, T>  {

    dir: string
    filename: string
    map: Map<K, T>
    validator: ObjectSchema         // Validate existing objects
    newValidator: ObjectSchema      // validate new object: fill in defaults, keygen
    partialValidator: ObjectSchema  // validate partial updates: 
    keyExtractor: (item: T) => K

    constructor(dir: string, filename: string, validator: ObjectSchema, newValidator: ObjectSchema, partialValidator: ObjectSchema, keyExtractor: (item: T) => K) {
        super()
        this.dir = dir
        this.filename = filename
        this.map = new Map()
        this.validator = validator
        this.newValidator = newValidator
        this.partialValidator = partialValidator
        this.keyExtractor = keyExtractor
    }

    init = async () => {
        if (!existsSync(this.dir)) {
            await mkdir(this.dir)
        }

        const file = `${this.dir}/${this.filename}.json`

        if (!existsSync(file)) {
            await writeFile(file, "[]")
            return
        }

        const content = await readFile(file, 'utf-8')
        // Load if valid
        try {
            const arr = JSON.parse(content)
            if (!Array.isArray(arr)) throw Error('invalid JSONDb file')

            for (const item of arr) {
                const { error, value } = this.validator.validate(item)

                !error && value &&
                    this.map.set(this.keyExtractor(value), value)
            }

            if (this.map.size < arr.length) {
                await writeFile(file, JSON.stringify([...this.map.values()]))
            }

        } catch (error) {
            console.log(`File: "${file}" is invalid, Erasing...`)
            await writeFile(file, "[]")
        }
    }



    private save = async () => {
        await writeFile(`${this.dir}/${this.filename}.json`, JSON.stringify([...this.map.values()]))
    }


    insert = async (arg: any) => {
        const { value, error } = this.newValidator.validate(arg)
        if (error || !value) throw error

        this.map.set(this.keyExtractor(value), value)
        this.save()
        this.emit('insert', value)
        return value
    }



    update = async (key: K, arg: any) => {
        if (!this.map.has(key)) return null

        const { value, error } = this.partialValidator.validate(arg)
        if (error || !value) throw error

        const updatedObject = { ...this.map.get(key), ...value }

        this.map.set(this.keyExtractor(updatedObject), updatedObject)
        this.save()

        this.emit('update', updatedObject)
        return updatedObject
    }

    set = this.update

    remove = async (key: K) => {
        if (!this.map.has(key)) return
        this.map.delete(key)
        await this.save()
        this.emit('remove', key)
    }


    list = async () => [...this.map.values()]
    get = async (key: K) => this.map.get(key) || null

}