// frontend/src/api/api.js
import axios from "axios";

// Use environment variable or fallback to production URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hospital-details-backend.onrender.com';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true,
  timeout: 30000 // 30 seconds for production (Render can be slower)
});

// Request interceptor - Check both storage types
API.interceptors.request.use(
  (config) => {
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
    console.log("✅ Response received:", response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ Response error:", error);

    // Handle network errors
    if (!error.response) {
      console.error("❌ Network Error - Backend may be unreachable");
      console.error(`   Trying to connect to: ${API_BASE_URL}`);
      return Promise.reject(error);
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