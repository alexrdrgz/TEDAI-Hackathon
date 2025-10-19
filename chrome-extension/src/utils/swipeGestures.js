// Swipe Gesture Handler for TEDAI Chrome Extension
// Supports both touch (mobile) and mouse (desktop) interactions

class SwipeGestureHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      threshold: options.threshold || 0.4, // 40% of element width
      minDistance: options.minDistance || 50, // Minimum pixels to consider as swipe
      onSwipeLeft: options.onSwipeLeft || (() => {}),
      onSwipeRight: options.onSwipeRight || (() => {}),
      onSwipeStart: options.onSwipeStart || (() => {}),
      onSwipeMove: options.onSwipeMove || (() => {}),
      onSwipeCancel: options.onSwipeCancel || (() => {}),
    };

    this.state = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
    };

    this.overlay = null;
    this.label = null;
    this.initialized = false;
    
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    // Create overlay for visual feedback
    this.createOverlay();
    
    // Bind event handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    // Add event listeners for touch
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd);
    this.element.addEventListener('touchcancel', this.handleTouchEnd);

    // Add event listeners for mouse
    this.element.addEventListener('mousedown', this.handleMouseDown);
    
    // Prevent text selection during drag
    this.element.style.userSelect = 'none';
    this.element.style.webkitUserSelect = 'none';
    
    this.initialized = true;
  }

  createOverlay() {
    // Create swipe overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'swipe-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
    `;

    // Create label for swipe action
    this.label = document.createElement('div');
    this.label.className = 'swipe-label';
    this.label.style.cssText = `
      font-size: 18px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.5px;
    `;

    this.overlay.appendChild(this.label);
    
    // Make element relative if not already positioned
    const position = window.getComputedStyle(this.element).position;
    if (position === 'static') {
      this.element.style.position = 'relative';
    }
    
    this.element.appendChild(this.overlay);
  }

  handleTouchStart(e) {
    this.startSwipe(e.touches[0].clientX, e.touches[0].clientY);
  }

  handleMouseDown(e) {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    this.startSwipe(e.clientX, e.clientY);
    
    // Add mouse move/up listeners to document
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  startSwipe(x, y) {
    this.state.isDragging = true;
    this.state.startX = x;
    this.state.startY = y;
    this.state.currentX = x;
    this.state.currentY = y;
    this.state.deltaX = 0;
    this.state.deltaY = 0;

    // Disable transitions for smooth dragging
    this.element.style.transition = 'none';
    
    this.options.onSwipeStart();
  }

  handleTouchMove(e) {
    if (!this.state.isDragging) return;
    
    this.updateSwipe(e.touches[0].clientX, e.touches[0].clientY);
    
    // Prevent scrolling if horizontal swipe is detected
    if (Math.abs(this.state.deltaX) > Math.abs(this.state.deltaY)) {
      e.preventDefault();
    }
  }

  handleMouseMove(e) {
    if (!this.state.isDragging) return;
    
    this.updateSwipe(e.clientX, e.clientY);
  }

  updateSwipe(x, y) {
    this.state.currentX = x;
    this.state.currentY = y;
    this.state.deltaX = x - this.state.startX;
    this.state.deltaY = y - this.state.startY;

    // Only process if horizontal swipe is dominant
    if (Math.abs(this.state.deltaX) < Math.abs(this.state.deltaY)) {
      return;
    }

    const elementWidth = this.element.offsetWidth;
    const progress = Math.min(Math.abs(this.state.deltaX) / elementWidth, 1);
    const direction = this.state.deltaX > 0 ? 'right' : 'left';

    // Apply transform
    requestAnimationFrame(() => {
      this.element.style.transform = `translateX(${this.state.deltaX}px)`;
      
      // Update overlay
      this.updateOverlay(direction, progress);
    });

    this.options.onSwipeMove(this.state.deltaX, direction, progress);
  }

  updateOverlay(direction, progress) {
    if (!this.overlay) return;

    const opacity = Math.min(progress * 2, 0.8);
    this.overlay.style.opacity = opacity;

    if (direction === 'right') {
      this.overlay.style.background = 'linear-gradient(90deg, rgba(76, 175, 80, 0.9), rgba(76, 175, 80, 0.7))';
      this.label.textContent = '✓ Approve';
      this.label.style.marginLeft = '0';
      this.label.style.marginRight = 'auto';
    } else {
      this.overlay.style.background = 'linear-gradient(270deg, rgba(244, 67, 54, 0.9), rgba(244, 67, 54, 0.7))';
      this.label.textContent = '✗ Reject';
      this.label.style.marginLeft = 'auto';
      this.label.style.marginRight = '0';
    }
  }

  handleTouchEnd(e) {
    if (!this.state.isDragging) return;
    this.endSwipe();
  }

  handleMouseUp(e) {
    if (!this.state.isDragging) return;
    
    // Remove document listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    this.endSwipe();
  }

  endSwipe() {
    const elementWidth = this.element.offsetWidth;
    const swipeDistance = Math.abs(this.state.deltaX);
    const swipePercent = swipeDistance / elementWidth;
    const direction = this.state.deltaX > 0 ? 'right' : 'left';

    this.state.isDragging = false;

    // Check if swipe threshold is met
    if (swipePercent >= this.options.threshold && swipeDistance >= this.options.minDistance) {
      // Successful swipe - animate off screen
      this.animateOffScreen(direction);
    } else {
      // Cancel swipe - animate back to original position
      this.cancelSwipe();
    }
  }

  animateOffScreen(direction) {
    const elementWidth = this.element.offsetWidth;
    const targetX = direction === 'right' ? elementWidth + 50 : -(elementWidth + 50);

    // Re-enable transitions
    this.element.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
    
    requestAnimationFrame(() => {
      this.element.style.transform = `translateX(${targetX}px)`;
      this.element.style.opacity = '0';
    });

    // Trigger callback after animation
    setTimeout(() => {
      if (direction === 'right') {
        this.options.onSwipeRight();
      } else {
        this.options.onSwipeLeft();
      }
    }, 300);
  }

  cancelSwipe() {
    // Re-enable transitions
    this.element.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    
    requestAnimationFrame(() => {
      this.element.style.transform = 'translateX(0)';
      if (this.overlay) {
        this.overlay.style.opacity = '0';
      }
    });

    this.options.onSwipeCancel();
  }

  destroy() {
    // Remove event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchEnd);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    // Remove overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Reset styles
    this.element.style.transform = '';
    this.element.style.transition = '';
    this.element.style.userSelect = '';
    this.element.style.webkitUserSelect = '';

    this.initialized = false;
  }

  reset() {
    this.element.style.transition = '';
    this.element.style.transform = 'translateX(0)';
    this.element.style.opacity = '1';
    if (this.overlay) {
      this.overlay.style.opacity = '0';
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwipeGestureHandler;
}

