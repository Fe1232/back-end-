import prisma from '../lib/prisma.js'
import bcrypt from 'bcrypt';

function createHttpError(message, statusCode, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function validateAccountInput(nameStore, email, key, accountPro) {
    if (!nameStore || typeof nameStore !== 'string' || !nameStore.trim()) {
        throw createHttpError('O nome da loja é obrigatório.', 400, 'ACCOUNT_NAME_REQUIRED');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
        throw createHttpError('O e-mail é obrigatório.', 400, 'ACCOUNT_EMAIL_REQUIRED');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
        throw createHttpError('O e-mail informado é inválido.', 400, 'ACCOUNT_EMAIL_INVALID');
    }

    if (!key || typeof key !== 'string' || key.length < 6) {
        throw createHttpError('A senha deve ter pelo menos 6 caracteres.', 400, 'ACCOUNT_PASSWORD_TOO_SHORT');
    }

    if (typeof accountPro !== 'boolean') {
        throw createHttpError('O campo accountPro deve ser verdadeiro ou falso.', 400, 'ACCOUNT_PRO_INVALID');
    }
}

function validateLoginInput(email, key) {
    if (!email || typeof email !== 'string' || !email.trim()) {
        throw createHttpError('O e-mail é obrigatório.', 400, 'LOGIN_EMAIL_REQUIRED');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
        throw createHttpError('O e-mail informado é inválido.', 400, 'LOGIN_EMAIL_INVALID');
    }

    if (!key || typeof key !== 'string' || !key.trim()) {
        throw createHttpError('A senha é obrigatória.', 400, 'LOGIN_PASSWORD_REQUIRED');
    }
}

// Create the user.
export async function createAccount(nameStore, email, key, accountPro) {
    validateAccountInput(nameStore, email, key, accountPro);

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (existingUser) {
        throw createHttpError('Já existe um usuário cadastrado com este e-mail.', 409, 'EMAIL_ALREADY_REGISTERED');
    }

    try {
        // Encodes the password before storing it.
        const SALT_ROUNDS = 10;
        const hashedKey = await bcrypt.hash(key, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                nameStore: nameStore.trim(),
                email: normalizedEmail,
                key: hashedKey,
                accountPro: accountPro,
            }
        });

        const { key: _, ...safeUser } = user;
        return safeUser;
    } catch (error) {
        if (error?.code === 'P2002') {
            throw createHttpError('Já existe um usuário cadastrado com este e-mail.', 409, 'EMAIL_ALREADY_REGISTERED');
        }

        throw createHttpError('Não foi possível criar a conta neste momento.', 500, 'ACCOUNT_CREATE_FAILED');
    }
}

// Login User.
export async function userLogin(email, key) {
    validateLoginInput(email, key);

    const normalizedEmail = email.trim().toLowerCase();

    // Ask Prisma to fetch a single user by email.
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    // Checks if the user exists.
    if (!user) {
        throw createHttpError('Nenhum usuário encontrado com este e-mail.', 404, 'USER_NOT_FOUND');
    }

    // Compares the password provided with the stored hash.
    const passwordMatches = await bcrypt.compare(key, user.key);

    // Checks if the password is correct.
    if (!passwordMatches) {
        throw createHttpError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');
    }

    // Returns only public user information.
    return {
        id: user.id,
        nameStore: user.nameStore,
        email: user.email
    };
}

export async function getUser() {
    try {
        // Gets all users.
        const users = await prisma.user.findMany();

        const safeUser = users.map((user) => {
            const { key: _, ...safeUser } = user;
            return safeUser;
        });

        // Return users without exposing the password hash.
        return safeUser;
    } catch (error) {
        throw createHttpError('Não foi possível buscar os usuários neste momento.', 500, 'USER_LIST_FAILED');
    }
}

function validateUserId(id) {
    // Validates that the ID was sent and has the expected format.
    if (!id || typeof id !== 'string') {
        const error = new Error('O ID do usuário é obrigatório.');
        error.statusCode = 400;
        error.code = 'USER_ID_REQUIRED';
        throw error;
    }

    const trimmedId = id.trim();

    if (!trimmedId) {
        const error = new Error('O ID do usuário não pode estar vazio.');
        error.statusCode = 400;
        error.code = 'USER_ID_REQUIRED';
        throw error;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(trimmedId)) {
        const error = new Error('O ID do usuário informado é inválido.');
        error.statusCode = 400;
        error.code = 'USER_ID_INVALID';
        throw error;
    }

    return trimmedId;
}

export async function deleteUser(id) {
    const validId = validateUserId(id);

    // Verifies whether the user exists before trying to delete it.
    const existingUser = await prisma.user.findUnique({
        where: { id: validId },
        select: { id: true, email: true }
    });

    if (!existingUser) {
        const error = new Error('Nenhum usuário foi encontrado com o ID informado.');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }

    try {
        // Deletes the user only after all validations pass.
        const deletedUser = await prisma.user.delete({
            where: { id: validId },
            select: { id: true, nameStore: true, email: true, accountPro: true }
        });

        return deletedUser;
    } catch (error) {
        // Converts Prisma not-found errors into a more specific API response.
        if (error?.code === 'P2025') {
            const notFoundError = new Error('Nenhum usuário foi encontrado com o ID informado.');
            notFoundError.statusCode = 404;
            notFoundError.code = 'USER_NOT_FOUND';
            throw notFoundError;
        }

        // Handles cases where related data prevents deletion.
        if (error?.code === 'P2003' || error?.code === 'P2014') {
            const conflictError = new Error('Não foi possível remover o usuário porque ele possui registros relacionados.');
            conflictError.statusCode = 409;
            conflictError.code = 'USER_DELETE_CONFLICT';
            throw conflictError;
        }

        // Keeps unexpected failures explicit and avoids generic responses.
        const serverError = new Error('Não foi possível concluir a exclusão do usuário neste momento.');
        serverError.statusCode = 500;
        serverError.code = 'USER_DELETE_FAILED';
        throw serverError;
    }
}