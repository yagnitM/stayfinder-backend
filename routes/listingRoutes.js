const express = require('express');
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByHost,
  getMyListings
} = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getListings); 
router.get('/dashboard/my-listings', protect, getMyListings);
router.get('/host/:hostId', getListingsByHost); 
router.get('/:id', getListingById); 

router.post('/', protect, createListing); 
router.put('/:id', protect, updateListing); 
router.delete('/:id', protect, deleteListing); 

module.exports = router;