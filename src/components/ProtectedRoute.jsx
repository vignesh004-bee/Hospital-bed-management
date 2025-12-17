// frontend/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "18px",
        fontFamily: "Arial, sans-serif"
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
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Check authentication - verify both user state and token existence
  const sessionToken = sessionStorage.getItem("token");
  const localToken = localStorage.getItem("token");
  const hasToken = sessionToken || localToken;

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user || !hasToken) {
    console.log("Not authenticated - redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render protected content
  return children;
}