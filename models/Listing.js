const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for the listing'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  propertyType: {
    type: String,
    required: [true, 'Please specify property type'],
    enum: {
      values: ['apartment', 'house', 'villa', 'condo', 'studio', 'loft', 'cabin', 'hotel', 'hostel', 'other'],
      message: 'Property type must be one of: apartment, house, villa, condo, studio, loft, cabin, hotel, hostel, other'
    }
  },
  roomType: {
    type: String,
    required: [true, 'Please specify room type'],
    enum: {
      values: ['entire_place', 'private_room', 'shared_room'],
      message: 'Room type must be: entire_place, private_room, or shared_room'
    }
  },
  price: {
    type: Number,
    required: [true, 'Please provide price per night'],
    min: [1, 'Price must be at least $1 per night'],
    max: [10000, 'Price cannot exceed $10,000 per night']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Please provide an address'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Please provide city'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please provide state/province'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Please provide country'],
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    }
  },
  capacity: {
    guests: {
      type: Number,
      required: [true, 'Please specify maximum guests'],
      min: [1, 'Must accommodate at least 1 guest'],
      max: [50, 'Cannot accommodate more than 50 guests']
    },
    bedrooms: {
      type: Number,
      required: [true, 'Please specify number of bedrooms'],
      min: [0, 'Bedrooms cannot be negative'],
      max: [20, 'Cannot have more than 20 bedrooms']
    },
    beds: {
      type: Number,
      required: [true, 'Please specify number of beds'],
      min: [1, 'Must have at least 1 bed'],
      max: [50, 'Cannot have more than 50 beds']
    },
    bathrooms: {
      type: Number,
      required: [true, 'Please specify number of bathrooms'],
      min: [0.5, 'Must have at least 0.5 bathroom'],
      max: [20, 'Cannot have more than 20 bathrooms']
    }
  },
  amenities: [{
    type: String,
    enum: [
      'wifi', 'kitchen', 'parking', 'pool', 'gym', 'spa', 'laundry', 
      'air_conditioning', 'heating', 'tv', 'fireplace', 'balcony', 
      'garden', 'bbq', 'beach_access', 'pet_friendly', 'smoking_allowed',
      'wheelchair_accessible', 'elevator', 'doorman', 'concierge'
    ]
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  host: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Listing must have a host']
  },
  availability: {
    checkIn: {
      type: String,
      required: [true, 'Please specify check-in time'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Check-in time must be in HH:MM format']
    },
    checkOut: {
      type: String,
      required: [true, 'Please specify check-out time'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Check-out time must be in HH:MM format']
    },
    minimumStay: {
      type: Number,
      default: 1,
      min: [1, 'Minimum stay must be at least 1 night']
    },
    maximumStay: {
      type: Number,
      default: 365,
      min: [1, 'Maximum stay must be at least 1 night']
    },
    blockedDates: [{
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      },
      reason: {
        type: String,
        enum: ['booked', 'maintenance', 'personal_use', 'other'],
        default: 'booked'
      }
    }]
  },
  rules: {
    smoking: {
      type: Boolean,
      default: false
    },
    pets: {
      type: Boolean,
      default: false
    },
    parties: {
      type: Boolean,
      default: false
    },
    additionalRules: {
      type: String,
      maxlength: [500, 'Additional rules cannot exceed 500 characters']
    }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'pending'
  },
  featured: {
    type: Boolean,
    default: false
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

// Update the updatedAt field before saving
listingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one primary image
listingSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    let primaryCount = 0;
    this.images.forEach(image => {
      if (image.isPrimary) primaryCount++;
    });
    
    // If no primary image, make first one primary
    if (primaryCount === 0) {
      this.images[0].isPrimary = true;
    }
    // If multiple primary images, keep only the first one
    else if (primaryCount > 1) {
      let foundFirst = false;
      this.images.forEach(image => {
        if (image.isPrimary && foundFirst) {
          image.isPrimary = false;
        } else if (image.isPrimary && !foundFirst) {
          foundFirst = true;
        }
      });
    }
  }
  next();
});

// Validate blocked dates
listingSchema.pre('save', function(next) {
  if (this.availability.blockedDates) {
    for (let block of this.availability.blockedDates) {
      if (block.startDate >= block.endDate) {
        return next(new Error('Blocked date start must be before end date'));
      }
    }
  }
  next();
});

// Static method to find listings by location
listingSchema.statics.findByLocation = function(city, state, country) {
  const query = {};
  if (city) query['location.city'] = new RegExp(city, 'i');
  if (state) query['location.state'] = new RegExp(state, 'i');
  if (country) query['location.country'] = new RegExp(country, 'i');
  
  return this.find(query);
};

// Static method to find available listings for date range
listingSchema.statics.findAvailable = function(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return this.find({
    status: 'active',
    'availability.blockedDates': {
      $not: {
        $elemMatch: {
          $or: [
            { startDate: { $lte: start }, endDate: { $gte: start } },
            { startDate: { $lte: end }, endDate: { $gte: end } },
            { startDate: { $gte: start }, endDate: { $lte: end } }
          ]
        }
      }
    }
  });
};

// Instance method to check availability for specific dates
listingSchema.methods.isAvailable = function(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let block of this.availability.blockedDates) {
    if (
      (block.startDate <= start && block.endDate >= start) ||
      (block.startDate <= end && block.endDate >= end) ||
      (block.startDate >= start && block.endDate <= end)
    ) {
      return false;
    }
  }
  return true;
};

// Instance method to calculate total price for stay
listingSchema.methods.calculateTotalPrice = function(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  return {
    nights,
    pricePerNight: this.price,
    subtotal: this.price * nights,
    serviceFee: Math.round(this.price * nights * 0.14), // 14% service fee
    cleaningFee: 50, // Fixed cleaning fee
    total: this.price * nights + Math.round(this.price * nights * 0.14) + 50
  };
};

// Virtual for primary image
listingSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    const primary = this.images.find(img => img.isPrimary);
    return primary ? primary.url : this.images[0].url;
  }
  return null;
});

// Indexes for better performance
listingSchema.index({ 'location.city': 1, 'location.state': 1, 'location.country': 1 });
listingSchema.index({ 'location.coordinates': '2dsphere' });
listingSchema.index({ host: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ 'ratings.average': -1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ featured: -1, 'ratings.average': -1 });

// Ensure virtuals are included when converting to JSON
listingSchema.set('toJSON', { virtuals: true });
listingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema);