const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getHostDashboardData,
  getGuestDashboardData
} = require('../controllers/dashboardController');

const router = express.Router();

router.get('/host-summary', protect, getHostDashboardData);
router.get('/guest-summary', protect, getGuestDashboardData);

module.exports = router;