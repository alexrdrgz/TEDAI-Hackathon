# TEDAI Chrome Extension

## Configuration

### Backend API URL

To configure the backend server port, edit `config.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:3030/api',
};
```

Change `3030` to match your backend server port (set in `backend/.env`).

### Common Configuration Steps

1. **Update Backend Port** (if needed):
   - Edit `backend/.env` and set `PORT=3030` (or your preferred port)
   - Backend will restart automatically with nodemon

2. **Update Extension Config**:
   - Edit `chrome-extension/config.js`
   - Update `API_BASE_URL` to match your backend port

3. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Find "TEDAI AI Agent"
   - Click the reload button (🔄)

### Port Recommendations

- **3030** - Current default (avoids common conflicts)
- **3000** - React default (may conflict)
- **3001** - Good alternative
- **4000** - Another safe choice
- **8000** - Alternative for avoiding dev server conflicts

### Manifest Permissions

The extension is configured to allow connections to multiple localhost ports:
- `http://localhost:3030/*` (default)
- `http://localhost:3000/*`
- `http://localhost:3001/*`

If you use a different port, add it to `manifest.json` under `host_permissions`.

