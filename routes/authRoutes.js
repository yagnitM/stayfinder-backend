const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { 
  register, 
  login, 
  getMe, 
  logout, 
  verifyEmail, 
  resendVerification, 
  updateProfile 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.put('/profile', protect, updateProfile);
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      const user = req.user;
      const token = user.generateAuthToken();
      res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
    }
  }
);
router.post('/login-session', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(200).json({ 
        success: true, 
        message: 'User logged in successfully', 
        user: user.getPublicProfile() 
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout-session', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.status(200).json({ 
      success: true, 
      message: 'User logged out successfully' 
    });
  });
});

router.get('/me-session', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ 
      success: true, 
      user: req.user.getPublicProfile() 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Not logged in' 
    });
  }
});

module.exports = router;