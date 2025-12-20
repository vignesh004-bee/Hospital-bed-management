// src/components/Notifications.jsx
import React, { useState, useEffect } from "react";
import API from "../api/api";
import "../styles/Notifications.css";

export default function Notifications() {
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/notifications');
      setNotifications(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    const matchesType = filterType === "all" || notif.type === filterType;
    const matchesRead = filterRead === "all" || 
                       (filterRead === "unread" && !notif.read) ||
                       (filterRead === "read" && notif.read);
    return matchesType && matchesRead;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    actionRequired: notifications.filter(n => n.actionRequired).length,
    critical: notifications.filter(n => n.type === "critical").length,
  };

  const handleMarkAsRead = async (id) => {
    if (id.startsWith('SYS-')) return;
    
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      setError(null);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.patch('/notifications/mark-all/read');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setError(null);
    } catch (err) {
      setError('Failed to mark all as read');
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id) => {
    if (id.startsWith('SYS-')) {
      alert('System notifications cannot be deleted');
      return;
    }
    
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      setError(null);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) {
      return;
    }
    
    try {
      await API.delete('/notifications/clear/all');
      setNotifications(notifications.filter(n => n.isSystem));
      setError(null);
    } catch (err) {
      setError('Failed to clear notifications');
      console.error('Error clearing notifications:', err);
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case "critical": return "#000000";
      case "transfer": return "#333333";
      case "equipment": return "#666666";
      case "staff": return "#666666";
      case "patient": return "#666666";
      case "waiting": return "#666666";
      case "system": return "#000000";
      default: return "#999999";
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case "critical": return "🚨";
      case "transfer": return "🔄";
      case "equipment": return "🔧";
      case "staff": return "👨‍⚕️";
      case "patient": return "👤";
      case "waiting": return "⏳";
      case "system": return "⚠️";
      default: return "🔔";
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">Notifications</h1>
          <p className="notifications-subtitle">Stay updated with real-time hospital alerts and updates</p>
        </div>
        <div className="header-actions">
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            ✓ Mark All Read
          </button>
          <button className="clear-all-btn" onClick={handleClearAll}>
            🗑️ Clear All
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="notifications-stats">
        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Notifications</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📩</div>
          <div className="stat-info">
            <div className="stat-value">{stats.unread}</div>
            <div className="stat-label">Unread</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <div className="stat-value">{stats.actionRequired}</div>
            <div className="stat-label">Action Required</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <div className="stat-value">{stats.critical}</div>
            <div className="stat-label">Critical Alerts</div>
          </div>
        </div>
      </div>

      <div className="notifications-filters">
        <div className="filter-left">
          <select 
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="critical">Critical</option>
            <option value="transfer">Transfers</option>
            <option value="equipment">Equipment</option>
            <option value="staff">Staff</option>
            <option value="patient">Patients</option>
            <option value="waiting">Waiting List</option>
            <option value="system">System</option>
          </select>
          <select 
            className="filter-select"
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value)}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <div className="empty-title">No notifications</div>
            <div className="empty-text">You're all caught up!</div>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif._id} 
              className={`notification-card ${notif.read ? 'read' : 'unread'} ${notif.actionRequired ? 'action-required' : ''} ${notif.isSystem ? 'system' : ''}`}
            >
              <div 
                className="notification-indicator"
                style={{ background: getTypeColor(notif.type) }}
              ></div>
              
              <div className="notification-icon">{getNotificationIcon(notif.type)}</div>
              
              <div className="notification-content">
                <div className="notification-header-row">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-time">
                    {notif.isSystem ? 'Live' : getTimeAgo(notif.createdAt)}
                  </div>
                </div>
                <div className="notification-message">{notif.message}</div>
                {notif.actionRequired && (
                  <div className="action-required-badge">
                    <span className="pulse-dot"></span>
                    Action Required
                  </div>
                )}
              </div>
              
              <div className="notification-actions">
                {!notif.read && !notif.isSystem && (
                  <button 
                    className="action-icon-btn" 
                    onClick={() => handleMarkAsRead(notif._id)}
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
                {!notif.isSystem && (
                  <button 
                    className="action-icon-btn delete" 
                    onClick={() => handleDelete(notif._id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}