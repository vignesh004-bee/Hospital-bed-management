// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import SessionManager from "../utils/sessionManager";
import { ActivityLogger } from "../utils/activityTracker";
import API from "../api/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from storage on mount (sessionStorage first, then localStorage)
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check sessionStorage first (session-only login)
        let storedUser = sessionStorage.getItem("user");
        let token = sessionStorage.getItem("token");
        
        // If not in sessionStorage, check localStorage (Remember Me)
        if (!storedUser || !token) {
          storedUser = localStorage.getItem("user");
          token = localStorage.getItem("token");
        }
        
        if (storedUser && token) {
          // Verify token is still valid with backend
          try {
            const response = await API.get("/auth/verify");
            if (response.data.success) {
              setUser(JSON.parse(storedUser));
            } else {
              // Token invalid, clear storage
              clearStorage();
            }
          } catch (error) {
            console.error("Token verification failed:", error);
            clearStorage();
          }
        }
      } catch (err) {
        console.error("Failed to load user:", err);
        clearStorage();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Clear all storage
  const clearStorage = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
  };

  // Login function with Remember Me support
  const login = async (email, password, rememberMe = false) => {
    try {
      console.log("Attempting login with:", email, "Remember Me:", rememberMe);
      
      const response = await API.post("/auth/login", {
        email: email.trim(),
        password: password
      });

      console.log("Login response:", response.data);

      if (response.data.success && response.data.token) {
        const { token, user } = response.data;

        // Store based on "Remember Me" preference
        if (rememberMe) {
          // Persistent storage (survives browser close)
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("rememberMe", "true");
          console.log("Stored in localStorage (Remember Me)");
        } else {
          // Session storage (cleared when browser closes)
          sessionStorage.setItem("token", token);
          sessionStorage.setItem("user", JSON.stringify(user));
          console.log("Stored in sessionStorage (Session only)");
        }
        
        setUser(user);

        console.log("Login successful, returning ok: true");
        return { ok: true };
      } else {
        console.log("Login failed, no token");
        return { ok: false, error: "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error response:", error.response?.data);
      
      const message = error.response?.data?.message || 
                     error.message || 
                     "Login failed. Please try again.";
      
      return { ok: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    // Clear session tracking
    SessionManager.clearSession();
    
    // Log activity
    ActivityLogger.logout();
    
    // Clear all storage
    clearStorage();
    
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "Arial, sans-serif",
        fontSize: "18px"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid #e9ecef",
            borderTop: "4px solid #000000",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px"
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};