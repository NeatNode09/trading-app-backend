import express from 'express';
import { postResultHandler } from '../controllers/adminDashboard/resultPostController';
import { getResultsHandler } from '../controllers/resultController';
import { requireAdmin } from '../middlewares/requireAdmin';

const router = express.Router();

router.post('/post-result', requireAdmin, postResultHandler);
router.get('/results', getResultsHandler);

export default router;
