const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store data file path
const STORES_FILE = path.join(__dirname, '../stores.json');

// Load stores data
async function loadStores() {
  try {
    const data = await fs.readFile(STORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading stores:', error);
    return [];
  }
}

// Save stores data
async function saveStores(stores) {
  try {
    await fs.writeFile(STORES_FILE, JSON.stringify(stores, null, 2));
    console.log('Stores data saved successfully');
  } catch (error) {
    console.error('Error saving stores:', error);
  }
}

// Google Places API - Find place by name and location
async function findGooglePlace(storeName, location) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.log('Google Places API key not configured');
      return null;
    }
    const searchQuery = `${storeName} ${location}`;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`,
      {
        params: {
          input: searchQuery,
          inputtype: 'textquery',
          fields: 'place_id,name,rating,user_ratings_total,formatted_address',
          key: apiKey
        }
      }
    );
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding Google place:', error.message);
    return null;
  }
}

// Google Places API - Get reviews for a place
async function getGoogleReviews(placeId) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return [];
    }
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          fields: 'reviews,rating,user_ratings_total',
          key: apiKey
        }
      }
    );
    if (response.data.result && response.data.result.reviews) {
      const maxReviews = parseInt(process.env.MAX_REVIEWS_PER_STORE) || 10;
      return response.data.result.reviews.slice(0, maxReviews).map(review => ({
        text: review.text,
        rating: review.rating,
        author: review.author_name,
        time: review.time,
        source: 'Google'
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Google reviews:', error.message);
    return [];
  }
}

// Update reviews for a single store
async function updateStoreReviews(store) {
  try {
    console.log(`Updating reviews for: ${store.name}`);
    let newReviews = [];
    let newRating = store.rating;
    let newReviewCount = store.reviewCount;
    // Try Google Places API only
    const googlePlace = await findGooglePlace(store.name, store.location);
    if (googlePlace) {
      const googleReviews = await getGoogleReviews(googlePlace.place_id);
      newReviews = [...newReviews, ...googleReviews];
      if (googlePlace.rating) {
        newRating = googlePlace.rating;
        newReviewCount = googlePlace.user_ratings_total || store.reviewCount;
      }
    }
    // Do NOT fetch from Yelp or any other source
    // (Yelp fallback removed)
    // Update store with new reviews
    if (newReviews.length > 0) {
      store.reviews = newReviews;
      store.rating = newRating;
      store.reviewCount = newReviewCount;
      store.lastUpdated = new Date().toISOString();
      console.log(`Updated ${store.name} with ${newReviews.length} reviews`);
    } else {
      console.log(`No new reviews found for ${store.name}`);
    }
    return store;
  } catch (error) {
    console.error(`Error updating reviews for ${store.name}:`, error.message);
    return store;
  }
}

// Update all stores' reviews
async function updateAllStoreReviews() {
  try {
    console.log('Starting automatic review update...');
    const stores = await loadStores();
    const updatedStores = [];
    for (const store of stores) {
      const updatedStore = await updateStoreReviews(store);
      updatedStores.push(updatedStore);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await saveStores(updatedStores);
    console.log('All store reviews updated successfully');
  } catch (error) {
    console.error('Error updating all store reviews:', error);
  }
}

// API Routes
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await loadStores();
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stores' });
  }
});
app.get('/api/stores/:id', async (req, res) => {
  try {
    const stores = await loadStores();
    const store = stores.find(s => s.name.toLowerCase().replace(/\s+/g, '-') === req.params.id);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load store' });
  }
});
app.post('/api/stores/update-reviews', async (req, res) => {
  try {
    await updateAllStoreReviews();
    res.json({ message: 'Reviews updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reviews' });
  }
});
app.post('/api/stores/:id/update-reviews', async (req, res) => {
  try {
    const stores = await loadStores();
    const storeIndex = stores.findIndex(s => s.name.toLowerCase().replace(/\s+/g, '-') === req.params.id);
    if (storeIndex === -1) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const updatedStore = await updateStoreReviews(stores[storeIndex]);
    stores[storeIndex] = updatedStore;
    await saveStores(stores);
    res.json({ message: 'Store reviews updated successfully', store: updatedStore });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store reviews' });
  }
});
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    autoFetchEnabled: process.env.AUTO_FETCH_REVIEWS === 'true',
    googleApiConfigured: !!process.env.GOOGLE_PLACES_API_KEY
  });
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
// Remove listen() for Vercel compatibility
// module.exports = app for Vercel
module.exports = app; 