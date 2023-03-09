import { existsSync, writeFileSync, renameSync, readFileSync, rmSync, mkdirSync, } from 'node:fs'
import path from 'path'
import { ObjectSchema } from 'joi';

import type { Db, ForeignDbLink, ObjectValidators, Pagination, Predict, Compare } from './misc';


const parseDbFile = <K, T>(file: string, keyExtractor: (item: T) => K, loadValidator?: ObjectSchema<T>): Map<K, T> => {

    if (!existsSync(file)) throw new Error(`File: ${file}, doesn't exists`)

    const content = readFileSync(file, 'utf-8')

    const arr = JSON.parse(content)
    if (!Array.isArray(arr)) throw Error('invalid JSONDb file')

    const map = new Map<K, T>()
    if (!loadValidator) {
        arr.map(item => map.set(keyExtractor(item), item))
        return map
    }

    // Load if valid
    for (const item of arr) {
        const { error, value } = loadValidator.validate(item)
        !error && value &&
            map.set(keyExtractor(value), value)
    }

    return map
}

export default class JSONDb<K, T> implements Db<K, T>  {

    PER_PAGE = 20
    dir: string
    dbName: string
    map: Map<K, T>

    validators: ObjectValidators<T>
    keyExtractor: (item: T) => K

    foreignDbs: ForeignDbLink<K, T, any, any>[] = []

    foreignKeysValidators: ((item: T) => void)[] = []

    private defaultSort?: Compare<T>

    private file: string
    private backupFile: string

    constructor(dir: string, dbName: string, validators: ObjectValidators<T>, keyExtractor: (item: T) => K) {
        this.dir = dir
        this.dbName = dbName
        this.map = new Map()
        this.validators = validators
        this.keyExtractor = keyExtractor
        this.file = path.join(this.dir, `${this.dbName}.json`)
        this.backupFile = path.join(this.dir, `${this.dbName}-backup.json`)
    }

    init = () => {
        if (!existsSync(this.dir)) {
            mkdirSync(this.dir)
        }

        // Load main db file
        try {
            this.map = parseDbFile(this.file, this.keyExtractor, this.validators.loadValidator)
            existsSync(this.backupFile) && rmSync(this.backupFile)
            return
        } catch (error) {
            console.log(`File: "${this.file}" is missing or invalid.`)
            console.error(error);
        }

        // Load backup db file if main failed
        try {
            this.map = parseDbFile(this.backupFile, this.keyExtractor, this.validators.loadValidator)
            existsSync(this.backupFile) && rmSync(this.backupFile)
            return
        } catch (error) {
            console.log(`Backup file: "${this.backupFile}" is missing or invalid.`)
            console.error(error);
            console.log("Creating empty file")
            writeFileSync(this.file, "[]")
        }
    }



    private save = () => {
        renameSync(this.file, this.backupFile)
        writeFileSync(this.file, JSON.stringify(Array.from(this.map.values())))
        rmSync(this.backupFile)
    }

    private applyPagination = (list: T[], pagination?: Pagination): T[] => {
        if (!pagination) return this.defaultSort ? list.sort(this.defaultSort) : list

        const { sort, page, perPage = this.PER_PAGE } = pagination

        const results = list.sort(sort || this.defaultSort)

        if (!page) return results

        return results
            .slice(
                (page - 1) * perPage,
                page * perPage
            )
    }

    private foreignDbsUpdate = (updatedObject: T, oldKey?: K) => {
        this.foreignDbs.forEach(({ db: foreignDb, onUpdate, predict }) => {
            if (!onUpdate) return
            foreignDb.updateBy(
                (foreignItem) => predict({ foreignItem, key: this.keyExtractor(updatedObject), oldKey }),
                (foreignItem) => onUpdate(
                    foreignItem,
                    updatedObject,
                    oldKey
                ))
        })
    }

    private foreignDbsDelete = (key: K) => {
        this.foreignDbs.forEach(({ db, onDelete, predict }) => {
            if (!onDelete) return
            if (onDelete === "CASCADE") {
                return db.deleteBy((foreignItem) => predict({ foreignItem, key }),)
            }
            return db.updateBy(
                (foreignItem) => predict({ foreignItem, key }),
                (foreignItem) => onDelete(foreignItem, key)
            )
        })
    }

    private validateForeignKeys = (item: T) => {
        this.foreignKeysValidators.forEach(v => v(item))
        return item
    }

    setDefaultSort = (sort?: Compare<T>) => { this.defaultSort = sort }

    linkForeignDb = <FK, FT>(link: ForeignDbLink<K, T, FK, FT>) => {
        this.foreignDbs.push(link)
    }

    addForeignKeyValidator = (validator: (item: T) => void) => {
        this.foreignKeysValidators.push(validator)
    }

    insert = (arg: T) => {

        if (!this.validators.inputValidator) {
            if (this.map.has(this.keyExtractor(arg))) throw new Error("Object already exists.")

            this.map.set(this.keyExtractor(arg), this.validateForeignKeys(arg))
            this.save()
            return arg as T
        }

        const { value, error } = this.validators.inputValidator.validate(arg)
        if (error || !value) throw error

        if (this.map.has(this.keyExtractor(value))) throw new Error("Object already exists.")

        this.map.set(this.keyExtractor(value), this.validateForeignKeys(value))
        this.save()
        return value as T
    }



    update = (key: K, arg: Partial<T>) => {
        if (!this.map.has(key)) return

        const {
            value = arg,
            error
        } = this.validators.updateValidator?.validate(arg) || {}

        if (error) throw error

        const updatedObject = { ...this.map.get(key), ...value } as T

        // If key is updated, with an existing key
        if (key !== this.keyExtractor(updatedObject) && this.map.has(this.keyExtractor(updatedObject))) throw new Error("Object Key already exists.")

        const oldKey = key !== this.keyExtractor(updatedObject) ? key : undefined

        // If key is updated
        if (oldKey) this.map.delete(key)

        this.map.set(this.keyExtractor(updatedObject), this.validateForeignKeys(updatedObject))

        this.foreignDbsUpdate(updatedObject, oldKey)

        this.save()

        return updatedObject as T
    }

    updateBy = (predict: Predict<T>, updater: (item: T) => T) => {

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

            this.foreignDbsUpdate(updatedObject, oldKey)

            this.map.set(this.keyExtractor(updatedObject), this.validateForeignKeys(updatedObject))
            arr.push(updatedObject)
        }

        arr.length && this.save()

        return arr
    }

    findAll = (pagination?: Pagination) => {
        return this.applyPagination(Array.from(this.map.values()), pagination)
    }

    findBy = (predict: Predict<T>, pagination?: Pagination) => {
        return this.applyPagination(
            Array.from(this.map.values()).filter(predict),
            pagination
        )
    }

    findByKey = (key: K) => this.map.get(key)


    deleteByKey = (key: K) => {
        if (!this.map.has(key)) return
        this.map.delete(key)
        this.foreignDbsDelete(key)
        this.save()
    }

    deleteBy = (predict: Predict<T>) => {
        let deleted = false
        for (const [key, val] of this.map) {
            if (!predict(val)) continue
            deleted = true
            this.map.delete(key)
            this.foreignDbsDelete(key)
        }
        deleted && this.save()
    }

    deleteAll = () => {
        for (const key of this.map.keys()) {
            this.foreignDbsDelete(key)
        }
        this.map.clear()
        return this.save()
    }

    count = () => this.map.size
    countBy = (predict: Predict<T>) => Array.from(this.map.values()).filter(predict).length
    exists = (key: K) => this.map.has(key)
}

