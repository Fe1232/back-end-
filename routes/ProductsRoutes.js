import { Router } from 'express';
import { createProductController, getProductsByUserIdController, updateProductController, deleteProductController } from '../controllers/ProductsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Create a new product for the authenticated user.
router.post('/products', authMiddleware, createProductController);

// List all products belonging to a specific user.
router.get('/products/:userId', authMiddleware, getProductsByUserIdController);

// Update an existing product by its identifier.
router.put('/products/:id', authMiddleware, updateProductController);

// Delete a product only if the user is authorized.
router.delete('/products/:id', authMiddleware, deleteProductController);

export default router;