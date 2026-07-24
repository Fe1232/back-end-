import { Router } from 'express';
import { createAccontUser, login, getsUsers } from '../controllers/UserController.js';

const router = Router();

router.post("/users", createAccontUser);
router.post("/login", login);
router.get("/users", getsUsers);

export default router;