import { Router } from 'express';
import { createAccontUser, login, getsUsers, deleteUserAccount } from '../controllers/UserController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Creates a new user.
router.post('/users', createAccontUser);

// Authenticates an existing user.
router.post('/login', login);

// Returns only the authenticated user's public data.
router.get('/users/me', authMiddleware, getsUsers);

// Deletes a specific user by ID.
router.delete('/users/:id', authMiddleware, deleteUserAccount);

export default router;