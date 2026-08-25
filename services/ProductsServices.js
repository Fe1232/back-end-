import prisma from '../lib/prisma.js';

function createHttpError(message, statusCode, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function validateProductInput(nameProduct, category, costPrice, priceToSell, quantity, warningPoint, userId) {
    // Validate the basic fields before sending data to Prisma.
    if (!nameProduct || typeof nameProduct !== 'string' || !nameProduct.trim()) {
        throw createHttpError('O nome do produto é obrigatório.', 400, 'PRODUCT_NAME_REQUIRED');
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
        throw createHttpError('A categoria do produto é obrigatória.', 400, 'PRODUCT_CATEGORY_REQUIRED');
    }

    if (costPrice === undefined || typeof costPrice !== 'number' || !Number.isFinite(costPrice) || costPrice < 0) {
        throw createHttpError('O custo do produto deve ser um número não-negativo.', 400, 'PRODUCT_COSTPRICE_INVALID');
    }

    if (priceToSell === undefined || typeof priceToSell !== 'number' || !Number.isFinite(priceToSell) || priceToSell < 0) {
        throw createHttpError('O preço de venda deve ser um número não-negativo.', 400, 'PRODUCT_PRICETOSELL_INVALID');
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
        throw createHttpError('A quantidade deve ser um inteiro não-negativo.', 400, 'PRODUCT_QUANTITY_INVALID');
    }

    if (typeof warningPoint !== 'number' || !Number.isInteger(warningPoint) || warningPoint < 0) {
        throw createHttpError('O ponto de aviso (warningPoint) deve ser um inteiro não-negativo.', 400, 'PRODUCT_WARNINGPOINT_INVALID');
    }

    if (!userId || typeof userId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(userId.trim())) {
        throw createHttpError('O ID do usuário associado ao produto é obrigatório e inválido.', 400, 'PRODUCT_USERID_INVALID');
    }

    return {
        nameProduct: nameProduct.trim(),
        category: category.trim(),
        costPrice,
        priceToSell,
        quantity,
        warningPoint,
        userId: userId.trim()
    };
}

function validateProductUpdate(nameProduct, category, costPrice, priceToSell, quantity, warningPoint) {
    // Validate update payload before applying changes.
    if (!nameProduct || typeof nameProduct !== 'string' || !nameProduct.trim()) {
        throw createHttpError('O nome do produto é obrigatório.', 400, 'PRODUCT_NAME_REQUIRED');
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
        throw createHttpError('A categoria do produto é obrigatória.', 400, 'PRODUCT_CATEGORY_REQUIRED');
    }

    if (costPrice === undefined || typeof costPrice !== 'number' || !Number.isFinite(costPrice) || costPrice < 0) {
        throw createHttpError('O custo do produto deve ser um número não-negativo.', 400, 'PRODUCT_COSTPRICE_INVALID');
    }

    if (priceToSell === undefined || typeof priceToSell !== 'number' || !Number.isFinite(priceToSell) || priceToSell < 0) {
        throw createHttpError('O preço de venda deve ser um número não-negativo.', 400, 'PRODUCT_PRICETOSELL_INVALID');
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
        throw createHttpError('A quantidade deve ser um inteiro não-negativo.', 400, 'PRODUCT_QUANTITY_INVALID');
    }

    if (typeof warningPoint !== 'number' || !Number.isInteger(warningPoint) || warningPoint < 0) {
        throw createHttpError('O ponto de aviso (warningPoint) deve ser um inteiro não-negativo.', 400, 'PRODUCT_WARNINGPOINT_INVALID');
    }

    return {
        nameProduct: nameProduct.trim(),
        category: category.trim(),
        costPrice,
        priceToSell,
        quantity,
        warningPoint
    };
}

function validateProductId(id) {
    // Validate the product identifier before querying the database.
    if (!id || typeof id !== 'string') {
        throw createHttpError('O ID do produto é obrigatório.', 400, 'PRODUCT_ID_REQUIRED');
    }

    const trimmed = id.trim();
    if (!trimmed) {
        throw createHttpError('O ID do produto não pode estar vazio.', 400, 'PRODUCT_ID_REQUIRED');
    }

    if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        throw createHttpError('O ID do produto informado é inválido.', 400, 'PRODUCT_ID_INVALID');
    }

    return trimmed;
}

function validateUserId(id) {
    // Validate the user identifier before accessing related data.
    if (!id || typeof id !== 'string') {
        throw createHttpError('O ID do usuário é obrigatório.', 400, 'USER_ID_REQUIRED');
    }

    const trimmed = id.trim();
    if (!trimmed) {
        throw createHttpError('O ID do usuário não pode estar vazio.', 400, 'USER_ID_REQUIRED');
    }

    if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        throw createHttpError('O ID do usuário informado é inválido.', 400, 'USER_ID_INVALID');
    }

    return trimmed;
}

function preserveHttpError(error, fallbackMessage, fallbackCode) {
    // Keep custom errors intact; otherwise, convert them into a generic service error.
    if (error?.statusCode && error?.code) {
        throw error;
    }
    throw createHttpError(fallbackMessage, 500, fallbackCode);
}

export async function deleteProduct(id, userId) {
    const validId = validateProductId(id);
    const validUserId = validateUserId(userId);

    try {
        const result = await prisma.products.deleteMany({
            where: {
                id: validId,
                userId: validUserId
            }
        });

        if (result.count === 0) {
            throw createHttpError('Você não tem autorização para deletar este produto ou ele não existe.', 403, 'PRODUCT_DELETE_FORBIDDEN');
        }

        return { deletedCount: result.count };
    } catch (error) {
        preserveHttpError(error, 'Não foi possível deletar o produto neste momento.', 'PRODUCT_DELETE_FAILED');
    }
}

export async function createProduct(nameProduct, category, costPrice, priceToSell, quantity, warningPoint, userId) {
    const validInput = validateProductInput(nameProduct, category, costPrice, priceToSell, quantity, warningPoint, userId);
    const validUserId = validateUserId(validInput.userId);

    const userExists = await prisma.user.findUnique({ where: { id: validUserId } });
    if (!userExists) {
        throw createHttpError('O ID do usuário não existe.', 404, 'PRODUCT_USERID_NOT_FOUND');
    }

    try {
        const created = await prisma.products.create({
            data: {
                nameProduct: validInput.nameProduct,
                category: validInput.category,
                costPrice: validInput.costPrice,
                priceToSell: validInput.priceToSell,
                quantity: validInput.quantity,
                warningPoint: validInput.warningPoint,
                userId: validInput.userId
            }
        });

        return created;
    } catch (error) {
        preserveHttpError(error, 'Erro ao criar o produto.', 'PRODUCT_CREATION_FAILED');
    }
}

export async function getProductsByUserId(userId) {
    // Use the user validator here because the endpoint loads products by user.
    const validUserId = validateUserId(userId);

    const userExists = await prisma.user.findUnique({ where: { id: validUserId } });
    if (!userExists) {
        throw createHttpError('O ID do usuário não existe.', 404, 'PRODUCT_USERID_NOT_FOUND');
    }

    try {
        const products = await prisma.products.findMany({
            where: { userId: validUserId }
        });

        return products;
    } catch (error) {
        preserveHttpError(error, 'Erro ao buscar os produtos deste usuário.', 'PRODUCT_FETCH_FAILED');
    }
}

export async function updateProduct(id, nameProduct, category, costPrice, priceToSell, quantity, warningPoint, userId) {
    const validId = validateProductId(id);
    const validInput = validateProductUpdate(nameProduct, category, costPrice, priceToSell, quantity, warningPoint);
    const validUserId = validateUserId(userId);

    const existingProduct = await prisma.products.findUnique({ where: { id: validId } });
    if (!existingProduct) {
        throw createHttpError('O ID do produto não existe.', 404, 'PRODUCT_ID_NOT_FOUND');
    }
    if (existingProduct.userId !== validUserId) {
        throw createHttpError('Você não tem autorização para atualizar este produto.', 403, 'PRODUCT_UPDATE_FORBIDDEN');
    }

    try {
        const updated = await prisma.products.update({
            where: { id: validId },
            data: {
                nameProduct: validInput.nameProduct,
                category: validInput.category,
                costPrice: validInput.costPrice,
                priceToSell: validInput.priceToSell,
                quantity: validInput.quantity,
                warningPoint: validInput.warningPoint
            }
        });

        return updated;
    } catch (error) {
        preserveHttpError(error, 'Erro ao atualizar o produto.', 'PRODUCT_UPDATE_FAILED');
    }
}

