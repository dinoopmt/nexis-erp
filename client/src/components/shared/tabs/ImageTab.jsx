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
      setNewProduct({ ...newProduct, image: resizedImage });
      showToast('success', `Image uploaded and resized (max ${MAX_WIDTH}x${MAX_HEIGHT})`);
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
    setNewProduct({ ...newProduct, image: null });
    showToast('success', 'Image removed');
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
        {newProduct?.image ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={newProduct.image}
                alt="Product"
                className="max-h-64 max-w-64 rounded-lg shadow-md object-contain"
              />
            </div>
            <p className="text-sm text-green-700 font-medium">
              ✅ Image saved (auto-resized to max {MAX_WIDTH}x{MAX_HEIGHT})
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
            <p className="text-gray-500 text-sm">Supported: JPG, PNG, GIF (max 10MB, auto-resized to {MAX_WIDTH}x{MAX_HEIGHT})</p>
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

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ Images are automatically resized to a maximum of {MAX_WIDTH}x{MAX_HEIGHT} pixels to optimize storage and loading speed.
        </p>
      </div>
    </div>
  );
};

export default ImageTab;


