const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

const {
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    createPlatformAnnouncement
} = require("../controllers/notificationController");

/* CREATE NOTIFICATION */
router.post("/", createNotification);

/* PLATFORM ANNOUNCEMENT */
router.post(
    "/announcement",
    auth,
    createPlatformAnnouncement
);


/* GET USER NOTIFICATIONS */
router.get("/user/:userId", getUserNotifications);


/* MARK NOTIFICATION AS READ */
router.patch("/:notificationId/read", markNotificationAsRead);


module.exports = router;