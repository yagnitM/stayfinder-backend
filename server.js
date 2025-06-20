const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const dashboardRoutes = require('./routes/dashboardRoutes');

dotenv.config();
require('./config/passport'); // Initialize passport config

const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ✅ Use CORS with credentials support
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL (or use process.env.CLIENT_URL)
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('StayFinder Backend is running!');
});


app.use(express.json());

// ✅ Sessions must be set up before passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax', // Or 'none' if you're using HTTPS
    secure: false    // Set to true in production with HTTPS
  }
}));

// ✅ Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// ✅ API routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ✅ Error handling
app.use(errorHandler);

// ✅ Connect to Mongo and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });
