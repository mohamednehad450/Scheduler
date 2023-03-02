import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { Db, ObjectValidators, Pagination, Predict } from './misc';


export default class JSONDb<K, T> implements Db<K, T>  {

    PER_PAGE = 20
    dir: string
    filename: string
    map: Map<K, T>

    validators: ObjectValidators<T>
    keyExtractor: (item: T) => K

    constructor(dir: string, filename: string, validators: ObjectValidators<T>, keyExtractor: (item: T) => K) {
        this.dir = dir
        this.filename = filename
        this.map = new Map()
        this.validators = validators
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

        try {
            const arr = JSON.parse(content)
            if (!Array.isArray(arr)) throw Error('invalid JSONDb file')

            if (!this.validators.loadValidator) {
                arr.map(item => this.map.set(this.keyExtractor(item), item))
                return
            }

            // Load if valid
            for (const item of arr) {
                const { error, value } = this.validators.loadValidator.validate(item)
                !error && value &&
                    this.map.set(this.keyExtractor(value), value)
            }

            // Write if found invalid items
            if (this.map.size < arr.length) {
                await writeFile(file, JSON.stringify([...this.map.values()]))
            }

        } catch (error) {
            console.log(`File: "${file}" is an invalid JSON file, Erasing...`)
            await writeFile(file, "[]")
        }
    }



    private save = async () => {
        await writeFile(`${this.dir}/${this.filename}.json`, JSON.stringify([...this.map.values()]))
    }

    private applyPagination = (list: T[], pagination?: Pagination): T[] => {
        if (!pagination) return list.sort()
        const perPage = pagination.perPage || this.PER_PAGE
        const page = pagination.page || 0
        return list
            .sort(pagination.sort)
            .slice(
                page * perPage,
                (page * perPage) + perPage
            )
    }


    insert = async (arg: T) => {

        if (!this.validators.inputValidator) {
            if (this.map.has(this.keyExtractor(arg))) throw new Error("Object already exists.")

            this.map.set(this.keyExtractor(arg), arg)
            this.save()
            return arg as T
        }

        const { value, error } = this.validators.inputValidator.validate(arg)
        if (error || !value) throw error

        if (this.map.has(this.keyExtractor(value))) throw new Error("Object already exists.")

        this.map.set(this.keyExtractor(value), value)
        this.save()
        return value as T
    }



    update = async (key: K, arg: Partial<T>) => {
        if (!this.map.has(key)) return

        if (!this.validators.updateValidator) {
            const updatedObject = { ...this.map.get(key), ...arg } as T

            this.map.set(this.keyExtractor(updatedObject), updatedObject)
            this.save()
            return
        }

        const { value, error } = this.validators.updateValidator.validate(arg)
        if (error || !value) throw error

        const updatedObject = { ...this.map.get(key), ...value } as T

        // If key is updated, with an existing key
        if (key !== this.keyExtractor(updatedObject) && this.map.has(this.keyExtractor(updatedObject))) throw new Error("Object Key already exists.")

        // If key is updated
        if (key !== this.keyExtractor(updatedObject)) this.map.delete(key)

        this.map.set(this.keyExtractor(updatedObject), updatedObject)
        this.save()

        return updatedObject as T
    }

    updateBy = async (predict: Predict<T>, updater: (item: T) => T) => {

        const arr: T[] = []
        for (const [key, val] of this.map) {

            if (!predict(val)) continue

            const updatedObject = updater(val)

            // If key is updated, with an existing key
            if (key !== this.keyExtractor(updatedObject) &&
                this.map.has(this.keyExtractor(updatedObject))
            ) continue

            // If key is updated
            if (key !== this.keyExtractor(updatedObject)) this.map.delete(key)

            this.map.set(this.keyExtractor(updatedObject), updatedObject)
            arr.push(updatedObject)


        }
        await this.save()
        return arr
    }

    findAll = async (pagination?: Pagination) => {
        return this.applyPagination([...this.map.values()], pagination)
    }
    findBy = async (predict: Predict<T>, pagination?: Pagination) => {
        return this.applyPagination(
            [...this.map.values()].filter(predict),
            pagination
        )
    }
    findByKey = async (key: K) => this.map.get(key)



    deleteByKey = async (key: K) => {
        if (!this.map.has(key)) return
        this.map.delete(key)
        await this.save()
    }

    deleteBy = async (predict: Predict<T>) => {
        for (const [key, val] of this.map) {
            if (predict(val)) this.map.delete(key)
        }
        return this.save()
    }

    deleteAll = async () => {
        this.map.clear()
        return this.save()
    }

    count = async () => this.map.size
    countBy = async (predict: Predict<T>) => [...this.map.values()].filter(predict).length
    exists = async (key: K) => this.map.has(key)
}

