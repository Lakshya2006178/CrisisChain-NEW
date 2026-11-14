import express from 'express';
import {
    getUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    updateUser
} from '../controllers/userController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All user management routes require admin role
router.use(auth, authorize(['admin']));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/role', updateUserRole);
router.patch('/:id', updateUser);

export default router;

