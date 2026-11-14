import express from 'express';
import {
    getAllocations,
    getAllocationById,
    createAllocation,
    releaseAllocation,
    deleteAllocation,
    getAllocationStats
} from '../controllers/allocationController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public / Authenticated read routes
router.get('/stats', auth, getAllocationStats);
router.get('/', auth, getAllocations);
router.get('/:id', auth, getAllocationById);

// Admin-protected allocation mutation routes
router.post('/', auth, authorize(['admin']), createAllocation);
router.patch('/:id/release', auth, authorize(['admin']), releaseAllocation);
router.post('/:id/release', auth, authorize(['admin']), releaseAllocation);
router.delete('/:id', auth, authorize(['admin']), deleteAllocation);

export default router;

