// frontend/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { HospitalProvider } from "./context/HospitalContext";
import { DataProvider } from "./context/DataContext";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

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
          <p>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Check both authentication state and token
  const sessionToken = sessionStorage.getItem("token");
  const localToken = localStorage.getItem("token");
  const hasToken = sessionToken || localToken;

  if (!isAuthenticated || !user || !hasToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route Component (redirects to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

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
          <p>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Check both authentication state and token
  const sessionToken = sessionStorage.getItem("token");
  const localToken = localStorage.getItem("token");
  const hasToken = sessionToken || localToken;

  // If already authenticated, redirect to dashboard
  if (isAuthenticated && user && hasToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Main App Component
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
          <DataProvider>
            <Routes>
              {/* Public Route - Login */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />

              {/* Protected Route - Dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Root redirect - goes to dashboard if logged in, otherwise to login */}
              <Route 
                path="/" 
                element={
                  <Navigate 
                    to={
                      sessionStorage.getItem("token") || localStorage.getItem("token") 
                        ? "/dashboard" 
                        : "/login"
                    } 
                    replace 
                  />
                } 
              />

              {/* Catch all routes - redirect to dashboard or login */}
              <Route 
                path="*" 
                element={
                  <Navigate 
                    to={
                      sessionStorage.getItem("token") || localStorage.getItem("token") 
                        ? "/dashboard" 
                        : "/login"
                    } 
                    replace 
                  />
                } 
              />
            </Routes>
          </DataProvider>
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}