// frontend/src/components/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ActivityLogger } from "../utils/activityTracker";
import ForgotPasswordModal from "./ForgotPasswordModal";
import SessionManager from "../utils/sessionManager";
import "../styles/Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  
  // UI states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Attempt login
    setLoading(true);
    
    // Pass the remember flag to login function
    const result = await login(email.trim(), password, remember);

    if (result.ok) {
      // Initialize session with real device and location data
      await SessionManager.initializeSession();
      
      // Log the login activity
      ActivityLogger.login();
      
      // Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } else {
      // Log failed attempt
      await SessionManager.addFailedLogin();
      setError(result.error || "Login failed");
    }
    
    setLoading(false);
  };

  // Handle Google OAuth
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5001/api/auth/google";
  };

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          {/* Left Section - Login Form */}
          <div className="auth-left">
            <h1 className="brand-title">MediCare+</h1>
            <p className="brand-sub">Smart Hospital Management System</p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {/* Email Input */}
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@medicare.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="auth-row">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-btn"
                  onClick={() => setShowForgotModal(true)}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Info Text about Remember Me */}
              {remember && (
                <div style={{
                  fontSize: "11px",
                  color: "#6c757d",
                  marginBottom: "12px",
                  padding: "8px 12px",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef"
                }}>
                  ℹ️ You'll stay logged in for 24 hours even after closing the browser
                </div>
              )}

              {/* Error Message */}
              {error && <div className="error-text">{error}</div>}

              {/* Login Button */}
              <button 
                className="btn-primary" 
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login to Dashboard"}
              </button>

              {/* Divider */}
              <div className="divider">
                <span>OR</span>
              </div>

              {/* Google Login Button */}
              <button 
                className="btn-google" 
                type="button" 
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.002 0 5.48 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                <span>Login with Google</span>
              </button>
            </form>
          </div>

          {/* Right Section - Info Panel */}
          <div className="auth-right">
            <h2>Welcome Back</h2>
            <p>
              Manage patients, beds, staff, and real-time hospital operations 
              efficiently with our comprehensive management system.
            </p>
            <div className="side-illustration">
              <img 
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop" 
                alt="Hospital Management"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </>
  );
}