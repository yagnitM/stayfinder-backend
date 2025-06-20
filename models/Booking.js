const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.ObjectId,
    ref: 'Listing',
    required: [true, 'Booking must be associated with a listing']
  },
  guest: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must have a guest']
  },
  host: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must have a host']
  },
  dates: {
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required']
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required']
    },
    nights: {
      type: Number,
      required: true
    }
  },
  guests: {
    adults: {
      type: Number,
      required: [true, 'Number of adult guests is required'],
      min: [1, 'Must have at least 1 adult guest'],
      max: [16, 'Cannot exceed 16 adult guests']
    },
    children: {
      type: Number,
      default: 0,
      min: [0, 'Children count cannot be negative'],
      max: [5, 'Cannot exceed 5 children']
    },
    infants: {
      type: Number,
      default: 0,
      min: [0, 'Infants count cannot be negative'],
      max: [5, 'Cannot exceed 5 infants']
    },
    pets: {
      type: Number,
      default: 0,
      min: [0, 'Pets count cannot be negative'],
      max: [5, 'Cannot exceed 5 pets']
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    nights: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required']
    },
    serviceFee: {
      type: Number,
      required: [true, 'Service fee is required'],
      default: 0
    },
    cleaningFee: {
      type: Number,
      default: 0,
      min: [0, 'Cleaning fee cannot be negative']
    },
    taxes: {
      type: Number,
      default: 0,
      min: [0, 'Taxes cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
    }
  },
  status: {
    type: String,
    enum: [
      'pending',     // Waiting for host approval
      'confirmed',   // Host approved, payment pending
      'paid',        // Payment completed
      'checked_in',  // Guest has checked in
      'checked_out', // Guest has checked out
      'completed',   // Stay completed, can be reviewed
      'cancelled_by_guest',
      'cancelled_by_host',
      'cancelled_by_admin'
    ],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'cash'],
      required: [true, 'Payment method is required']
    },
    transactionId: {
      type: String
    },
    paymentDate: {
      type: Date
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    refundDate: {
      type: Date
    }
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters'],
    trim: true
  },
  guestContact: {
    phone: {
      type: String,
      trim: true
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  timeline: {
    bookedAt: {
      type: Date,
      default: Date.now
    },
    confirmedAt: {
      type: Date
    },
    paidAt: {
      type: Date
    },
    checkedInAt: {
      type: Date
    },
    checkedOutAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },
    refundPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict', 'super_strict', 'no_refund'],
      default: 'moderate'
    }
  },
  review: {
    guestReviewed: {
      type: Boolean,
      default: false
    },
    hostReviewed: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate nights and validate dates
bookingSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = Date.now();
  
  // Calculate nights
  if (this.dates.checkIn && this.dates.checkOut) {
    const checkIn = new Date(this.dates.checkIn);
    const checkOut = new Date(this.dates.checkOut);
    const diffTime = checkOut - checkIn;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return next(new Error('Check-out date must be after check-in date'));
    }
    
    this.dates.nights = diffDays;
    this.pricing.nights = diffDays;
  }
  
  // Validate dates are not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (this.dates.checkIn < today) {
    return next(new Error('Check-in date cannot be in the past'));
  }
  
  next();
});

// Pre-save middleware to calculate total guest count
bookingSchema.pre('save', function(next) {
  const totalGuests = this.guests.adults + this.guests.children + this.guests.infants;
  
  if (totalGuests > 20) {
    return next(new Error('Total guests cannot exceed 20'));
  }
  
  next();
});

// Static method to find bookings by date range
bookingSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      {
        'dates.checkIn': { $gte: startDate, $lte: endDate }
      },
      {
        'dates.checkOut': { $gte: startDate, $lte: endDate }
      },
      {
        'dates.checkIn': { $lte: startDate },
        'dates.checkOut': { $gte: endDate }
      }
    ],
    status: { $in: ['confirmed', 'paid', 'checked_in'] }
  });
};

// Static method to check if listing is available for dates
bookingSchema.statics.checkAvailability = async function(listingId, checkIn, checkOut) {
  const conflictingBookings = await this.find({
    listing: listingId,
    status: { $in: ['confirmed', 'paid', 'checked_in'] },
    $or: [
      {
        'dates.checkIn': { $lt: checkOut },
        'dates.checkOut': { $gt: checkIn }
      }
    ]
  });
  
  return conflictingBookings.length === 0;
};

// Instance method to calculate refund amount based on policy
bookingSchema.methods.calculateRefund = function() {
  const now = new Date();
  const checkIn = new Date(this.dates.checkIn);
  const daysUntilCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));
  
  let refundPercentage = 0;
  
  switch (this.cancellation.refundPolicy) {
    case 'flexible':
      refundPercentage = daysUntilCheckIn >= 1 ? 100 : 0;
      break;
    case 'moderate':
      if (daysUntilCheckIn >= 5) refundPercentage = 100;
      else if (daysUntilCheckIn >= 1) refundPercentage = 50;
      break;
    case 'strict':
      if (daysUntilCheckIn >= 7) refundPercentage = 100;
      else if (daysUntilCheckIn >= 1) refundPercentage = 50;
      break;
    case 'super_strict':
      if (daysUntilCheckIn >= 30) refundPercentage = 100;
      else if (daysUntilCheckIn >= 7) refundPercentage = 50;
      break;
    case 'no_refund':
      refundPercentage = 0;
      break;
  }
  
  return (this.pricing.total * refundPercentage) / 100;
};

// Instance method to update status with timeline
bookingSchema.methods.updateStatus = function(newStatus, userId = null) {
  this.status = newStatus;
  
  switch (newStatus) {
    case 'confirmed':
      this.timeline.confirmedAt = new Date();
      break;
    case 'paid':
      this.timeline.paidAt = new Date();
      break;
    case 'checked_in':
      this.timeline.checkedInAt = new Date();
      break;
    case 'checked_out':
      this.timeline.checkedOutAt = new Date();
      break;
    case 'completed':
      this.timeline.completedAt = new Date();
      break;
    case 'cancelled_by_guest':
    case 'cancelled_by_host':
    case 'cancelled_by_admin':
      this.timeline.cancelledAt = new Date();
      if (userId) this.cancellation.cancelledBy = userId;
      break;
  }
};

// Virtual for total guest count
bookingSchema.virtual('totalGuests').get(function() {
  return this.guests.adults + this.guests.children + this.guests.infants;
});

// Virtual for booking duration in days
bookingSchema.virtual('duration').get(function() {
  if (this.dates.checkIn && this.dates.checkOut) {
    const diffTime = new Date(this.dates.checkOut) - new Date(this.dates.checkIn);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Indexes for better performance
bookingSchema.index({ listing: 1, 'dates.checkIn': 1, 'dates.checkOut': 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
bookingSchema.index({ host: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'dates.checkIn': 1, 'dates.checkOut': 1 });
bookingSchema.index({ 'payment.transactionId': 1 }, { sparse: true });

// Ensure virtuals are included when converting to JSON
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);