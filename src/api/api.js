// frontend/src/api/api.js
import axios from "axios";

// Get API URL from environment variable or use default
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

console.log("🔗 API Base URL:", API_URL);

const API = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true,
  timeout: 10000 // 10 seconds
});

// Request interceptor - Check both storage types
API.interceptors.request.use(
  (config) => {
    // Log the full URL being called
    console.log("📡 API Request:", config.method.toUpperCase(), config.baseURL + config.url);
    
    // Check sessionStorage first (session-only), then localStorage (Remember Me)
    let token = sessionStorage.getItem("token");
    
    if (!token) {
      token = localStorage.getItem("token");
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ Token attached to request");
    } else {
      console.log("⚠️ No token found in storage");
    }
    
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors and token expiration
API.interceptors.response.use(
  (response) => {
    console.log("✅ Response received from:", response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ Response error:", error);

    // Handle network errors (backend not running)
    if (!error.response) {
      console.error("❌ Network Error - Cannot reach backend");
      console.error("   Expected URL:", API_URL);
      console.error("   Is backend running? Check: http://localhost:5001");
      return Promise.reject({
        ...error,
        message: "Cannot connect to server. Please check if backend is running."
      });
    }

    // Log the failed URL
    console.error("   Failed URL:", error.config?.baseURL + error.config?.url);
    console.error("   Status:", error.response?.status);
    console.error("   Status Text:", error.response?.statusText);

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error("❌ 404 Not Found - Check your API endpoint");
      console.error("   Requested URL:", error.config.url);
      console.error("   Full URL:", error.config.baseURL + error.config.url);
    }

    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      console.log("❌ 401 Unauthorized - Clearing storage and redirecting to login");
      
      // Clear all storage types
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("rememberMe");
      
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error("❌ 403 Forbidden - Access denied");
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error("❌ 500 Server Error - Internal server error");
    }
    
    return Promise.reject(error);
  }
);

export default API;