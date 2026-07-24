import prisma from '../lib/prisma.js'
import bcrypt from 'bcrypt';

//Create the user
export async function createAccont(nameStore, email, key, accountPro) {
    if (!key || key.length < 6) {
        return null;
    }

    //encodes the password
    const SALT_ROUNDS = 10;
    const hashedKey = await bcrypt.hash(key, SALT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            nameStore: nameStore,
            email: email,
            key: hashedKey,
            accountPro: accountPro,
        }
    })

    const { key: _, ...safeUser } = user;
    return safeUser;
}

//Login User
export async function userLogin(email, key) {
    //Ask Prisma to fetch a single user by email.
    const user = await prisma.user.findUnique({
        where: { email: email }
    });

    //checks if the users exists
    if (!user) { return null };

    //Compares to password
    const passwordMatches = await bcrypt.compare(key, user.key);

    //checks if the password is correct
    if (!passwordMatches) { return null /*Incorrect*/ };

    //If it is correct
    return {
        id: user.id,
        nameStore: user.nameStore,
        email: user.email
    };
}

export async function getUser() {
    //Gets all users
    const users = await prisma.user.findMany();

    const safeUser = users.map((user) => {
        const {key: _, ...safeUser} = user;
        return safeUser;
    });
    //Return Users
    return safeUser;
}