const express = require("express");

const router = express.Router();

const {
    generateChallenge,
    savePerformance,
    analyzePerformance,
    getPersonalizedChallenge,
    getAnalytics,
    saveWakeUpVerification
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

module.exports = router;