import express from 'express';
import {
    getResources,
    getResourceById,
    getNearbyCenters,
    createResource,
    updateResourceStatus,
    deleteResource
} from '../controllers/resourceController.js';
import { auth, authorize } from '../middleware/auth.js';
import allocationRoutes from './allocations.js';

const router = express.Router();

// Resource allocation sub-routes (/api/resources/allocations)
router.use('/allocations', allocationRoutes);

// Public discovery endpoints
router.get('/', getResources);
router.get('/nearby', getNearbyCenters);
router.get('/:id', getResourceById);

// Protected inventory mutation endpoints
router.post('/', auth, authorize(['admin', 'hospital', 'responder']), createResource);
router.patch('/:id', auth, authorize(['admin', 'hospital', 'responder']), updateResourceStatus);
router.delete('/:id', auth, authorize(['admin']), deleteResource);

export default router;
