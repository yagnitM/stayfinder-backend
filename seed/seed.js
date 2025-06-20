const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

// Import models
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

// Sample data arrays
const cities = [
  { city: 'New York', state: 'New York', country: 'United States', coords: [-74.0059, 40.7128] },
  { city: 'Los Angeles', state: 'California', country: 'United States', coords: [-118.2437, 34.0522] },
  { city: 'Chicago', state: 'Illinois', country: 'United States', coords: [-87.6298, 41.8781] },
  { city: 'Miami', state: 'Florida', country: 'United States', coords: [-80.1918, 25.7617] },
  { city: 'San Francisco', state: 'California', country: 'United States', coords: [-122.4194, 37.7749] },
  { city: 'Austin', state: 'Texas', country: 'United States', coords: [-97.7431, 30.2672] },
  { city: 'Seattle', state: 'Washington', country: 'United States', coords: [-122.3321, 47.6062] },
  { city: 'Denver', state: 'Colorado', country: 'United States', coords: [-104.9903, 39.7392] },
  { city: 'Portland', state: 'Oregon', country: 'United States', coords: [-122.6784, 45.5152] },
  { city: 'Nashville', state: 'Tennessee', country: 'United States', coords: [-86.7816, 36.1627] }
];

const propertyTypes = ['apartment', 'house', 'villa', 'condo', 'studio', 'loft', 'cabin'];
const roomTypes = ['entire_place', 'private_room', 'shared_room'];
const amenitiesList = ['wifi', 'kitchen', 'parking', 'pool', 'gym', 'laundry', 'air_conditioning', 'heating', 'tv', 'fireplace', 'balcony', 'pet_friendly'];

const sampleImages = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
];

// Helper functions
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomElements = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomPrice = () => getRandomNumber(50, 500);

// Generate future dates
const getFutureDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const getPastDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

// Sample users data (removed admin)
const usersData = [
  // Hosts
  { name: 'Sarah Johnson', email: 'sarah.johnson@email.com', role: 'host', phone: '+1-555-0101' },
  { name: 'Michael Chen', email: 'michael.chen@email.com', role: 'host', phone: '+1-555-0102' },
  { name: 'Emily Rodriguez', email: 'emily.rodriguez@email.com', role: 'host', phone: '+1-555-0103' },
  { name: 'David Kim', email: 'david.kim@email.com', role: 'host', phone: '+1-555-0104' },
  { name: 'Lisa Thompson', email: 'lisa.thompson@email.com', role: 'host', phone: '+1-555-0105' },
  { name: 'James Wilson', email: 'james.wilson@email.com', role: 'host', phone: '+1-555-0106' },
  { name: 'Maria Garcia', email: 'maria.garcia@email.com', role: 'host', phone: '+1-555-0107' },
  { name: 'Robert Brown', email: 'robert.brown@email.com', role: 'host', phone: '+1-555-0108' },
  { name: 'Jennifer Davis', email: 'jennifer.davis@email.com', role: 'host', phone: '+1-555-0109' },
  { name: 'Alex Miller', email: 'alex.miller@email.com', role: 'host', phone: '+1-555-0110' },
  
  // Guests
  { name: 'John Smith', email: 'john.smith@email.com', role: 'user', phone: '+1-555-0201' },
  { name: 'Amanda White', email: 'amanda.white@email.com', role: 'user', phone: '+1-555-0202' },
  { name: 'Ryan Taylor', email: 'ryan.taylor@email.com', role: 'user', phone: '+1-555-0203' },
  { name: 'Jessica Anderson', email: 'jessica.anderson@email.com', role: 'user', phone: '+1-555-0204' },
  { name: 'Kevin Martinez', email: 'kevin.martinez@email.com', role: 'user', phone: '+1-555-0205' },
  { name: 'Lauren Wilson', email: 'lauren.wilson@email.com', role: 'user', phone: '+1-555-0206' },
  { name: 'Chris Johnson', email: 'chris.johnson@email.com', role: 'user', phone: '+1-555-0207' },
  { name: 'Rachel Green', email: 'rachel.green@email.com', role: 'user', phone: '+1-555-0208' },
  { name: 'Mark Davis', email: 'mark.davis@email.com', role: 'user', phone: '+1-555-0209' },
  { name: 'Sophie Brown', email: 'sophie.brown@email.com', role: 'user', phone: '+1-555-0210' },
  { name: 'Daniel Lee', email: 'daniel.lee@email.com', role: 'user', phone: '+1-555-0211' },
  { name: 'Emma Clark', email: 'emma.clark@email.com', role: 'user', phone: '+1-555-0212' },
  { name: 'Tom Anderson', email: 'tom.anderson@email.com', role: 'user', phone: '+1-555-0213' },
  { name: 'Olivia Martinez', email: 'olivia.martinez@email.com', role: 'user', phone: '+1-555-0214' },
  { name: 'Jake Wilson', email: 'jake.wilson@email.com', role: 'user', phone: '+1-555-0215' }
];

// Property titles and descriptions
const propertyTitles = [
  'Cozy Downtown Apartment', 'Luxury Penthouse Suite', 'Charming Victorian House',
  'Modern Loft in Arts District', 'Beachfront Villa Paradise', 'Mountain Cabin Retreat',
  'Stylish Studio Near Transit', 'Historic Brownstone Home', 'Contemporary Condo with View',
  'Rustic Farmhouse Escape', 'Chic Urban Apartment', 'Elegant Townhouse',
  'Spacious Family Home', 'Designer Loft Space', 'Waterfront Cottage',
  'Modern High-Rise Apartment', 'Bohemian Artist Studio', 'Classic Brick House',
  'Minimalist Design Apartment', 'Garden Oasis Home', 'Industrial Loft Conversion',
  'Sunny Penthouse Retreat', 'Vintage Charm House', 'Smart Home Technology',
  'Eco-Friendly Green Home', 'Urban Sanctuary Apartment', 'Trendy Warehouse Loft',
  'Family-Friendly Suburban Home', 'Luxury Executive Suite', 'Artistic Creative Space'
];

const descriptions = [
  'A beautifully appointed space perfect for your stay. Recently renovated with modern amenities and thoughtful touches throughout.',
  'Experience luxury living in this stunning property. Floor-to-ceiling windows offer breathtaking views of the city skyline.',
  'This charming home offers the perfect blend of comfort and style. Located in a quiet neighborhood with easy access to attractions.',
  'A unique space that combines modern convenience with classic character. Perfect for both business and leisure travelers.',
  'Relax and unwind in this peaceful retreat. The space features high-end finishes and premium amenities for your comfort.',
  'This stylish property is ideally located near restaurants, shopping, and entertainment. A perfect base for exploring the city.',
  'A thoughtfully designed space with attention to every detail. Enjoy modern amenities in a beautifully decorated environment.',
  'This exceptional property offers luxury accommodations with personalized service. Experience the best the city has to offer.',
  'A contemporary space perfect for discerning travelers. Features premium amenities and stunning design elements throughout.',
  'This inviting home provides a comfortable and memorable stay. Located in a vibrant neighborhood with plenty to explore.'
];

// Clear existing data and seed new data
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Note: This script will add new data without clearing existing data

    // Create Users
    console.log('👥 Creating users...');
    const users = [];
    for (const userData of usersData) {
      const user = new User({
        ...userData,
        password: 'password123', // All users have same password for testing
        isVerified: true,
        createdAt: getPastDate(getRandomNumber(1, 365))
      });
      users.push(await user.save());
    }
    console.log(`✅ Created ${users.length} users`);

    // Separate hosts and guests
    const hosts = users.filter(user => user.role === 'host');
    const guests = users.filter(user => user.role === 'user');

    // Create Listings
    console.log('🏠 Creating listings...');
    const listings = [];
    
    for (let i = 0; i < 60; i++) {
      const host = getRandomElement(hosts);
      const location = getRandomElement(cities);
      const propertyType = getRandomElement(propertyTypes);
      const roomType = getRandomElement(roomTypes);
      const price = getRandomPrice();
      
      // Generate images for this listing
      const numImages = getRandomNumber(3, 6);
      const listingImages = [];
      for (let j = 0; j < numImages; j++) {
        listingImages.push({
          url: getRandomElement(sampleImages),
          caption: j === 0 ? 'Main view' : `View ${j + 1}`,
          isPrimary: j === 0
        });
      }
      
      const listing = new Listing({
        title: getRandomElement(propertyTitles),
        description: getRandomElement(descriptions),
        propertyType,
        roomType,
        price,
        currency: 'USD',
        location: {
          address: `${getRandomNumber(100, 9999)} ${getRandomElement(['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Broadway'])}`,
          city: location.city,
          state: location.state,
          country: location.country,
          zipCode: `${getRandomNumber(10000, 99999)}`,
          coordinates: {
            type: 'Point',
            coordinates: location.coords
          }
        },
        capacity: {
          guests: getRandomNumber(1, 8),
          bedrooms: getRandomNumber(1, 4),
          beds: getRandomNumber(1, 6),
          bathrooms: getRandomNumber(1, 3) + (Math.random() > 0.5 ? 0.5 : 0)
        },
        amenities: getRandomElements(amenitiesList, getRandomNumber(3, 8)),
        images: listingImages,
        host: host._id,
        availability: {
          checkIn: `${getRandomNumber(14, 16)}:00`,
          checkOut: `${getRandomNumber(10, 12)}:00`,
          minimumStay: getRandomNumber(1, 3),
          maximumStay: getRandomNumber(7, 30),
          blockedDates: []
        },
        rules: {
          smoking: Math.random() > 0.8,
          pets: Math.random() > 0.6,
          parties: Math.random() > 0.9,
          additionalRules: Math.random() > 0.7 ? 'Quiet hours after 10 PM' : undefined
        },
        ratings: {
          average: Math.random() > 0.3 ? +(Math.random() * 2 + 3).toFixed(1) : 0,
          count: Math.random() > 0.3 ? getRandomNumber(1, 50) : 0
        },
        status: Math.random() > 0.1 ? 'active' : getRandomElement(['pending', 'inactive']),
        featured: Math.random() > 0.8,
        createdAt: getPastDate(getRandomNumber(1, 200))
      });
      
      listings.push(await listing.save());
    }
    console.log(`✅ Created ${listings.length} listings`);

    // Create Bookings
    console.log('📅 Creating bookings...');
    const bookings = [];
    const activeListings = listings.filter(listing => listing.status === 'active');
    
    // Temporarily disable validation for seeding
    const originalValidate = Booking.prototype.validate;
    Booking.prototype.validate = function() { return Promise.resolve(); };
    
    for (let i = 0; i < 120; i++) {
      const listing = getRandomElement(activeListings);
      const guest = getRandomElement(guests);
      const host = hosts.find(h => h._id.toString() === listing.host.toString());
      
      // Generate random dates (only future dates to avoid validation issues)
      const checkInDaysFromNow = getRandomNumber(1, 60); // Only future bookings
      const checkIn = getFutureDate(checkInDaysFromNow);
      const nights = getRandomNumber(1, 7);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + nights);
      
      const adults = getRandomNumber(1, Math.min(4, listing.capacity.guests));
      const children = getRandomNumber(0, Math.min(2, listing.capacity.guests - adults));
      
      const subtotal = listing.price * nights;
      const serviceFee = Math.round(subtotal * 0.14);
      const cleaningFee = getRandomNumber(25, 75);
      const taxes = Math.round(subtotal * 0.12);
      const total = subtotal + serviceFee + cleaningFee + taxes;
      
      // Determine status based on date (all future, so pending/confirmed)
      let status = getRandomElement(['confirmed', 'paid', 'pending']);
      
      // Some bookings are cancelled
      if (Math.random() > 0.85) {
        status = getRandomElement(['cancelled_by_guest', 'cancelled_by_host']);
      }
      
      const booking = new Booking({
        listing: listing._id,
        guest: guest._id,
        host: host._id,
        dates: {
          checkIn,
          checkOut,
          nights
        },
        guests: {
          adults,
          children,
          infants: getRandomNumber(0, 1),
          pets: listing.rules.pets && Math.random() > 0.8 ? getRandomNumber(0, 1) : 0
        },
        pricing: {
          basePrice: listing.price,
          nights,
          subtotal,
          serviceFee,
          cleaningFee,
          taxes,
          total,
          currency: 'USD'
        },
        status,
        payment: {
          method: getRandomElement(['stripe', 'paypal']),
          transactionId: status === 'paid' || status === 'checked_in' || status === 'checked_out' || status === 'completed' 
            ? `txn_${Math.random().toString(36).substr(2, 9)}` : undefined,
          paymentDate: ['paid', 'checked_in', 'checked_out', 'completed'].includes(status) 
            ? new Date(checkIn.getTime() - getRandomNumber(1, 10) * 24 * 60 * 60 * 1000) : undefined
        },
        specialRequests: Math.random() > 0.7 
          ? getRandomElement([
              'Early check-in if possible',
              'Late checkout requested',
              'Need recommendations for restaurants',
              'Celebrating anniversary',
              'First time visiting the city'
            ]) : undefined,
        guestContact: {
          phone: guest.phone
        },
        timeline: {
          bookedAt: getPastDate(getRandomNumber(1, 60))
        },
        cancellation: status.includes('cancelled') ? {
          reason: getRandomElement([
            'Change in travel plans',
            'Emergency came up',
            'Found alternative accommodation',
            'Work commitment conflict'
          ]),
          refundPolicy: getRandomElement(['flexible', 'moderate', 'strict'])
        } : undefined,
        review: {
          guestReviewed: status === 'completed' ? Math.random() > 0.3 : false,
          hostReviewed: status === 'completed' ? Math.random() > 0.4 : false
        },
        createdAt: getPastDate(getRandomNumber(1, 90))
      });
      
      bookings.push(await booking.save({ validateBeforeSave: false }));
    }
    
    // Restore original validation
    Booking.prototype.validate = originalValidate;
    
    console.log(`✅ Created ${bookings.length} bookings`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length} (${hosts.length} hosts, ${guests.length} guests)`);
    console.log(`🏠 Listings: ${listings.length}`);
    console.log(`📅 Bookings: ${bookings.length}`);
    
    // Sample login credentials
    console.log('\n🔑 Sample Login Credentials:');
    console.log('Host: sarah.johnson@email.com / password123');
    console.log('Guest: john.smith@email.com / password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;