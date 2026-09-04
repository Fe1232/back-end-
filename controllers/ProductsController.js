import { createProduct, getProductsByUserId, updateProduct, deleteProduct } from '../services/ProductsServices.js';

function handleControllerError(res, error, fallbackCode) {
    const statusCode = error?.statusCode || 500;
    const errorCode = error?.code || fallbackCode;

    return res.status(statusCode).json({
        error: error?.message || 'Não foi possível concluir a operação do produto neste momento.',
        code: errorCode
    });
}

export async function createProductController(req, res) {
    try {
        const { nameProduct, category, costPrice, priceToSell, quantity, warningPoint } = req.body;
        const userId = req.user.userId;
        const createdProduct = await createProduct(nameProduct, category, costPrice, priceToSell, quantity, warningPoint, userId);

        return res.status(201).json({ response: 'Product created successfully!', product: createdProduct });
    } catch (error) {
        return handleControllerError(res, error, 'PRODUCT_CREATE_FAILED');
    }
}

export async function getProductsByUserIdController(req, res) {
    try {
        const userId = req.user.userId;
        const products = await getProductsByUserId(userId);

        return res.status(200).json(products);
    } catch (error) {
        return handleControllerError(res, error, 'PRODUCT_FETCH_FAILED');
    }
}

export async function updateProductController(req, res) {
    try {
        const { id } = req.params;
        const { nameProduct, category, costPrice, priceToSell, quantity, warningPoint } = req.body;
        const userId = req.user.userId;

        const updatedProduct = await updateProduct(id, nameProduct, category, costPrice, priceToSell, quantity, warningPoint, userId);

        return res.status(200).json({ response: 'Product updated successfully!', product: updatedProduct });
    } catch (error) {
        return handleControllerError(res, error, 'PRODUCT_UPDATE_FAILED');
    }
}

export async function deleteProductController(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const deletedProduct = await deleteProduct(id, userId);

        return res.status(200).json({ response: 'Product deleted successfully!', product: deletedProduct });
    } catch (error) {
        return handleControllerError(res, error, 'PRODUCT_DELETE_FAILED');
    }
}

