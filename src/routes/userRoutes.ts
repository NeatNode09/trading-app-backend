import express from 'express';
import { getUsersHandler } from '../controllers/usersController';
import { authenticate } from '../middlewares/authMiddlewares';
const router = express.Router();

router.get('/users', authenticate, getUsersHandler);

export default router;