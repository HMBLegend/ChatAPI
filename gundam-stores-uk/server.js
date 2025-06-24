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
app.use(express.static('.')); // Serve static files

// Store data file path
const STORES_FILE = path.join(__dirname, 'stores.json');

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

// Yelp API - Alternative review source
async function getYelpReviews(storeName, location) {
  try {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return [];
    }

    const response = await axios.get(
      `https://api.yelp.com/v3/businesses/search`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        params: {
          term: storeName,
          location: location,
          limit: 1
        }
      }
    );

    if (response.data.businesses && response.data.businesses.length > 0) {
      const businessId = response.data.businesses[0].id;
      
      // Get reviews for the business
      const reviewsResponse = await axios.get(
        `https://api.yelp.com/v3/businesses/${businessId}/reviews`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      if (reviewsResponse.data.reviews) {
        const maxReviews = parseInt(process.env.MAX_REVIEWS_PER_STORE) || 10;
        return reviewsResponse.data.reviews.slice(0, maxReviews).map(review => ({
          text: review.text,
          rating: review.rating,
          author: review.user.name,
          time: review.time_created,
          source: 'Yelp'
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('Error fetching Yelp reviews:', error.message);
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

    // Try Google Places API first
    const googlePlace = await findGooglePlace(store.name, store.location);
    if (googlePlace) {
      const googleReviews = await getGoogleReviews(googlePlace.place_id);
      newReviews = [...newReviews, ...googleReviews];
      
      if (googlePlace.rating) {
        newRating = googlePlace.rating;
        newReviewCount = googlePlace.user_ratings_total || store.reviewCount;
      }
    }

    // Try Yelp API as backup
    if (newReviews.length === 0) {
      const yelpReviews = await getYelpReviews(store.name, store.location);
      newReviews = [...newReviews, ...yelpReviews];
    }

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
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await saveStores(updatedStores);
    console.log('All store reviews updated successfully');
  } catch (error) {
    console.error('Error updating all store reviews:', error);
  }
}

// API Routes

// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await loadStores();
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stores' });
  }
});

// Get single store
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

// Manually update reviews for all stores
app.post('/api/stores/update-reviews', async (req, res) => {
  try {
    await updateAllStoreReviews();
    res.json({ message: 'Reviews updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reviews' });
  }
});

// Manually update reviews for a specific store
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

// Get system status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    autoFetchEnabled: process.env.AUTO_FETCH_REVIEWS === 'true',
    googleApiConfigured: !!process.env.GOOGLE_PLACES_API_KEY,
    yelpApiConfigured: !!process.env.YELP_API_KEY
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Schedule automatic review updates
if (process.env.AUTO_FETCH_REVIEWS === 'true') {
  const schedule = process.env.REVIEW_UPDATE_SCHEDULE || '0 */6 * * *'; // Every 6 hours by default
  
  cron.schedule(schedule, () => {
    console.log('Running scheduled review update...');
    updateAllStoreReviews();
  });
  
  console.log(`Automatic review updates scheduled: ${schedule}`);
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gundam Stores Backend running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Website available at http://localhost:${PORT}`);
  
  if (process.env.AUTO_FETCH_REVIEWS === 'true') {
    console.log('✅ Automatic review fetching is enabled');
  } else {
    console.log('⚠️  Automatic review fetching is disabled');
  }
  
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.log('⚠️  Google Places API key not configured');
  }
  
  if (!process.env.YELP_API_KEY) {
    console.log('⚠️  Yelp API key not configured');
  }
}); 