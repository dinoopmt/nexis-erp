import React, { useState } from 'react';
import { showToast } from "../AnimatedCenteredToast.jsx";

/**
 * ImageTab Component
 * Image upload with automatic resolution reduction to max 2048x2048
 */
const ImageTab = ({ loading, newProduct, setNewProduct }) => {
  const [dragOver, setDragOver] = useState(false);
  const MAX_WIDTH = 2048;
  const MAX_HEIGHT = 2048;

  /**
   * Get current image: file-based only (development version)
   * Add cache-busting timestamp to force fresh load from server
   */
  const currentImage = newProduct?.imagePath 
    ? `/${newProduct.imagePath}?t=${Date.now()}`
    : newProduct?.image || null;  // ✅ Show newly uploaded image (base64) during edit before save

  /**
   * Resize image using canvas to reduce file size
   * Maintains aspect ratio, max 2048x2048
   */
  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions maintaining aspect ratio
          let newWidth = img.width;
          let newHeight = img.height;

          if (img.width > MAX_WIDTH || img.height > MAX_HEIGHT) {
            const aspectRatio = img.width / img.height;
            if (img.width > img.height) {
              newWidth = MAX_WIDTH;
              newHeight = Math.round(MAX_WIDTH / aspectRatio);
            } else {
              newHeight = MAX_HEIGHT;
              newWidth = Math.round(MAX_HEIGHT * aspectRatio);
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Convert to base64 with compression
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85); // 85% quality
          resolve(resizedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle file selection and resize
   */
  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 10MB');
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      // ✅ Store as base64 during upload (will be converted to file on backend when saved)
      setNewProduct({ ...newProduct, image: resizedImage });
    } catch (error) {
      showToast('error', 'Failed to process image: ' + error.message);
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle file input change
   */
  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Remove image
   */
  const handleRemoveImage = () => {
    // ✅ Clear both imagePath (saved) and image (newly uploaded base64)
    setNewProduct({ 
      ...newProduct, 
      imagePath: null,
      image: null
    });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Image Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        {currentImage ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                key={currentImage}
                src={currentImage}
                alt="Product"
                className="max-h-64 max-w-64 rounded-lg shadow-md object-contain"
                onError={(e) => {
                  // Show SVG placeholder if image fails to load
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="%23999">Image Error</text></svg>';
                }}
              />
            </div>
            <p className="text-sm text-green-700 font-medium">
              ✅ Image ready
            </p>
            <div className="space-y-2">
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  disabled={loading}
                  className="hidden"
                />
                <span className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 cursor-pointer transition-colors text-sm font-medium">
                  Replace Image
                </span>
              </label>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={loading}
                className="ml-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 cursor-pointer transition-colors text-sm font-medium"
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl text-gray-400">📷</div>
            <p className="text-gray-600 font-medium">Drag and drop image here or click to select</p>
            <p className="text-gray-500 text-sm">Supported: JPG, PNG, GIF</p>
            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                disabled={loading}
                className="hidden"
              />
              <span className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 cursor-pointer transition-colors font-medium">
                Choose Image
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageTab;


