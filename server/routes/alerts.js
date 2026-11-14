import express from 'express';
import { createAlert, getAlerts, updateAlertStatus, getStats, detectLocation } from '../controllers/alertController.js';
import { auth, authorize, optionalAuth } from '../middleware/auth.js';
import handleIncidentUpload from '../middleware/upload.js';

const router = express.Router();

router.get('/detect-location', detectLocation);
router.get('/stats', getStats);
router.get('/', getAlerts);
router.post('/', optionalAuth, handleIncidentUpload('image'), createAlert);
router.patch('/:id/status', auth, authorize(['admin', 'responder']), updateAlertStatus);

export default router;
