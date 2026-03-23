// Import necessary React hooks and libraries
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation after login
import { Lock, UserRound, Eye, EyeOff } from "lucide-react"; // Icon components
import axios from "axios"; // HTTP client for API requests
import { API_URL } from "../config/config"; // API endpoint configuration
import logo from "../assets/images/logo.png"; // Company logo

// Login component - Handles user authentication
function Login() {
  // State for username input
  const [username, setUsername] = useState("");
  // State for password input
  const [password, setPassword] = useState("");
  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);
  // Navigation hook to redirect after successful login
  const navigate = useNavigate();


  // Handle login form submission
  const handleSubmit = async (e) => {
    // Prevent default form submission behavior
    e.preventDefault();
    try {
      // Send login request to the backend API
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });
      console.log("Login response:", response.data); // Log response for debugging
      // Check if login was successful
      if (response.data.success) {
        // Store authentication token in localStorage
        localStorage.setItem("token", response.data.token);
        // Store user information in localStorage
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Redirect to home page after successful login
        navigate("/");
      } else {
        alert("Invalid username or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
    }
  };

  return (
    // Main container with gradient background, centered layout
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      {/* Centered login card container */}
      <div className="w-full max-w-md">
        {/* White card with shadow */}
        <div className="bg-white rounded-lg shadow-2xl p-6 lg:p-8">
          {/* Header section with logo and company name */}
          <div className="flex justify-center mb-8 gap-4 items-center">
            <img
              src={logo}
              alt="restro logo"
              className="h-12 w-auto lg:h-10 object-contain"
            />

            <h1 className="text-3xl font-semibold">Nexis</h1>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username input field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                {/* Username icon */}
                <UserRound
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                {/* Username input field with updateable state */}
                <input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-2 lg:py-3 border 
                  border-gray-300 rounded-lg focus:outline-none focus:ring-2 
                  focus:ring-green-600 focus:border-transparent text-sm lg:text-base"
                  onChange={(e) => setUsername(e.target.value)}
                  value={username}
                />
              </div>
            </div>

            {/* Password input field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                {/* Lock icon */}
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                {/* Password input field with toggle visibility feature */}
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2 lg:py-3 border border-gray-300 
                  rounded-lg focus:outline-none focus:ring-2 
                  focus:ring-green-600 focus:border-transparent text-sm lg:text-base"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                />
                {/* Toggle password visibility button */}
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 
                  text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {/* Show/Hide password icon based on visibility state */}
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me checkbox placeholder */}

            {/* Submit button to perform login */}
            <button
              type="submit"
              className="w-full mt-6 bg-green-600 hover:bg-green-700
               disabled:bg-gray-400 text-white font-semibold py-2 lg:py-3 rounded-lg transition duration-200 text-sm lg:text-base"
            >
              Login
            </button>
          </form>

          {/* Footer with copyright information */}
          <div className="mt-6 text-center">
            <p className="text-xs lg:text-sm text-gray-600">
              © 2026 Nexis.com. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;


