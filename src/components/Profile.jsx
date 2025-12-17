// src/components/Profile.jsx - Complete Version with Real Session Management
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ActivityLogger, getTimeAgo } from "../utils/activityTracker";
import SessionManager from "../utils/sessionManager";
import axios from "axios";
import "../styles/Profile.css";

export default function Profile() {
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    role: "System Manager", department: "Administration",
    employeeId: "", dateJoined: "", specialty: "Hospital Management",
    qualifications: "", address: "", emergencyContact: "",
  });

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [changesSaved, setChangesSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [qrCode, setQrCode] = useState("");

  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  const [showLoginHistoryModal, setShowLoginHistoryModal] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);

  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    loadProfile();
    loadActivityLog();
    loadSecuritySettings();
    loadActiveSessions();
    loadLoginHistory();
  }, [user]);

  const loadProfile = () => {
    try {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        const defaultProfile = {
          firstName: user?.name?.split(' ')[0] || "Admin",
          lastName: user?.name?.split(' ')[1] || "User",
          email: user?.email || "",
          phone: "+91 1234567890",
          role: "System Manager",
          department: "Administration",
          employeeId: user?.employeeId || "EMP-2024-001",
          dateJoined: "2024-01-15",
          specialty: "Hospital Management",
          qualifications: "MBBS, MBA Healthcare",
          address: "123 Medical Street, Healthcare City, India",
          emergencyContact: "Emergency Contact - +91 9876543210",
        };
        setProfile(defaultProfile);
        localStorage.setItem('userProfile', JSON.stringify(defaultProfile));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadSecuritySettings = () => {
    try {
      const settings = localStorage.getItem('securitySettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setTwoFactorEnabled(parsed.twoFactorEnabled || false);
      }
    } catch (err) {
      console.error('Error loading security settings:', err);
    }
  };

  // Updated to use SessionManager
  const loadActiveSessions = () => {
    try {
      const sessions = SessionManager.getActiveSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

  // Updated to use SessionManager
  const loadLoginHistory = () => {
    try {
      const history = SessionManager.getLoginHistory();
      setLoginHistory(history);
    } catch (err) {
      console.error('Error loading login history:', err);
    }
  };

  const loadActivityLog = () => {
    try {
      const savedActivity = localStorage.getItem('userActivity');
      if (savedActivity) {
        const activities = JSON.parse(savedActivity);
        const validActivities = activities.filter(a => 
          a && typeof a.timestamp === 'number' && !isNaN(a.timestamp) && a.timestamp > 0
        );
        setActivityLog(validActivities);
      } else {
        const loginActivity = [{ action: "Logged in", timestamp: Date.now(), timeDisplay: "Just now", icon: "🔓" }];
        setActivityLog(loginActivity);
        localStorage.setItem('userActivity', JSON.stringify(loginActivity));
      }
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  };

  // Real-time updates for sessions and login history
  useEffect(() => {
    const handleSessionUpdate = () => {
      loadActiveSessions();
    };
    
    const handleLoginHistoryUpdate = () => {
      loadLoginHistory();
    };
    
    window.addEventListener('sessionUpdate', handleSessionUpdate);
    window.addEventListener('loginHistoryUpdate', handleLoginHistoryUpdate);
    
    return () => {
      window.removeEventListener('sessionUpdate', handleSessionUpdate);
      window.removeEventListener('loginHistoryUpdate', handleLoginHistoryUpdate);
    };
  }, []);

  useEffect(() => {
    const updateTimeDisplays = () => { loadActivityLog(); };
    const interval = setInterval(updateTimeDisplays, 60000);
    const handleActivityUpdate = () => { loadActivityLog(); };
    window.addEventListener('activityUpdate', handleActivityUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('activityUpdate', handleActivityUpdate);
    };
  }, []);

  const handleChange = (key, value) => {
    setProfile({ ...profile, [key]: value });
    setChangesSaved(false);
  };

  const handleSave = () => {
    try {
      setLoading(true);
      localStorage.setItem('userProfile', JSON.stringify(profile));
      const fullName = `${profile.firstName} ${profile.lastName}`;
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.name = fullName;
      localStorage.setItem('user', JSON.stringify(currentUser));
      setEditing(false);
      setChangesSaved(true);
      setError("");
      alert('Profile updated successfully!');
      ActivityLogger.profileUpdate();
      setTimeout(() => setChangesSaved(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    loadProfile();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (!passwordData.currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError("Please enter a new password");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await axios.post('http://localhost:5001/api/auth/change-password', {
        email: profile.email || user.email,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully! Please login again with your new password.');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      ActivityLogger.passwordChange();
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = () => {
    const mockQRCode = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/MediCarePlus:" + encodeURIComponent(profile.email) + "?secret=JBSWY3DPEHPK3PXP&issuer=MediCarePlus";
    setQrCode(mockQRCode);
    setShow2FAModal(true);
  };

  const handleVerify2FA = () => {
    if (verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }
    const settings = { twoFactorEnabled: true, secret: "JBSWY3DPEHPK3PXP", enabledAt: new Date().toISOString() };
    localStorage.setItem('securitySettings', JSON.stringify(settings));
    setTwoFactorEnabled(true);
    setShow2FAModal(false);
    setVerificationCode("");
    ActivityLogger.enable2FA();
    alert('Two-Factor Authentication has been enabled successfully!');
  };

  const handleDisable2FA = () => {
    if (window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
      const settings = { twoFactorEnabled: false, disabledAt: new Date().toISOString() };
      localStorage.setItem('securitySettings', JSON.stringify(settings));
      setTwoFactorEnabled(false);
      alert('Two-Factor Authentication has been disabled.');
    }
  };

  // Updated to use SessionManager
  const handleTerminateSession = (sessionId) => {
    if (window.confirm('Are you sure you want to terminate this session?')) {
      const success = SessionManager.terminateSession(sessionId);
      if (success) {
        loadActiveSessions();
        alert('Session terminated successfully!');
      }
    }
  };

  // Updated to use SessionManager
  const handleTerminateAllSessions = () => {
    if (window.confirm('This will log you out from all devices except the current one. Continue?')) {
      const success = SessionManager.terminateAllOtherSessions();
      if (success) {
        loadActiveSessions();
        alert('All other sessions have been terminated!');
      }
    }
  };

  const handleClearActivityLog = () => {
    if (window.confirm('Are you sure you want to clear all activity history?')) {
      localStorage.removeItem('userActivity');
      setActivityLog([]);
      alert('Activity log cleared successfully!');
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading && !profile.email) {
    return (
      <div className="profile">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <div>
          <h1 className="profile-title">My Profile</h1>
          <p className="profile-subtitle">Manage your personal information and preferences</p>
        </div>
        <div className="header-actions">
          {editing ? (
            <>
              <button className="cancel-btn" onClick={handleCancel} disabled={loading}>Cancel</button>
              <button className="save-btn" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : changesSaved ? "✓ Saved" : "Save Changes"}
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">{profile.firstName.charAt(0)}{profile.lastName.charAt(0)}</div>
            <button className="change-photo-btn">Change Photo</button>
          </div>
          <div className="profile-info-section">
            <h2 className="profile-name">{profile.firstName} {profile.lastName}</h2>
            <div className="profile-role">{profile.role}</div>
            <div className="profile-department">{profile.department}</div>
            <div className="profile-id">ID: {profile.employeeId}</div>
          </div>
        </div>

        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={`profile-tab ${activeTab === "activity" ? "active" : ""}`} onClick={() => setActiveTab("activity")}>Activity Log</button>
          <button className={`profile-tab ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>Security</button>
        </div>

        <div className="profile-content">
          {activeTab === "overview" && (
            <div className="overview-section">
              <div className="info-card">
                <h3 className="card-title">Personal Information</h3>
                <div className="info-grid">
                  <div className="info-group">
                    <label className="info-label">First Name</label>
                    {editing ? <input type="text" className="info-input" value={profile.firstName} onChange={(e) => handleChange("firstName", e.target.value)} /> : <div className="info-value">{profile.firstName}</div>}
                  </div>
                  <div className="info-group">
                    <label className="info-label">Last Name</label>
                    {editing ? <input type="text" className="info-input" value={profile.lastName} onChange={(e) => handleChange("lastName", e.target.value)} /> : <div className="info-value">{profile.lastName}</div>}
                  </div>
                  <div className="info-group">
                    <label className="info-label">Email Address</label>
                    {editing ? <input type="email" className="info-input" value={profile.email} onChange={(e) => handleChange("email", e.target.value)} /> : <div className="info-value">{profile.email}</div>}
                  </div>
                  <div className="info-group">
                    <label className="info-label">Phone Number</label>
                    {editing ? <input type="tel" className="info-input" value={profile.phone} onChange={(e) => handleChange("phone", e.target.value)} /> : <div className="info-value">{profile.phone}</div>}
                  </div>
                  <div className="info-group full-width">
                    <label className="info-label">Address</label>
                    {editing ? <textarea className="info-textarea" value={profile.address} onChange={(e) => handleChange("address", e.target.value)} rows="2" /> : <div className="info-value">{profile.address}</div>}
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3 className="card-title">Professional Information</h3>
                <div className="info-grid">
                  <div className="info-group"><label className="info-label">Role</label><div className="info-value">{profile.role}</div></div>
                  <div className="info-group"><label className="info-label">Department</label><div className="info-value">{profile.department}</div></div>
                  <div className="info-group"><label className="info-label">Employee ID</label><div className="info-value">{profile.employeeId}</div></div>
                  <div className="info-group"><label className="info-label">Date Joined</label><div className="info-value">{profile.dateJoined}</div></div>
                  <div className="info-group">
                    <label className="info-label">Specialty</label>
                    {editing ? <input type="text" className="info-input" value={profile.specialty} onChange={(e) => handleChange("specialty", e.target.value)} /> : <div className="info-value">{profile.specialty}</div>}
                  </div>
                  <div className="info-group">
                    <label className="info-label">Qualifications</label>
                    {editing ? <input type="text" className="info-input" value={profile.qualifications} onChange={(e) => handleChange("qualifications", e.target.value)} /> : <div className="info-value">{profile.qualifications}</div>}
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3 className="card-title">Emergency Contact</h3>
                <div className="info-group">
                  <label className="info-label">Emergency Contact</label>
                  {editing ? <input type="text" className="info-input" value={profile.emergencyContact} onChange={(e) => handleChange("emergencyContact", e.target.value)} placeholder="Name - Phone" /> : <div className="info-value">{profile.emergencyContact}</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="activity-section">
              <div className="info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 className="card-title" style={{ marginBottom: 0 }}>Recent Activity</h3>
                  <button onClick={handleClearActivityLog} style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Clear Log</button>
                </div>
                <div className="activity-list">
                  {activityLog.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}><p>No activity recorded yet</p></div>
                  ) : (
                    activityLog.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">{activity.icon}</div>
                        <div className="activity-info">
                          <div className="activity-action">{activity.action}</div>
                          <div className="activity-time">{getTimeAgo(activity.timestamp)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="security-section">
              <div className="info-card">
                <h3 className="card-title">Password & Security</h3>
                <div className="security-actions">
                  <button className="security-btn" onClick={() => setShowPasswordModal(true)}>
                    <span className="btn-icon">🔒</span>
                    <div className="btn-info">
                      <div className="btn-title">Change Password</div>
                      <div className="btn-description">Update your password regularly</div>
                    </div>
                    <span className="btn-arrow">→</span>
                  </button>
                  <button className="security-btn" onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}>
                    <span className="btn-icon">{twoFactorEnabled ? "✅" : "📱"}</span>
                    <div className="btn-info">
                      <div className="btn-title">Two-Factor Authentication {twoFactorEnabled && <span style={{color: '#28a745', fontSize: '12px'}}>(Enabled)</span>}</div>
                      <div className="btn-description">{twoFactorEnabled ? 'Disable extra security' : 'Add extra security to your account'}</div>
                    </div>
                    <span className="btn-arrow">→</span>
                  </button>
                  <button className="security-btn" onClick={() => setShowSessionsModal(true)}>
                    <span className="btn-icon">🔑</span>
                    <div className="btn-info">
                      <div className="btn-title">Active Sessions</div>
                      <div className="btn-description">Manage your active sessions ({activeSessions.length})</div>
                    </div>
                    <span className="btn-arrow">→</span>
                  </button>
                  <button className="security-btn" onClick={() => setShowLoginHistoryModal(true)}>
                    <span className="btn-icon">📋</span>
                    <div className="btn-info">
                      <div className="btn-title">Login History</div>
                      <div className="btn-description">View your recent login activity</div>
                    </div>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="modal-body">
                {passwordError && <div className="error-message">{passwordError}</div>}
                <div className="form-group">
                  <label>Current Password *</label>
                  <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>New Password *</label>
                  <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} required minLength="6" />
                  <small>Minimum 6 characters</small>
                </div>
                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {show2FAModal && (
        <div className="modal-overlay" onClick={() => setShow2FAModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enable Two-Factor Authentication</h2>
              <button className="close-btn" onClick={() => setShow2FAModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '20px' }}>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
              <img src={qrCode} alt="QR Code" style={{ width: '200px', height: '200px', margin: '0 auto' }} />
              <p style={{ margin: '20px 0', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontFamily: 'monospace' }}>Manual Entry Key: JBSWY3DPEHPK3PXP</p>
              <div className="form-group">
                <label>Enter 6-digit verification code</label>
                <input type="text" maxLength="6" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShow2FAModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleVerify2FA}>Verify & Enable</button>
            </div>
          </div>
        </div>
      )}

      {showSessionsModal && (
        <div className="modal-overlay" onClick={() => setShowSessionsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Active Sessions</h2>
              <button className="close-btn" onClick={() => setShowSessionsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {activeSessions.length > 1 && (
                <div style={{ marginBottom: '20px' }}>
                  <button onClick={handleTerminateAllSessions} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: '600' }}>Terminate All Other Sessions</button>
                </div>
              )}
              {activeSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <p>No active sessions found</p>
                </div>
              ) : (
                activeSessions.map((session) => (
                <div key={session.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: session.current ? '#f0f8ff' : 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {session.device} {session.current && <span style={{ color: '#28a745', fontSize: '12px' }}>(Current)</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        📍 {session.location}<br />
                        🌐 IP: {session.ip}<br />
                        🕒 Last Active: {getTimeAgo(new Date(session.lastActive).getTime())}
                      </div>
                    </div>
                    {!session.current && (
                      <button onClick={() => handleTerminateSession(session.id)} style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Terminate</button>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setShowSessionsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showLoginHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowLoginHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Login History</h2>
              <button className="close-btn" onClick={() => setShowLoginHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loginHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <p>No login history available</p>
                </div>
              ) : (
                loginHistory.map((entry, index) => (
                <div key={index} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold' }}>{entry.device}</div>
                    <div style={{ color: entry.status === 'Success' ? '#28a745' : '#dc3545', fontSize: '13px', fontWeight: 'bold' }}>
                      {entry.status === 'Success' ? '✓' : '✗'} {entry.status}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    🕒 {formatDateTime(entry.timestamp)}<br />
                    📍 {entry.location}<br />
                    🌐 IP: {entry.ip}
                  </div>
                </div>
              ))
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setShowLoginHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}