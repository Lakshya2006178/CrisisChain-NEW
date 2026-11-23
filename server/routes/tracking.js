import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { recordLocation, getLiveResponders, simulatePing } from '../controllers/trackingController.js';

const router = express.Router();

// Get all live responder coordinates (public / authenticated)
router.get('/live', getLiveResponders);

// Broadcast responder GPS location (authenticated responders & admins)
router.post('/location', auth, authorize(['responder', 'admin']), recordLocation);

// Simulate GPS movement (authenticated admins & responders)
router.post('/simulate', auth, authorize(['admin', 'responder']), simulatePing);

export default router;
