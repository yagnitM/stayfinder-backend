const express = require('express');
const {
  createBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  getHostBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingStats
} = require('../controllers/bookingController');

const { protect, authorize } = require('../middleware/authMiddleware'); 
const { validateBooking } = require('../middleware/validation'); 
const router = express.Router();

router.use(protect);

router.post('/', validateBooking, createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/host-bookings', getHostBookings);
router.get('/stats', getBookingStats);
router.get('/', authorize('admin'), getAllBookings);
router.get('/:id', getBookingById);
router.put('/:id/status', updateBookingStatus);
router.put('/:id/cancel', cancelBooking);
module.exports = router;