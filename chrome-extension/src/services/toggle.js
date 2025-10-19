class ScreenshotToggle {
  constructor() {
    console.log('ScreenshotToggle constructor called');
    this.enabled = false;
    this.toggleElement = document.getElementById('screenshotToggle');
    this.statusElement = document.getElementById('toggleStatus');
    
    console.log('Toggle element found:', !!this.toggleElement);
    console.log('Status element found:', !!this.statusElement);
  }

  async init() {
    await this.loadState();
    this.updateUI();
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get(['screenshotMonitoringEnabled']);
      this.enabled = result.screenshotMonitoringEnabled || false;
    } catch (error) {
      console.error('Failed to load toggle state:', error);
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({ 
        screenshotMonitoringEnabled: this.enabled 
      });
    } catch (error) {
      console.error('Failed to save toggle state:', error);
    }
  }

  async toggle() {
    console.log('Toggle clicked! Current state:', this.enabled);
    const newState = !this.enabled;
    console.log('Switching to state:', newState);
    
    this.setDisabled(true);
    
    try {
      const url = `http://localhost:3000/api/monitor/streaming?on=${newState}`;
      console.log('Making API request to:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        this.enabled = newState;
        await this.saveState();
        this.updateUI();
        console.log('Toggle successful!');
      } else {
        console.error('Failed to toggle screenshot monitoring:', data);
        this.showError();
      }
    } catch (error) {
      console.error('Error toggling screenshot monitoring:', error);
      this.showError();
    } finally {
      this.setDisabled(false);
    }
  }

  updateUI() {
    if (this.toggleElement && this.statusElement) {
      if (this.enabled) {
        this.toggleElement.classList.add('active');
        this.statusElement.textContent = 'ON';
      } else {
        this.toggleElement.classList.remove('active');
        this.statusElement.textContent = 'OFF';
      }
    }
  }

  setDisabled(disabled) {
    if (this.toggleElement) {
      if (disabled) {
        this.toggleElement.classList.add('disabled');
        this.toggleElement.style.animation = 'pulse 1.5s ease-in-out infinite';
      } else {
        this.toggleElement.classList.remove('disabled');
        this.toggleElement.style.animation = '';
      }
    }
    
    if (this.statusElement && disabled) {
      this.statusElement.textContent = '...';
      this.statusElement.style.opacity = '0.5';
    }
  }

  showError() {
    if (this.statusElement) {
      const originalText = this.statusElement.textContent;
      this.statusElement.textContent = 'ERR';
      this.statusElement.style.opacity = '0.8';
      this.statusElement.style.color = '#ff6b6b';
      
      setTimeout(() => {
        this.statusElement.textContent = originalText;
        this.statusElement.style.opacity = '';
        this.statusElement.style.color = '';
      }, 2000);
    }
    
    if (this.toggleElement) {
      this.toggleElement.style.borderColor = '#ff6b6b';
      this.toggleElement.style.boxShadow = '0 0 8px rgba(255, 107, 107, 0.3)';
      
      setTimeout(() => {
        this.toggleElement.style.borderColor = '';
        this.toggleElement.style.boxShadow = '';
      }, 2000);
    }
  }

  isEnabled() {
    return this.enabled;
  }
}
