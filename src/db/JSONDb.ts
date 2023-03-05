import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { Db, ForeignDbLink, ObjectValidators, Pagination, Predict, Compare } from './misc';


export default class JSONDb<K, T> implements Db<K, T>  {

    PER_PAGE = 20
    dir: string
    filename: string
    map: Map<K, T>

    validators: ObjectValidators<T>
    keyExtractor: (item: T) => K

    foreignDbs: ForeignDbLink<K, T, any, any>[] = []

    foreignKeysValidators: ((item: T) => Promise<void>)[] = []

    private defaultSort?: Compare<T>

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
        if (!pagination) return this.defaultSort ? list.sort(this.defaultSort) : list
        const results = list.sort(pagination.sort || this.defaultSort)

        if (!pagination.page) return results

        const perPage = pagination.perPage || this.PER_PAGE
        const page = pagination.page
        return results
            .slice(
                (page - 1) * perPage,
                (page * perPage)
            )
    }

    private foreignDbsUpdate = async (updatedObject: T, oldKey?: K) => {
        await Promise.all(this.foreignDbs.map(({ db, onUpdate, predict }) => {
            if (!onUpdate) return
            db.updateBy(
                (foreignItem) => predict({ foreignItem, key: this.keyExtractor(updatedObject), oldKey }),
                (foreignItem) => onUpdate(
                    foreignItem,
                    updatedObject,
                    oldKey
                ))
        }))
    }

    private foreignDbsDelete = async (key: K) => {
        await Promise.all(this.foreignDbs.map(({ db, onDelete, predict }) => {
            if (!onDelete) return
            if (onDelete === "CASCADE") {
                return db.deleteBy((foreignItem) => predict({ foreignItem, key }),)
            }
            return db.updateBy(
                (foreignItem) => predict({ foreignItem, key }),
                (foreignItem) => onDelete(foreignItem, key)
            )
        }))
    }

    private validateForeignKeys = async (item: T) => {
        await Promise.all(this.foreignKeysValidators.map(v => v(item)))
        return item
    }

    setDefaultSort = (sort?: Compare<T>) => { this.defaultSort = sort }

    linkForeignDb = <FK, FT>(link: ForeignDbLink<K, T, FK, FT>) => {
        this.foreignDbs.push(link)
    }

    addForeignKeyValidator = (validator: (item: T) => Promise<void>) => {
        this.foreignKeysValidators.push(validator)
    }

    insert = async (arg: T) => {

        if (!this.validators.inputValidator) {
            if (this.map.has(this.keyExtractor(arg))) throw new Error("Object already exists.")

            this.map.set(this.keyExtractor(arg), await this.validateForeignKeys(arg))
            this.save()
            return arg as T
        }

        const { value, error } = this.validators.inputValidator.validate(arg)
        if (error || !value) throw error

        if (this.map.has(this.keyExtractor(value))) throw new Error("Object already exists.")

        this.map.set(this.keyExtractor(value), await this.validateForeignKeys(value))
        this.save()
        return value as T
    }



    update = async (key: K, arg: Partial<T>) => {
        if (!this.map.has(key)) return

        if (!this.validators.updateValidator) {
            const updatedObject = { ...this.map.get(key), ...arg } as T

            this.map.set(this.keyExtractor(updatedObject), await this.validateForeignKeys(updatedObject))
            this.save()
            return
        }

        const { value, error } = this.validators.updateValidator.validate(arg)
        if (error || !value) throw error

        const updatedObject = { ...this.map.get(key), ...value } as T

        // If key is updated, with an existing key
        if (key !== this.keyExtractor(updatedObject) && this.map.has(this.keyExtractor(updatedObject))) throw new Error("Object Key already exists.")

        const oldKey = key !== this.keyExtractor(updatedObject) ? key : undefined

        // If key is updated
        if (oldKey) this.map.delete(key)

        this.map.set(this.keyExtractor(updatedObject), await this.validateForeignKeys(updatedObject))

        await this.foreignDbsUpdate(updatedObject, oldKey)

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

            const oldKey = key !== this.keyExtractor(updatedObject) ? key : undefined

            // If key is updated
            if (oldKey) this.map.delete(key)

            await this.foreignDbsUpdate(updatedObject, oldKey)

            this.map.set(this.keyExtractor(updatedObject), await this.validateForeignKeys(updatedObject))
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
        await this.foreignDbsDelete(key)
        await this.save()
    }

    deleteBy = async (predict: Predict<T>) => {
        for (const [key, val] of this.map) {
            if (predict(val)) this.map.delete(key)
            await this.foreignDbsDelete(key)
        }
        return this.save()
    }

    deleteAll = async () => {
        for (const key of this.map.keys()) {
            await this.foreignDbsDelete(key)
        }
        this.map.clear()
        return this.save()
    }

    count = async () => this.map.size
    countBy = async (predict: Predict<T>) => [...this.map.values()].filter(predict).length
    exists = async (key: K) => this.map.has(key)
}

