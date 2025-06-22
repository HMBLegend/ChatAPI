// Global variables
let allStores = [];
let filteredStores = [];
let map;
let markers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  loadStores();
  initializeMap();
  setupEventListeners();
});

// Load stores data
async function loadStores() {
  try {
    const response = await fetch('stores.json');
    allStores = await response.json();
    filteredStores = [...allStores];
    displayStores();
    updateMap();
  } catch (error) {
    console.error('Error loading store data:', error);
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
  div.innerHTML = `
    <div class="store-header">
      <div class="store-logo">${store.logo}</div>
      <div class="store-info">
        <h2>${store.name}</h2>
        <div class="store-rating">
          <div class="stars">${generateStars(store.rating)}</div>
          <span class="rating-text">${store.rating} (${store.reviewCount} reviews)</span>
        </div>
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
    </div>
  `;
  
  return div;
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
        </div>
        <div class="reviews-list">
          ${store.reviews.map(review => `
            <div class="review-item">
              <div class="stars">★★★★★</div>
              <p>${review}</p>
            </div>
          `).join('')}
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

// Add CSS for modal
const modalStyles = `
  .reviews-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e9ecef;
    background: #f8f9fa;
  }
  
  .modal-header h3 {
    margin: 0;
    color: #2c3e50;
  }
  
  .close-modal {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6c757d;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.3s ease;
  }
  
  .close-modal:hover {
    background: #e9ecef;
  }
  
  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    max-height: 60vh;
  }
  
  .rating-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e9ecef;
  }
  
  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .review-item {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
  }
  
  .review-item .stars {
    margin-bottom: 0.5rem;
  }
  
  .review-item p {
    margin: 0;
    color: #555;
    line-height: 1.5;
  }
  
  .no-results {
    text-align: center;
    padding: 2rem;
    color: #6c757d;
    font-style: italic;
  }
  
  .map-popup {
    text-align: center;
  }
  
  .map-popup h4 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
  }
  
  .map-popup p {
    margin: 0.25rem 0;
    color: #555;
  }
  
  .map-popup a {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.9rem;
  }
`;

// Inject modal styles
const styleSheet = document.createElement('style');
styleSheet.textContent = modalStyles;
document.head.appendChild(styleSheet);
