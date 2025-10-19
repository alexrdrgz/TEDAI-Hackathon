#!/usr/bin/env python3
"""
Get the percentage of pixels on screen that differ from a provided image.
Usage: python3 get_screenshot_diff.py <image_path>
Returns: percentage (0-100) of different pixels
"""
import sys
from PIL import Image
import numpy as np

def get_screenshot_diff(image_path):
    """
    Compares two same-sized images and returns the percentage of different pixels.
    """
    try:
        # Load both images
        ref_image = Image.open(image_path).convert('RGB')
        current_image = Image.open(image_path).convert('RGB')  # Will be overwritten
        
        # For the current screen, we take a new screenshot via PIL
        from PIL import ImageGrab
        current_image = ImageGrab.grab().convert('RGB')
        
        # Resize current to match reference if needed
        if current_image.size != ref_image.size:
            current_image = current_image.resize(ref_image.size)
        
        # Convert to numpy arrays and compare
        ref_array = np.array(ref_image)
        current_array = np.array(current_image)
        
        # Calculate percentage of different pixels
        matches = np.sum(ref_array == current_array) / 3  # Divide by 3 (RGB channels)
        total_pixels = ref_array.shape[0] * ref_array.shape[1]
        percent_different = 100 - ((matches / total_pixels) * 100)
        
        print(f"{int(percent_different)}")
    
    except Exception as e:
        print("0")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("0")
        sys.exit(1)
    
    get_screenshot_diff(sys.argv[1])
