import express from 'express';
import {
    getHospitalResources,
    updateHospitalResources,
    updateHospitalItem
} from '../controllers/hospitalController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Hospital resources endpoints (Accessible by Hospital Representatives and Admins)
router.get('/resources', auth, authorize(['hospital', 'admin']), getHospitalResources);
router.put('/resources', auth, authorize(['hospital', 'admin']), updateHospitalResources);
router.patch('/resources/:category/:id', auth, authorize(['hospital', 'admin']), updateHospitalItem);

export default router;

