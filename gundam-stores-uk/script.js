fetch('stores.json')
  .then(response => response.json())
  .then(data => {
    const storeList = document.getElementById('store-list');
    data.forEach(store => {
      const div = document.createElement('div');
      div.className = 'store';
      div.innerHTML = `
        <h2>${store.name}</h2>
        <p><strong>Location:</strong> ${store.location}</p>
        <p><strong>Website:</strong> <a href="${store.website}" target="_blank">${store.website}</a></p>
        <p><strong>Types:</strong> ${store.types.join(', ')}</p>
        <p><strong>In-Store:</strong> ${store.inStore ? "Yes" : "No"} | <strong>Online:</strong> ${store.online ? "Yes" : "No"}</p>
      `;
      storeList.appendChild(div);
    });
  })
  .catch(error => console.error('Error loading store data:', error));
