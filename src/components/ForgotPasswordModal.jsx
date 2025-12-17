// frontend/src/components/ForgotPasswordModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/api";
import "../styles/Auth.css";

export default function ForgotPasswordModal({ onClose }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // State management
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Auto-login
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  
  // UI states
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async () => {
    setMessage("");
    setError("");

    // Validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/forgot-password", { 
        email: email.trim() 
      });

      setMessage(response.data.message || "OTP sent to your email");
      setStep(2);
    } catch (err) {
      console.error("Send OTP error:", err);
      
      const errorMsg = err.response?.data?.message || 
                      "Failed to send OTP. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and auto-login
  const handleVerifyOTP = async () => {
    setMessage("");
    setError("");

    // Validation
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      // Verify OTP - backend now returns token and user
      const response = await API.post("/auth/verify-otp", { 
        email: email.trim(), 
        otp: otp.trim()
      });

      if (response.data.success && response.data.token) {
        const { token, user } = response.data;

        // Store token and user (same as login)
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        
        setMessage("OTP verified! Logging you in...");
        
        // Wait a moment to show success message
        setTimeout(() => {
          onClose();
          navigate("/dashboard", { replace: true });
          window.location.reload(); // Refresh to update auth state
        }, 1000);
      } else {
        setError("OTP verification failed");
      }

    } catch (err) {
      console.error("Verify OTP error:", err);
      
      const errorMsg = err.response?.data?.message || 
                      "Invalid OTP. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Handle resend OTP
  const handleResendOTP = () => {
    setOtp("");
    setStep(1);
    setError("");
    setMessage("");
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="modal-close" 
          onClick={handleClose}
          disabled={loading}
          aria-label="Close"
        >
          ×
        </button>

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <>
            <h3>Verify Your Identity</h3>
            <p className="info" style={{ marginBottom: 16 }}>
              Enter your email address to receive an OTP code.
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              disabled={loading}
              autoFocus
            />

            {error && <div className="error-text">{error}</div>}
            {message && <div className="success-text">{message}</div>}

            <button 
              className="primary-btn" 
              onClick={handleSendOTP}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <>
            <h3>Enter OTP</h3>
            <p className="info" style={{ marginBottom: 16 }}>
              Enter the 6-digit OTP sent to <strong>{email}</strong>
            </p>

            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                // Only allow numbers and max 6 digits
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
                setError("");
              }}
              disabled={loading}
              maxLength={6}
              autoFocus
            />

            {error && <div className="error-text">{error}</div>}
            {message && <div className="success-text">{message}</div>}

            <button 
              className="primary-btn" 
              onClick={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <p className="info" style={{ marginTop: 12, textAlign: "center" }}>
              Didn't receive the code?{" "}
              <button 
                onClick={handleResendOTP} 
                className="forgot-btn"
                disabled={loading}
              >
                Resend OTP
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}