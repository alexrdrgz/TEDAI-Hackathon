# gets a screenshot of the user's screen
import sys
import os
from PIL import ImageGrab
from datetime import datetime

# Create screenshots directory if it doesn't exist
screenshots_dir = os.path.join(os.path.dirname(__file__), '../screenshots')
os.makedirs(screenshots_dir, exist_ok=True)

# Get optional dimensions from command line args
width = int(sys.argv[1]) if len(sys.argv) > 1 else None
height = int(sys.argv[2]) if len(sys.argv) > 2 else None

# Capture screenshot
screenshot = ImageGrab.grab()

# Crop if dimensions provided
if width and height:
    screenshot = screenshot.crop((0, 0, width, height))

# Save with timestamp
filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
filepath = os.path.join(screenshots_dir, filename)
screenshot.save(filepath)

# Output the filepath so Node can read it
print(filepath)
