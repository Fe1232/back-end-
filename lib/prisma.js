import prismaPackage from '@prisma/client'

const { PrismaClient } = prismaPackage

const prismaClientSingleton = () => {
    return new PrismaClient()
}

const globalForPrisma = globalThis

const prisma = globalForPrisma.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaGlobal = prisma
}
