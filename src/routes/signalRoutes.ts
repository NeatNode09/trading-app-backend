import express from 'express';
import { getSignalHandler } from '../controllers/signalController';
import { authenticate } from '../middlewares/authMiddlewares';
const router = express.Router();

router.get('/signals', authenticate, getSignalHandler);

export default router;