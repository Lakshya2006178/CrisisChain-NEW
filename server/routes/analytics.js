import express from 'express';
import {
    getAnalyticsOverview,
    getIncidentAnalytics,
    getResponderAnalytics,
    getResourceAnalytics,
    getActivityLogs,
    getIncidentDistribution,
    getResponseTrends,
    getIncidentTrends
} from '../controllers/analyticsController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Real-time Analytics Endpoints (Protected by auth)
router.get('/overview', auth, getAnalyticsOverview);
router.get('/incidents', auth, getIncidentAnalytics);
router.get('/responders', auth, getResponderAnalytics);
router.get('/resources', auth, getResourceAnalytics);
router.get('/activity-logs', auth, getActivityLogs);

// Backward compatibility endpoints (Protected by auth)
router.get('/incident-distribution', auth, getIncidentDistribution);
router.get('/response-trends', auth, getResponseTrends);
router.get('/incident-trends', auth, getIncidentTrends);

export default router;
