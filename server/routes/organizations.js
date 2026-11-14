import express from 'express';
import {
    getOrganizations,
    getOrganizationById,
    createOrganization,
    updateOrganization,
    deleteOrganization
} from '../controllers/organizationController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public discovery endpoints
router.get('/', getOrganizations);
router.get('/:id', getOrganizationById);

// Protected administrative management endpoints
router.post('/', auth, authorize(['admin']), createOrganization);
router.patch('/:id', auth, authorize(['admin']), updateOrganization);
router.delete('/:id', auth, authorize(['admin']), deleteOrganization);

export default router;

