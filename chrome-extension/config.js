// Chrome Extension Configuration
// Change this to match your backend server port
const CONFIG = {
  // Backend API URL - change the port if your backend runs on a different port
  API_BASE_URL: 'http://localhost:3030/api',
  
  // Common port options:
  // - 3030 (current default)
  // - 3000 (React default)
  // - 3001 (alternative)
  // - 4000 (alternative)
  // - 8000 (alternative)
};

// For use in service workers and content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

