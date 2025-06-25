# 🏪 Gundam Stores UK - Backend System '''

A comprehensive website for finding Gundam model kit stores in the UK with automatic review fetching from Google Places API and Yelp.

## ✨ Features

- **🔍 Search & Filter**: Find stores by name, location, kit types, and ratings
- **🗺️ Interactive Map**: View store locations with detailed popups
- **⭐ Real Reviews**: Automatically fetch reviews from Google and Yelp
- **🤖 Auto Updates**: Scheduled review updates every 6 hours
- **🛠️ Admin Panel**: Manual review updates and system monitoring
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Google Places API key (optional but recommended)
- Yelp API key (optional)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
   YELP_API_KEY=your_yelp_api_key_here
   PORT=3000
   ```

3. **Start the backend server:**
   ```bash
   npm start
   ```

4. **Access the website:**
   - Open your browser and go to: `http://localhost:3000`
   - The API will be available at: `http://localhost:3000/api`

## 🔑 API Keys Setup

### Google Places API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Places API" and "Maps JavaScript API"
4. Create credentials (API Key)
5. Add the key to your `.env` file

### Yelp API (Alternative)
1. Go to [Yelp Developers](https://www.yelp.com/developers)
2. Create a new app
3. Get your API key
4. Add the key to your `.env` file

## 📊 API Endpoints

### Stores
- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get specific store
- `POST /api/stores/update-reviews` - Update all store reviews
- `POST /api/stores/:id/update-reviews` - Update specific store reviews

### System
- `GET /api/status` - Get system status and configuration

## 🛠️ Admin Panel

The website includes an admin panel (top-right corner) with:

- **🔄 Update All Reviews**: Manually trigger review updates for all stores
- **📊 System Status**: Check API configuration and system health
- **Individual Store Updates**: Each store has an "Update" button

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `GOOGLE_PLACES_API_KEY` | Google Places API key | - |
| `YELP_API_KEY` | Yelp API key | - |
| `AUTO_FETCH_REVIEWS` | Enable automatic updates | true |
| `REVIEW_UPDATE_SCHEDULE` | Cron schedule for updates | `0 */6 * * *` |
| `MAX_REVIEWS_PER_STORE` | Max reviews per store | 10 |

### Cron Schedule Format
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 */12 * * *` - Every 12 hours

## 📁 Project Structure

```
gundam-stores-uk/
├── server.js              # Main backend server
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── env.example           # Environment template
├── stores.json           # Store data
├── index.html            # Main website
├── script.js             # Frontend JavaScript
├── style.css             # Frontend styles
└── README.md             # This file
```

## 🔄 How Review Updates Work

1. **Automatic Updates**: Every 6 hours (configurable)
2. **Google Places API**: Primary source for reviews and ratings
3. **Yelp API**: Backup source if Google doesn't have data
4. **Rate Limiting**: 1-second delay between API calls
5. **Data Persistence**: Updates are saved to `stores.json`

## 🐛 Troubleshooting

### Common Issues

**"Google Places API key not configured"**
- Add your Google Places API key to `.env`
- Make sure the API is enabled in Google Cloud Console

**"No reviews found"**
- Check if the store exists on Google Maps
- Verify API key permissions
- Check console for error messages

**"Failed to connect to backend"**
- Make sure the server is running (`npm start`)
- Check if port 3000 is available
- Verify firewall settings

### Development Mode

Run with auto-restart:
```bash
npm run dev
```

## 📈 Adding New Stores

1. Edit `stores.json`
2. Add new store object with required fields:
   ```json
   {
     "name": "Store Name",
     "location": "City",
     "address": "Full Address",
     "coordinates": [lat, lng],
     "website": "https://store-website.com",
     "types": ["HG", "RG", "MG"],
     "inStore": true,
     "online": true,
     "rating": 4.5,
     "reviewCount": 100,
     "reviews": [],
     "logo": "SN"
   }
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own purposes!

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify your API keys are correct
3. Ensure all dependencies are installed
4. Check the troubleshooting section above

---

**Happy Gundam hunting! 🎯** 