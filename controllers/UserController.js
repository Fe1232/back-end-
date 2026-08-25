import { createAccount, userLogin, getUser, deleteUser } from '../services/UserServices.js'

export async function createAccontUser(req, res) {
    try {
        // Gets the variables required to create an account.
        const { nameStore, email, key, accountPro } = req.body;
        const createUser = await createAccount(nameStore, email, key, accountPro);

        // Returns success when the account is created.
        return res.status(201).json({ response: 'Conta criada com sucesso', user: createUser });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const errorCode = error.code || 'ACCOUNT_CREATE_FAILED';

        return res.status(statusCode).json({
            error: error.message,
            code: errorCode
        });
    }
}

export async function login(req, res) {
    try {
        // Gets the variables required for login and calls the service.
        const { email, key } = req.body;
        const user = await userLogin(email, key);

        // Returns the authenticated user data.
        return res.status(200).json(user);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const errorCode = error.code || 'LOGIN_FAILED';

        return res.status(statusCode).json({
            error: error.message,
            code: errorCode
        });
    }
}

export async function getsUsers(req, res) {
    try {
        const users = await getUser();

        return res.status(200).json(users);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const errorCode = error.code || 'USER_LIST_FAILED';

        return res.status(statusCode).json({
            error: error.message,
            code: errorCode
        });
    }
}

export async function deleteUserAccount(req, res) {
    try {
        // Gets the user ID from the route parameter.
        const { id } = req.params;

        if (req.user.userId !== id) {
            return res.status(403).json({
                error: 'Você não tem autorização para remover este usuário.',
                code: 'USER_DELETE_FORBIDDEN'
            });
        }

        const deletedUser = await deleteUser(id);

        // Returns the deleted user data.
        return res.status(200).json({
            message: 'Usuário removido com sucesso.',
            user: deletedUser
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const errorCode = error.code || 'USER_DELETE_FAILED';

        return res.status(statusCode).json({
            error: error.message,
            code: errorCode
        });
    }
}