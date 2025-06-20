const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

exports.getHostDashboardData = async (req, res, next) => {
  try {
    const hostId = req.user._id;

    const totalListings = await Listing.countDocuments({ host: hostId });
    const totalBookings = await Booking.countDocuments({ host: hostId });

    const paidBookings = await Booking.find({
      host: hostId,
      status: { $in: ['paid', 'confirmed', 'checked_in', 'checked_out', 'completed'] }
    });

    const totalRevenue = paidBookings.reduce((acc, booking) => acc + (booking.pricing?.total || 0), 0);

    const listings = await Listing.find({ host: hostId });
    let avgRating = 0, totalRatingCount = 0;

    listings.forEach(listing => {
      if (listing.ratings && listing.ratings.count > 0) {
        avgRating += (listing.ratings.average * listing.ratings.count);
        totalRatingCount += listing.ratings.count;
      }
    });

    const averageRating = totalRatingCount > 0 ? (avgRating / totalRatingCount).toFixed(1) : 'N/A';

    const recentBookings = await Booking.find({ host: hostId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('guest', 'name email')
      .populate('listing', 'title');

    res.status(200).json({
      success: true,
      data: {
        totalListings,
        totalBookings,
        totalRevenue,
        averageRating,
        recentBookings
      }
    });

  } catch (error) {
    console.error('Error fetching host dashboard data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch host dashboard data' });
  }
};

exports.getGuestDashboardData = async (req, res, next) => {
  try {
    const guestId = req.user._id;

    const totalBookings = await Booking.countDocuments({ guest: guestId });

    const futureBookings = await Booking.find({
      guest: guestId,
      'dates.checkIn': { $gte: new Date() }
    })
      .sort({ 'dates.checkIn': 1 })
      .limit(5)
      .populate('listing', 'title location images');

    const completedBookings = await Booking.find({
      guest: guestId,
      status: { $in: ['completed', 'checked_out'] }
    });

    const totalSpent = completedBookings.reduce((acc, booking) => acc + (booking.pricing?.total || 0), 0);

    const recentCompletedStays = completedBookings
      .sort((a, b) => new Date(b.dates.checkOut) - new Date(a.dates.checkOut))
      .slice(0, 5)
      .map(booking => ({
        listing: booking.listing,
        dates: booking.dates,
        totalPaid: booking.pricing?.total || 0,
        status: booking.status
      }));

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        futureBookings,
        totalSpent,
        recentCompletedStays
      }
    });

  } catch (error) {
    console.error('Error fetching guest dashboard data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch guest dashboard data' });
  }
};
