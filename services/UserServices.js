import "dotenv/config";
import prisma from '../lib/prisma.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
        throw createHttpError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');
    }

    // Compares the password provided with the stored hash.
    const passwordMatches = await bcrypt.compare(key, user.key);

    // Checks if the password is correct.
    if (!passwordMatches) {
        throw createHttpError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');
    }

    //creates the JWT authentication key
    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // Returns only public user information.
    return {
        user: {
            id: user.id,
            nameStore: user.nameStore,
            email: user.email
        },
        token
    };
}

export async function getUser(id) {
    const validId = validateUserId(id);

    try {
        const user = await prisma.user.findUnique({
            where: { id: validId },
            select: {
                id: true,
                nameStore: true,
                email: true,
                accountPro: true
            }
        });

        if (!user) {
            throw createHttpError('A conta desta sessão não foi encontrada.', 404, 'USER_NOT_FOUND');
        }

        return user;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createHttpError('Não foi possível buscar os usuários neste momento.', 500, 'USER_LIST_FAILED');
    }
}

export async function updateUser(id, data) {
    const validId = validateUserId(id);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw createHttpError('O corpo da requisição é obrigatório.', 400, 'USER_UPDATE_DATA_REQUIRED');
    }

    if (Object.hasOwn(data, 'id') || Object.hasOwn(data, 'key') || Object.hasOwn(data, 'accountPro')) {
        throw createHttpError('Os campos id, key e accountPro não podem ser alterados.', 400, 'USER_UPDATE_FIELD_NOT_ALLOWED');
    }

    const allowedFields = ['nameStore', 'email'];
    const receivedFields = Object.keys(data);
    const hasDisallowedField = receivedFields.some((field) => !allowedFields.includes(field));

    if (hasDisallowedField) {
        throw createHttpError('Apenas nameStore e email podem ser alterados.', 400, 'USER_UPDATE_FIELD_NOT_ALLOWED');
    }

    if (receivedFields.length === 0) {
        throw createHttpError('Informe nameStore ou email para atualizar a conta.', 400, 'USER_UPDATE_DATA_REQUIRED');
    }

    const updateData = {};

    if (Object.hasOwn(data, 'nameStore')) {
        if (typeof data.nameStore !== 'string' || !data.nameStore.trim()) {
            throw createHttpError('O nome da loja não pode estar vazio.', 400, 'ACCOUNT_NAME_INVALID');
        }

        updateData.nameStore = data.nameStore.trim();
    }

    if (Object.hasOwn(data, 'email')) {
        if (typeof data.email !== 'string' || !data.email.trim()) {
            throw createHttpError('O e-mail é obrigatório.', 400, 'ACCOUNT_EMAIL_REQUIRED');
        }

        const normalizedEmail = data.email.trim().toLowerCase();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(normalizedEmail)) {
            throw createHttpError('O e-mail informado é inválido.', 400, 'ACCOUNT_EMAIL_INVALID');
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true }
        });

        if (existingUser && existingUser.id !== validId) {
            throw createHttpError('Já existe um usuário cadastrado com este e-mail.', 409, 'EMAIL_ALREADY_REGISTERED');
        }

        updateData.email = normalizedEmail;
    }

    try {
        return await prisma.user.update({
            where: { id: validId },
            data: updateData,
            select: {
                id: true,
                nameStore: true,
                email: true,
                accountPro: true
            }
        });
    } catch (error) {
        if (error?.code === 'P2025') {
            throw createHttpError('Nenhum usuário foi encontrado com o ID informado.', 404, 'USER_NOT_FOUND');
        }

        if (error?.code === 'P2002') {
            throw createHttpError('Já existe um usuário cadastrado com este e-mail.', 409, 'EMAIL_ALREADY_REGISTERED');
        }

        throw createHttpError('Não foi possível atualizar a conta neste momento.', 500, 'USER_UPDATE_FAILED');
    }
}

export async function updatePassword(id, data) {
    const validId = validateUserId(id);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw createHttpError('O corpo da requisição é obrigatório.', 400, 'PASSWORD_UPDATE_DATA_REQUIRED');
    }

    const { currentPassword, newPassword } = data;
    const hasDisallowedField = Object.keys(data).some(
        (field) => !['currentPassword', 'newPassword'].includes(field)
    );

    if (hasDisallowedField) {
        throw createHttpError(
            'Apenas currentPassword e newPassword podem ser enviados.',
            400,
            'PASSWORD_UPDATE_FIELD_NOT_ALLOWED'
        );
    }

    if (typeof currentPassword !== 'string' || !currentPassword.trim()) {
        throw createHttpError('A senha atual é obrigatória.', 400, 'CURRENT_PASSWORD_REQUIRED');
    }

    if (typeof newPassword !== 'string' || !newPassword.trim()) {
        throw createHttpError('A nova senha é obrigatória.', 400, 'NEW_PASSWORD_REQUIRED');
    }

    if (newPassword.length < 6) {
        throw createHttpError('A senha deve ter pelo menos 6 caracteres.', 400, 'ACCOUNT_PASSWORD_TOO_SHORT');
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: validId },
        select: { id: true, key: true }
    });

    if (!existingUser) {
        throw createHttpError('Nenhum usuário foi encontrado com o ID informado.', 404, 'USER_NOT_FOUND');
    }

    const passwordMatches = await bcrypt.compare(currentPassword, existingUser.key);

    if (!passwordMatches) {
        throw createHttpError('A senha atual está incorreta.', 401, 'CURRENT_PASSWORD_INVALID');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        return await prisma.user.update({
            where: { id: validId },
            data: { key: hashedPassword },
            select: {
                id: true,
                nameStore: true,
                email: true,
                accountPro: true
            }
        });
    } catch (error) {
        if (error?.code === 'P2025') {
            throw createHttpError('Nenhum usuário foi encontrado com o ID informado.', 404, 'USER_NOT_FOUND');
        }

        throw createHttpError('Não foi possível alterar a senha neste momento.', 500, 'USER_PASSWORD_UPDATE_FAILED');
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