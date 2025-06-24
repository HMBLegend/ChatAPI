// Global variables
let allStores = [];
let filteredStores = [];
let map;
let markers = [];
let apiBaseUrl = 'http://localhost:3000/api'; // Backend API URL

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  loadStores();
  initializeMap();
  setupEventListeners();
  setupAdminPanel();
});

// Load stores data from backend API
async function loadStores() {
  try {
    const response = await fetch(`${apiBaseUrl}/stores`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allStores = await response.json();
    filteredStores = [...allStores];
    displayStores();
    updateMap();
    updateStatusDisplay();
  } catch (error) {
    console.error('Error loading store data:', error);
    // Fallback to local file if API is not available
    try {
      const localResponse = await fetch('stores.json');
      allStores = await localResponse.json();
      filteredStores = [...allStores];
      displayStores();
      updateMap();
    } catch (localError) {
      console.error('Error loading local store data:', localError);
    }
  }
}

// Initialize Leaflet map
function initializeMap() {
  map = L.map('map').setView([54.0, -2.0], 6);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

// Setup event listeners for search and filters
function setupEventListeners() {
  // Search bar
  const searchBar = document.getElementById('search-bar');
  searchBar.addEventListener('input', debounce(filterStores, 300));
  
  // Kit type filters
  const kitTypeCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
  kitTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', filterStores);
  });
  
  // Rating filter
  const ratingFilter = document.getElementById('rating-filter');
  ratingFilter.addEventListener('change', filterStores);
}

// Setup admin panel functionality
function setupAdminPanel() {
  // Add admin panel to the page
  const adminPanel = document.createElement('div');
  adminPanel.className = 'admin-panel';
  adminPanel.innerHTML = `
    <div class="admin-header">
      <h3>🛠️ Admin Panel</h3>
      <button class="admin-toggle" onclick="toggleAdminPanel()">⚙️</button>
    </div>
    <div class="admin-content" style="display: none;">
      <div class="admin-section">
        <h4>Review Management</h4>
        <button onclick="updateAllReviews()" class="admin-btn">🔄 Update All Reviews</button>
        <button onclick="checkSystemStatus()" class="admin-btn">📊 System Status</button>
      </div>
      <div class="admin-section">
        <h4>System Status</h4>
        <div id="system-status">Loading...</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(adminPanel);
}

// Toggle admin panel visibility
function toggleAdminPanel() {
  const content = document.querySelector('.admin-content');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

// Update all reviews via API
async function updateAllReviews() {
  try {
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '⏳ Updating...';
    button.disabled = true;
    
    const response = await fetch(`${apiBaseUrl}/stores/update-reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    alert(`✅ ${result.message}`);
    
    // Reload stores to get updated data
    await loadStores();
    
  } catch (error) {
    console.error('Error updating reviews:', error);
    alert('❌ Failed to update reviews. Check console for details.');
  } finally {
    const button = event.target;
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Check system status
async function checkSystemStatus() {
  try {
    const response = await fetch(`${apiBaseUrl}/status`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const status = await response.json();
    updateStatusDisplay(status);
    
  } catch (error) {
    console.error('Error checking system status:', error);
    updateStatusDisplay({ error: 'Failed to connect to backend' });
  }
}

// Update status display
function updateStatusDisplay(status = null) {
  const statusDiv = document.getElementById('system-status');
  if (!statusDiv) return;
  
  if (status && status.error) {
    statusDiv.innerHTML = `
      <div class="status-item error">❌ ${status.error}</div>
    `;
    return;
  }
  
  if (status) {
    statusDiv.innerHTML = `
      <div class="status-item ${status.status === 'running' ? 'success' : 'error'}">
        🔄 Status: ${status.status}
      </div>
      <div class="status-item">
        🕒 Last Check: ${new Date(status.timestamp).toLocaleString()}
      </div>
      <div class="status-item ${status.autoFetchEnabled ? 'success' : 'warning'}">
        🤖 Auto Fetch: ${status.autoFetchEnabled ? 'Enabled' : 'Disabled'}
      </div>
      <div class="status-item ${status.googleApiConfigured ? 'success' : 'warning'}">
        🔍 Google API: ${status.googleApiConfigured ? 'Configured' : 'Not Configured'}
      </div>
      <div class="status-item ${status.yelpApiConfigured ? 'success' : 'warning'}">
        📝 Yelp API: ${status.yelpApiConfigured ? 'Configured' : 'Not Configured'}
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div class="status-item">📊 Backend: Connected</div>
      <div class="status-item">📈 Stores Loaded: ${allStores.length}</div>
    `;
  }
}

// Debounce function to limit search frequency
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Filter stores based on search and filter criteria
function filterStores() {
  const searchTerm = document.getElementById('search-bar').value.toLowerCase();
  const selectedKitTypes = getSelectedCheckboxValues('.checkbox-group input[value="HG"], .checkbox-group input[value="RG"], .checkbox-group input[value="MG"], .checkbox-group input[value="PG"]');
  const selectedStoreTypes = getSelectedCheckboxValues('.checkbox-group input[value="inStore"], .checkbox-group input[value="online"]');
  const minRating = parseFloat(document.getElementById('rating-filter').value) || 0;
  
  filteredStores = allStores.filter(store => {
    // Search filter
    const matchesSearch = store.name.toLowerCase().includes(searchTerm) || 
                         store.location.toLowerCase().includes(searchTerm) ||
                         store.address.toLowerCase().includes(searchTerm);
    
    // Kit type filter
    const matchesKitTypes = selectedKitTypes.length === 0 || 
                           store.types.some(type => selectedKitTypes.includes(type));
    
    // Store type filter
    const matchesStoreTypes = selectedStoreTypes.length === 0 || 
                             (selectedStoreTypes.includes('inStore') && store.inStore) ||
                             (selectedStoreTypes.includes('online') && store.online);
    
    // Rating filter
    const matchesRating = store.rating >= minRating;
    
    return matchesSearch && matchesKitTypes && matchesStoreTypes && matchesRating;
  });
  
  displayStores();
  updateMap();
}

// Get selected checkbox values
function getSelectedCheckboxValues(selector) {
  const checkboxes = document.querySelectorAll(selector);
  return Array.from(checkboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
}

// Display filtered stores
function displayStores() {
  const storeList = document.getElementById('store-list');
  storeList.innerHTML = '';
  
  if (filteredStores.length === 0) {
    storeList.innerHTML = '<div class="no-results">No stores found matching your criteria.</div>';
    return;
  }
  
  filteredStores.forEach(store => {
    const storeElement = createStoreElement(store);
    storeList.appendChild(storeElement);
  });
}

// Create store element with enhanced design
function createStoreElement(store) {
  const div = document.createElement('div');
  div.className = 'store';
  
  // Format last updated time
  const lastUpdated = store.lastUpdated ? 
    new Date(store.lastUpdated).toLocaleDateString() : 
    'Unknown';
  
  div.innerHTML = `
    <div class="store-header">
      <div class="store-logo">${store.logo}</div>
      <div class="store-info">
        <h2>${store.name}</h2>
        <div class="store-rating">
          <div class="stars">${generateStars(store.rating)}</div>
          <span class="rating-text">${store.rating} (${store.reviewCount} reviews)</span>
        </div>
        ${store.lastUpdated ? `<div class="last-updated">🕒 Updated: ${lastUpdated}</div>` : ''}
      </div>
    </div>
    
    <div class="store-details">
      <div class="store-detail">
        <strong>📍 Location:</strong> ${store.location}
      </div>
      <div class="store-detail">
        <strong>🌐 Website:</strong> <a href="${store.website}" target="_blank">Visit Site</a>
      </div>
    </div>
    
    <div class="store-types">
      ${store.types.map(type => `<span class="type-badge">${type}</span>`).join('')}
    </div>
    
    <div class="store-availability">
      ${store.inStore ? '<span class="availability-badge in-store">🏪 In-Store</span>' : ''}
      ${store.online ? '<span class="availability-badge online">🛒 Online</span>' : ''}
    </div>
    
    <div class="store-actions">
      <a href="${store.website}" target="_blank" class="visit-website">Visit Website</a>
      <button class="view-reviews" onclick="showReviews('${store.name}')">View Reviews</button>
      <button class="update-reviews" onclick="updateStoreReviews('${store.name}')">🔄 Update</button>
    </div>
  `;
  
  return div;
}

// Update reviews for a specific store
async function updateStoreReviews(storeName) {
  try {
    const storeId = storeName.toLowerCase().replace(/\s+/g, '-');
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '⏳';
    button.disabled = true;
    
    const response = await fetch(`${apiBaseUrl}/stores/${storeId}/update-reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`Updated ${storeName}:`, result);
    
    // Reload stores to get updated data
    await loadStores();
    
  } catch (error) {
    console.error('Error updating store reviews:', error);
    alert('❌ Failed to update store reviews. Check console for details.');
  } finally {
    const button = event.target;
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Generate star rating display
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + 
         (hasHalfStar ? '☆' : '') + 
         '☆'.repeat(emptyStars);
}

// Show reviews modal
function showReviews(storeName) {
  const store = allStores.find(s => s.name === storeName);
  if (!store) return;
  
  const modal = document.createElement('div');
  modal.className = 'reviews-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${store.name} - Customer Reviews</h3>
        <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="rating-summary">
          <div class="stars">${generateStars(store.rating)}</div>
          <span>${store.rating} out of 5 (${store.reviewCount} reviews)</span>
          ${store.lastUpdated ? `<div class="last-updated">🕒 Last updated: ${new Date(store.lastUpdated).toLocaleString()}</div>` : ''}
        </div>
        <div class="reviews-list">
          ${store.reviews && store.reviews.length > 0 ? 
            store.reviews.map(review => `
              <div class="review-item">
                <div class="review-header">
                  <div class="stars">${generateStars(review.rating || 5)}</div>
                  <div class="review-meta">
                    <span class="review-author">${review.author || 'Anonymous'}</span>
                    <span class="review-source">${review.source || 'Customer'}</span>
                    ${review.time ? `<span class="review-time">${new Date(review.time * 1000).toLocaleDateString()}</span>` : ''}
                  </div>
                </div>
                <p>${review.text}</p>
              </div>
            `).join('') : 
            '<div class="no-reviews">No reviews available yet.</div>'
          }
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Update map with filtered stores
function updateMap() {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  
  // Add markers for filtered stores
  filteredStores.forEach(store => {
    if (store.coordinates && store.coordinates.length === 2) {
      const marker = L.marker(store.coordinates)
        .bindPopup(`
          <div class="map-popup">
            <h4>${store.name}</h4>
            <p>📍 ${store.location}</p>
            <p>⭐ ${store.rating} (${store.reviewCount} reviews)</p>
            <p>🏷️ ${store.types.join(', ')}</p>
            <a href="${store.website}" target="_blank">Visit Website</a>
          </div>
        `);
      
      marker.addTo(map);
      markers.push(marker);
    }
  });
  
  // Fit map to show all markers
  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Add CSS for admin panel and enhanced modals
const additionalStyles = `
  .admin-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    z-index: 1000;
    min-width: 300px;
    max-width: 400px;
  }
  
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e9ecef;
    background: #f8f9fa;
    border-radius: 12px 12px 0 0;
  }
  
  .admin-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #2c3e50;
  }
  
  .admin-toggle {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background-color 0.3s ease;
  }
  
  .admin-toggle:hover {
    background: #e9ecef;
  }
  
  .admin-content {
    padding: 1rem;
  }
  
  .admin-section {
    margin-bottom: 1rem;
  }
  
  .admin-section h4 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
    font-size: 0.9rem;
  }
  
  .admin-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    transition: background-color 0.3s ease;
  }
  
  .admin-btn:hover {
    background: #5a6fd8;
  }
  
  .admin-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
  
  .status-item {
    padding: 0.25rem 0;
    font-size: 0.8rem;
    border-radius: 4px;
    margin-bottom: 0.25rem;
  }
  
  .status-item.success {
    color: #28a745;
  }
  
  .status-item.warning {
    color: #ffc107;
  }
  
  .status-item.error {
    color: #dc3545;
  }
  
  .last-updated {
    font-size: 0.8rem;
    color: #6c757d;
    margin-top: 0.25rem;
  }
  
  .update-reviews {
    background: #28a745;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background-color 0.3s ease;
  }
  
  .update-reviews:hover {
    background: #218838;
  }
  
  .update-reviews:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
  
  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .review-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #6c757d;
  }
  
  .review-author {
    font-weight: 600;
  }
  
  .review-source {
    background: #e3f2fd;
    color: #1976d2;
    padding: 0.1rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
  }
  
  .review-time {
    font-style: italic;
  }
  
  .no-reviews {
    text-align: center;
    color: #6c757d;
    font-style: italic;
    padding: 2rem;
  }
`;

// Inject additional styles
const additionalStyleSheet = document.createElement('style');
additionalStyleSheet.textContent = additionalStyles;
document.head.appendChild(additionalStyleSheet);
