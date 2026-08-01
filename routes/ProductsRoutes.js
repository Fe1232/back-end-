import { Router } from 'express';
import { createProductController, getProductsByUserIdController, updateProductController, deleteProductController } from '../controllers/ProductsController.js';

const router = Router();

// Create a new product for the authenticated user.
router.post('/products', createProductController);

// List all products belonging to a specific user.
router.get('/products/:userId', getProductsByUserIdController);

// Update an existing product by its identifier.
router.put('/products/:id', updateProductController);

// Delete a product only if the user is authorized.
router.delete('/products/:id', deleteProductController);

export default router;