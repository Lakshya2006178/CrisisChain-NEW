import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    getAvailableResponders
} from '../controllers/assignmentController.js';

const router = express.Router();

// Available responders list for dispatching (Admin only)
router.get('/available-responders', auth, authorize(['admin']), getAvailableResponders);

// List assignments (Filtered by query params)
router.get('/', auth, getAssignments);

// Single assignment details
router.get('/:id', auth, getAssignmentById);

// Create new assignment (Admin only)
router.post('/', auth, authorize(['admin']), createAssignment);

// Update assignment status (Admin or assigned responder)
router.patch('/:id/status', auth, authorize(['admin', 'responder']), updateAssignmentStatus);

// Delete / unassign (Admin only)
router.delete('/:id', auth, authorize(['admin']), deleteAssignment);

export default router;

