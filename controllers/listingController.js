const Listing = require('../models/Listing');

// @desc    Get all listings with optional filters
// @route   GET /api/listings
// @access  Public
const getListings = async (req, res) => {
  try {
    const {
      location,
      minPrice,
      maxPrice,
      propertyType,
      roomType,
      guests,
      amenities,
      checkIn,
      checkOut,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { status: 'active' }; // Only show active listings
    
    if (location) {
      filter.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    if (propertyType) {
      filter.propertyType = propertyType;
    }
    
    if (roomType) {
      filter.roomType = roomType;
    }
    
    if (guests) {
      filter['capacity.guests'] = { $gte: Number(guests) };
    }
    
    if (amenities) {
      const amenityArray = amenities.split(',').map(a => a.trim());
      filter.amenities = { $in: amenityArray };
    }

    // Date availability filter
    if (checkIn && checkOut) {
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      
      filter['availability.blockedDates'] = {
        $not: {
          $elemMatch: {
            $or: [
              { startDate: { $lte: startDate }, endDate: { $gte: startDate } },
              { startDate: { $lte: endDate }, endDate: { $gte: endDate } },
              { startDate: { $gte: startDate }, endDate: { $lte: endDate } }
            ]
          }
        }
      };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get listings with pagination
    const listings = await Listing.find(filter)
      .populate('host', 'name email profilePicture')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Listing.countDocuments(filter);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: listings,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalListings: total,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching listings'
    });
  }
};

// @desc    Get single listing by ID
// @route   GET /api/listings/:id
// @access  Public
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('host', 'name email profilePicture joinedDate');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Get listing by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching listing'
    });
  }
};

// @desc    Create new listing
// @route   POST /api/listings
// @access  Private (Host only)
const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      propertyType,
      roomType,
      price,
      currency,
      location,
      capacity,
      amenities,
      images,
      availability,
      rules
    } = req.body;

    // Validation
    if (!title || !description || !propertyType || !roomType || !price || !location || !capacity || !availability) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate location fields
    if (!location.address || !location.city || !location.state || !location.country) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete location details (address, city, state, country)'
      });
    }

    // Validate capacity fields
    if (!capacity.guests || !capacity.bedrooms || !capacity.beds || !capacity.bathrooms) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete capacity details (guests, bedrooms, beds, bathrooms)'
      });
    }

    // Validate availability fields
    if (!availability.checkIn || !availability.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Please provide check-in and check-out times'
      });
    }

    // Create listing
    const listing = await Listing.create({
      title,
      description,
      propertyType,
      roomType,
      price,
      currency: currency || 'USD',
      location,
      capacity,
      amenities: amenities || [],
      images: images || [],
      availability,
      rules: rules || {},
      host: req.user.id
    });

    const populatedListing = await Listing.findById(listing._id)
      .populate('host', 'name email profilePicture');

    res.status(201).json({
      success: true,
      data: populatedListing,
      message: 'Listing created successfully'
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating listing'
    });
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private (Host only - own listings)
const updateListing = async (req, res) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if user is the owner of the listing
    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing'
      });
    }

    // Update listing
    listing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('host', 'name email profilePicture');

    res.json({
      success: true,
      data: listing,
      message: 'Listing updated successfully'
    });
  } catch (error) {
    console.error('Update listing error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating listing'
    });
  }
};

// @desc    Delete listing
// @route   DELETE /api/listings/:id
// @access  Private (Host only - own listings)
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if user is the owner of the listing
    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing'
      });
    }

    await Listing.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting listing'
    });
  }
};

// @desc    Get listings by host
// @route   GET /api/listings/host/:hostId
// @access  Public
const getListingsByHost = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const listings = await Listing.find({ host: req.params.hostId })
      .populate('host', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Listing.countDocuments({ host: req.params.hostId });

    res.json({
      success: true,
      data: listings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalListings: total
      }
    });
  } catch (error) {
    console.error('Get listings by host error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid host ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching host listings'
    });
  }
};

// @desc    Get user's own listings (dashboard)
// @route   GET /api/listings/my-listings
// @access  Private
const getMyListings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const listings = await Listing.find({ host: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Listing.countDocuments({ host: req.user.id });

    res.json({
      success: true,
      data: listings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalListings: total
      }
    });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your listings'
    });
  }
};

module.exports = {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByHost,
  getMyListings
};