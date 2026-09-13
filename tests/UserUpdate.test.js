import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'mongodb://localhost:27017/inventory-manager-tests';
process.env.JWT_SECRET ??= 'test-secret';

const { updateUser, updatePassword } = await import('../services/UserServices.js');
const { updateUserAccount, updateUserPassword } = await import('../controllers/UserController.js');
const { default: prisma } = await import('../lib/prisma.js');
const { authMiddleware } = await import('../middlewares/authMiddleware.js');
const { default: jwt } = await import('jsonwebtoken');
const bcrypt = (await import('bcrypt')).default;

const userId = '64f000000000000000000001';
const anotherUserId = '64f000000000000000000002';

function mockResponse() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test('requires an Authorization header for account updates', () => {
    const response = mockResponse();
    let nextCalled = false;

    authMiddleware({ headers: {} }, response, () => {
        nextCalled = true;
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, 'AUTH_TOKEN_MISSING');
    assert.equal(nextCalled, false);
});

test('rejects malformed Bearer authorization headers', () => {
    const response = mockResponse();
    let nextCalled = false;

    authMiddleware(
        { headers: { authorization: 'Basic invalid-token' } },
        response,
        () => {
            nextCalled = true;
        }
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, 'AUTH_TOKEN_INVALID');
    assert.equal(nextCalled, false);
});

test('accepts a valid Bearer token and exposes its userId', () => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = mockResponse();
    let nextCalled = false;

    authMiddleware(request, response, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(request.user, { userId, iat: request.user.iat, exp: request.user.exp });
});

test('rejects updates when the JWT user does not match the path id', async () => {
    const response = mockResponse();

    await updateUserAccount(
        { params: { id: anotherUserId }, user: { userId } },
        response
    );

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, {
        error: 'Você não tem autorização para alterar este usuário.',
        code: 'USER_UPDATE_FORBIDDEN'
    });
});

test('rejects protected account fields', async () => {
    await assert.rejects(
        updateUser(userId, { accountPro: true }),
        { statusCode: 400, code: 'USER_UPDATE_FIELD_NOT_ALLOWED' }
    );

    await assert.rejects(
        updateUser(userId, { id: anotherUserId }),
        { statusCode: 400, code: 'USER_UPDATE_FIELD_NOT_ALLOWED' }
    );

    await assert.rejects(
        updateUser(userId, { password: 'new-password' }),
        { statusCode: 400, code: 'USER_UPDATE_FIELD_NOT_ALLOWED' }
    );
});

test('rejects an incorrect current password', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prisma.user.findUnique = async () => ({ id: userId, key: passwordHash });

    try {
        await assert.rejects(
            updatePassword(userId, {
                currentPassword: 'wrong-password',
                newPassword: 'new-password'
            }),
            { statusCode: 401, code: 'CURRENT_PASSWORD_INVALID' }
        );
    } finally {
        prisma.user.findUnique = originalFindUnique;
    }
});

test('rejects an invalid new password before reading the user', async () => {
    const originalFindUnique = prisma.user.findUnique;
    let databaseCalled = false;
    prisma.user.findUnique = async () => {
        databaseCalled = true;
        return null;
    };

    try {
        await assert.rejects(
            updatePassword(userId, {
                currentPassword: 'correct-password',
                newPassword: 'short'
            }),
            { statusCode: 400, code: 'ACCOUNT_PASSWORD_TOO_SHORT' }
        );
        assert.equal(databaseCalled, false);
    } finally {
        prisma.user.findUnique = originalFindUnique;
    }
});

test('returns USER_NOT_FOUND when changing the password of a missing user', async () => {
    const originalFindUnique = prisma.user.findUnique;
    prisma.user.findUnique = async () => null;

    try {
        await assert.rejects(
            updatePassword(userId, {
                currentPassword: 'correct-password',
                newPassword: 'new-password'
            }),
            { statusCode: 404, code: 'USER_NOT_FOUND' }
        );
    } finally {
        prisma.user.findUnique = originalFindUnique;
    }
});

test('hashes the new password and returns no password data', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const originalUpdate = prisma.user.update;
    const currentPassword = 'correct-password';
    const newPassword = 'new-password';
    const passwordHash = await bcrypt.hash(currentPassword, 10);
    let updateArguments;

    prisma.user.findUnique = async () => ({ id: userId, key: passwordHash });
    prisma.user.update = async (args) => {
        updateArguments = args;
        return {
            id: userId,
            nameStore: 'Minha Loja',
            email: 'usuario@email.com',
            accountPro: false
        };
    };

    try {
        const result = await updatePassword(userId, { currentPassword, newPassword });

        assert.notEqual(updateArguments.data.key, newPassword);
        assert.equal(await bcrypt.compare(newPassword, updateArguments.data.key), true);
        assert.deepEqual(result, {
            id: userId,
            nameStore: 'Minha Loja',
            email: 'usuario@email.com',
            accountPro: false
        });
        assert.equal('key' in result, false);
    } finally {
        prisma.user.findUnique = originalFindUnique;
        prisma.user.update = originalUpdate;
    }
});

test('validates update fields before accessing the database', async () => {
    await assert.rejects(
        updateUser(userId, {}),
        { statusCode: 400, code: 'USER_UPDATE_DATA_REQUIRED' }
    );

    await assert.rejects(
        updateUser(userId, { nameStore: '   ' }),
        { statusCode: 400, code: 'ACCOUNT_NAME_INVALID' }
    );

    await assert.rejects(
        updateUser(userId, { email: 'invalid-email' }),
        { statusCode: 400, code: 'ACCOUNT_EMAIL_INVALID' }
    );
});

test('normalizes email and returns only public updated data', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const originalUpdate = prisma.user.update;
    let updateArguments;

    prisma.user.findUnique = async () => null;
    prisma.user.update = async (args) => {
        updateArguments = args;
        return {
            id: userId,
            nameStore: 'Nova Loja',
            email: 'novo@email.com',
            accountPro: false
        };
    };

    try {
        const result = await updateUser(userId, {
            nameStore: '  Nova Loja  ',
            email: '  NOVO@EMAIL.COM '
        });

        assert.deepEqual(updateArguments.data, {
            nameStore: 'Nova Loja',
            email: 'novo@email.com'
        });
        assert.deepEqual(result, {
            id: userId,
            nameStore: 'Nova Loja',
            email: 'novo@email.com',
            accountPro: false
        });
        assert.equal('key' in result, false);
    } finally {
        prisma.user.findUnique = originalFindUnique;
        prisma.user.update = originalUpdate;
    }
});

test('rejects an email already used by another account', async () => {
    const originalFindUnique = prisma.user.findUnique;
    prisma.user.findUnique = async () => ({ id: anotherUserId });

    try {
        await assert.rejects(
            updateUser(userId, { email: 'existing@email.com' }),
            { statusCode: 409, code: 'EMAIL_ALREADY_REGISTERED' }
        );
    } finally {
        prisma.user.findUnique = originalFindUnique;
    }
});

test('maps missing users and database conflicts to the API error format', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const originalUpdate = prisma.user.update;

    prisma.user.findUnique = async () => null;
    prisma.user.update = async () => {
        const error = new Error('not found');
        error.code = 'P2025';
        throw error;
    };

    try {
        await assert.rejects(
            updateUser(userId, { nameStore: 'Nova Loja' }),
            { statusCode: 404, code: 'USER_NOT_FOUND' }
        );
    } finally {
        prisma.user.findUnique = originalFindUnique;
        prisma.user.update = originalUpdate;
    }
});

test('rejects password updates when the JWT user does not match the path id', async () => {
    const response = mockResponse();

    await updateUserPassword(
        {
            params: { id: anotherUserId },
            user: { userId },
            body: { currentPassword: 'correct-password', newPassword: 'new-password' }
        },
        response
    );

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, {
        error: 'Você não tem autorização para alterar este usuário.',
        code: 'USER_PASSWORD_UPDATE_FORBIDDEN'
    });
});

test('rejects password fields outside the dedicated contract', async () => {
    await assert.rejects(
        updatePassword(userId, {
            currentPassword: 'correct-password',
            newPassword: 'new-password',
            password: 'not-allowed'
        }),
        { statusCode: 400, code: 'PASSWORD_UPDATE_FIELD_NOT_ALLOWED' }
    );
});