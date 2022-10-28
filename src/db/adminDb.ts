import { PrismaClient, Admin } from "@prisma/client"
import { hash } from "bcrypt"
import { UserSchema } from "./validators"



interface AdminDB {
    register: (username: string, password: string) => Promise<Admin | void>
    isRegistered: () => Promise<boolean>
    getAdmin: (username: string) => Promise<Admin | null | void>


}


class AdminDb implements AdminDB {

    prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    isRegistered = () => {
        return this.prisma.admin.count().then(v => v > 0)
    }


    register = async (user: any) => {
        if (await this.isRegistered()) return
        const { error, value } = UserSchema.validate(user)
        if (error) throw error
        return this.prisma.admin.create({
            data: {
                username: value.username,
                password: await hash(value.password, 10)
            }
        })
    }

    getAdmin = async (username: string) => {
        if (!(await this.isRegistered())) return
        const admin = await this.prisma.admin.findUnique({
            where: { username }
        })
        return admin
    }
}

export default AdminDb