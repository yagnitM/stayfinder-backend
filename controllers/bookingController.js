const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  try {
    const {
      listingId,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      guestContact,
      paymentMethod
    } = req.body;

    // Validation
    if (!listingId || !checkIn || !checkOut || !guests || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required booking details'
      });
    }

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if listing is active
    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This listing is not available for booking'
      });
    }

    // Check if user is trying to book their own listing
    if (listing.host.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own listing'
      });
    }

    // Validate guest count
    const totalGuests = guests.adults + (guests.children || 0) + (guests.infants || 0);
    if (totalGuests > listing.capacity.guests) {
      return res.status(400).json({
        success: false,
        message: `This listing can only accommodate ${listing.capacity.guests} guests`
      });
    }

    // Check availability
    const isAvailable = await Booking.checkAvailability(listingId, new Date(checkIn), new Date(checkOut));
    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        message: 'Selected dates are not available'
      });
    }

    // Check listing's blocked dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (!listing.isAvailable(checkInDate, checkOutDate)) {
      return res.status(409).json({
        success: false,
        message: 'Selected dates are blocked by the host'
      });
    }

    // Calculate pricing
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const subtotal = listing.price * nights;
    const serviceFee = Math.round(subtotal * 0.14); // 14% service fee
    const cleaningFee = 50; // Fixed cleaning fee
    const taxes = Math.round(subtotal * 0.08); // 8% taxes
    const total = subtotal + serviceFee + cleaningFee + taxes;

    // Create booking
    const booking = await Booking.create({
      listing: listingId,
      guest: req.user.id,
      host: listing.host,
      dates: {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights
      },
      guests: {
        adults: guests.adults,
        children: guests.children || 0,
        infants: guests.infants || 0,
        pets: guests.pets || 0
      },
      pricing: {
        basePrice: listing.price,
        nights,
        subtotal,
        serviceFee,
        cleaningFee,
        taxes,
        total,
        currency: listing.currency || 'USD'
      },
      payment: {
        method: paymentMethod
      },
      specialRequests: specialRequests || '',
      guestContact: guestContact || {}
    });

    // Populate booking data
    const populatedBooking = await Booking.findById(booking._id)
      .populate('listing', 'title location images primaryImage')
      .populate('guest', 'name email profilePicture')
      .populate('host', 'name email profilePicture');

    res.status(201).json({
      success: true,
      data: populatedBooking,
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
};

// @desc    Get all bookings (with filters)
// @route   GET /api/bookings
// @access  Private (Admin only)
const getAllBookings = async (req, res) => {
  try {
    const {
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter['dates.checkIn'] = {};
      if (startDate) filter['dates.checkIn'].$gte = new Date(startDate);
      if (endDate) filter['dates.checkIn'].$lte = new Date(endDate);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const bookings = await Booking.find(filter)
      .populate('listing', 'title location images primaryImage')
      .populate('guest', 'name email profilePicture')
      .populate('host', 'name email profilePicture')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalBookings: total
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title description location images amenities rules availability')
      .populate('guest', 'name email profilePicture phone')
      .populate('host', 'name email profilePicture phone')
      .populate('cancellation.cancelledBy', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has permission to view this booking
    const isGuest = booking.guest._id.toString() === req.user.id;
    const isHost = booking.host._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
};

// @desc    Get user's bookings (as guest)
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { guest: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await Booking.find(filter)
      .populate('listing', 'title location images primaryImage')
      .populate('host', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalBookings: total
      }
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your bookings'
    });
  }
};

// @desc    Get host's bookings (received bookings)
// @route   GET /api/bookings/host-bookings
// @access  Private
const getHostBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { host: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await Booking.find(filter)
      .populate('listing', 'title location images primaryImage')
      .populate('guest', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalBookings: total
      }
    });
  } catch (error) {
    console.error('Get host bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching host bookings'
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    const isGuest = booking.guest.toString() === req.user.id;
    const isHost = booking.host.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Validate status transitions
    const allowedTransitions = {
      pending: {
        guest: [],
        host: ['confirmed', 'cancelled_by_host'],
        admin: ['confirmed', 'cancelled_by_admin']
      },
      confirmed: {
        guest: ['cancelled_by_guest'],
        host: ['paid', 'cancelled_by_host'],
        admin: ['paid', 'cancelled_by_admin']
      },
      paid: {
        guest: ['cancelled_by_guest'],
        host: ['checked_in', 'cancelled_by_host'],
        admin: ['checked_in', 'cancelled_by_admin']
      },
      checked_in: {
        guest: [],
        host: ['checked_out'],
        admin: ['checked_out']
      },
      checked_out: {
        guest: [],
        host: ['completed'],
        admin: ['completed']
      }
    };

    let userRole = 'guest';
    if (isHost) userRole = 'host';
    if (isAdmin) userRole = 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    const currentStatusTransitions = allowedTransitions[booking.status];
    if (!currentStatusTransitions || !currentStatusTransitions[userRole].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${booking.status} to ${status}`
      });
    }

    // Update status with timeline
    booking.updateStatus(status, req.user.id);
    await booking.save();

    // Populate updated booking
    const updatedBooking = await Booking.findById(booking._id)
      .populate('listing', 'title location images primaryImage')
      .populate('guest', 'name email profilePicture')
      .populate('host', 'name email profilePicture');

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    const isGuest = booking.guest.toString() === req.user.id;
    const isHost = booking.host.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    const cancellableStatuses = ['pending', 'confirmed', 'paid'];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled'
      });
    }

    // Determine cancellation status
    let cancelStatus = 'cancelled_by_guest';
    if (isHost) cancelStatus = 'cancelled_by_host';
    if (isAdmin) cancelStatus = 'cancelled_by_admin';

    // Calculate refund
    const refundAmount = booking.calculateRefund();

    // Update booking
    booking.updateStatus(cancelStatus, req.user.id);
    booking.cancellation.reason = reason || '';
    booking.payment.refundAmount = refundAmount;
    
    if (refundAmount > 0) {
      booking.payment.refundDate = new Date();
    }

    await booking.save();

    // Populate updated booking
    const updatedBooking = await Booking.findById(booking._id)
      .populate('listing', 'title location images primaryImage')
      .populate('guest', 'name email profilePicture')
      .populate('host', 'name email profilePicture');

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking cancelled successfully',
      refundAmount
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private
const getBookingStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { role } = req.query; // 'guest' or 'host'

    const filter = role === 'host' ? { host: userId } : { guest: userId };

    const stats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        totalBookings,
        statusBreakdown: stats,
        role: role || 'guest'
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking statistics'
    });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  getHostBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingStats
};