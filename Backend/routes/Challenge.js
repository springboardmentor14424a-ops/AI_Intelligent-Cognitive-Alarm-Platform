const express = require("express");

const router = express.Router();

const {
    generateChallenge,
    savePerformance,
    analyzePerformance,
    getPersonalizedChallenge,
    getAnalytics,
    saveWakeUpVerification,
    saveBehaviorEvent,
    getBehaviorAnalytics,
    getBehaviorHistory
} = require("../controllers/challengeController");

router.post(
    "/generate",
    generateChallenge
);

router.post(
    "/performance",
    savePerformance
);

router.get(
    "/performance/analysis/:userId",
    analyzePerformance
);

router.get(
    "/performance/analytics/:userId",
    getAnalytics
);

router.get(
    "/personalized/:userId",
    getPersonalizedChallenge
);

// =====================================================
// SAVE WAKE-UP VERIFICATION
// =====================================================

router.post(
    "/wake-up-verification",
    saveWakeUpVerification
);

router.post(
    "/behavior/event",
    saveBehaviorEvent
);

router.get(
    "/behavior/analytics/:userId",
    getBehaviorAnalytics
);

router.get(
    "/behavior/history/:userId",
    getBehaviorHistory
);
module.exports = router;