import { hash } from "bcrypt"
import JSONDb from "./JSONDb"
import { Admin } from "./types"
import { UserSchema } from "./validators"


interface AdminDB {
    register: (username: string, password: string) => Promise<Admin | void>
    isRegistered: () => Promise<boolean>
    getAdmin: (username: string) => Promise<Admin | null | void>
}


export default class AdminCRUD implements AdminDB {

    db: JSONDb<Admin['username'], Admin>

    constructor(db: JSONDb<Admin['username'], Admin>) {
        this.db = db
    }

    isRegistered = async () => {
        return !!(await this.db.count())
    }

    register = async (arg: any) => {
        if (await this.isRegistered()) return

        const { error, value } = UserSchema.validate(arg)
        if (error) throw error

        return await this.db.insert({
            username: value.username,
            password: await hash(value.password, 10)
        })
    }

    getAdmin = async (username: string) => {
        if (!(await this.isRegistered())) return
        return await this.db.findByKey(username)
    }
}
