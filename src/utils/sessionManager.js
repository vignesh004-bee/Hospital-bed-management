// frontend/src/utils/sessionManager.js
class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.activityInterval = null;
  }

  // Generate unique session ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Detect device type and browser
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'Tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      deviceType = 'Mobile';
    }

    // Detect browser
    if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (ua.indexOf('SamsungBrowser') > -1) {
      browser = 'Samsung Internet';
    } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
      browser = 'Opera';
    } else if (ua.indexOf('Trident') > -1) {
      browser = 'Internet Explorer';
    } else if (ua.indexOf('Edge') > -1) {
      browser = 'Edge (Legacy)';
    } else if (ua.indexOf('Edg') > -1) {
      browser = 'Edge';
    } else if (ua.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (ua.indexOf('Safari') > -1) {
      browser = 'Safari';
    }

    // Detect OS
    if (ua.indexOf('Win') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'macOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';

    return {
      device: `${deviceType} - ${browser}`,
      deviceType,
      browser,
      os
    };
  }

  // Get IP and location data
  async getLocationData() {
    try {
      // Try to get real IP and location
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        ip: data.ip || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country_name || 'Unknown',
        location: `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country_code || 'Unknown'}`
      };
    } catch (error) {
      console.error('Failed to fetch location:', error);
      // Fallback to basic info
      return {
        ip: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        location: 'Unknown Location'
      };
    }
  }

  // Initialize session on login
  async initializeSession() {
    try {
      const deviceInfo = this.getDeviceInfo();
      const locationData = await this.getLocationData();
      
      this.currentSessionId = this.generateSessionId();
      
      const newSession = {
        id: this.currentSessionId,
        device: deviceInfo.device,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        location: locationData.location,
        ip: locationData.ip,
        loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        current: true
      };

      // Get existing sessions (only real ones, no defaults)
      const sessions = this.getActiveSessions();
      
      // Mark all existing sessions as non-current
      const updatedSessions = sessions.map(s => ({ ...s, current: false }));
      
      // Add new session
      updatedSessions.push(newSession);
      
      // Save to localStorage
      localStorage.setItem('activeSessions', JSON.stringify(updatedSessions));
      
      // Start activity tracking
      this.startActivityTracking();
      
      // Add to login history
      this.addLoginHistory({
        timestamp: new Date().toISOString(),
        device: deviceInfo.device,
        location: locationData.location,
        ip: locationData.ip,
        status: 'Success'
      });

      // Dispatch event
      window.dispatchEvent(new Event('sessionUpdate'));
      
      return newSession;
    } catch (error) {
      console.error('Failed to initialize session:', error);
      return null;
    }
  }

  // Start tracking user activity
  startActivityTracking() {
    // Clear any existing interval
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }

    // Update last active every 30 seconds
    this.activityInterval = setInterval(() => {
      this.updateLastActive();
    }, 30000);

    // Update on user interaction
    const updateActivity = () => this.updateLastActive();
    
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true, once: true });
      setTimeout(() => {
        document.addEventListener(event, updateActivity, { passive: true, once: true });
      }, 30000);
    });
  }

  // Update last active timestamp
  updateLastActive() {
    if (!this.currentSessionId) return;

    try {
      const sessions = this.getActiveSessions();
      const updated = sessions.map(session => {
        if (session.id === this.currentSessionId) {
          return { ...session, lastActive: new Date().toISOString() };
        }
        return session;
      });

      localStorage.setItem('activeSessions', JSON.stringify(updated));
      window.dispatchEvent(new Event('sessionUpdate'));
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  // Get all active sessions (only real sessions, no mock data)
  getActiveSessions() {
    try {
      const stored = localStorage.getItem('activeSessions');
      if (stored) {
        const sessions = JSON.parse(stored);
        // Return only valid sessions
        return Array.isArray(sessions) ? sessions : [];
      }
      // Return empty array instead of mock data
      return [];
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  // Get login history (only real logins, no mock data)
  getLoginHistory() {
    try {
      const stored = localStorage.getItem('loginHistory');
      if (stored) {
        const history = JSON.parse(stored);
        return Array.isArray(history) ? history : [];
      }
      // Return empty array instead of mock data
      return [];
    } catch (error) {
      console.error('Failed to get login history:', error);
      return [];
    }
  }

  // Add login to history
  addLoginHistory(loginData) {
    try {
      const history = this.getLoginHistory();
      history.unshift(loginData); // Add to beginning
      
      // Keep only last 50 logins
      if (history.length > 50) {
        history.splice(50);
      }
      
      localStorage.setItem('loginHistory', JSON.stringify(history));
      window.dispatchEvent(new Event('loginHistoryUpdate'));
    } catch (error) {
      console.error('Failed to add login history:', error);
    }
  }

  // Add failed login attempt
  async addFailedLogin() {
    try {
      const deviceInfo = this.getDeviceInfo();
      const locationData = await this.getLocationData();
      
      this.addLoginHistory({
        timestamp: new Date().toISOString(),
        device: deviceInfo.device,
        location: locationData.location,
        ip: locationData.ip,
        status: 'Failed'
      });
    } catch (error) {
      console.error('Failed to log failed attempt:', error);
    }
  }

  // Terminate a specific session
  terminateSession(sessionId) {
    try {
      const sessions = this.getActiveSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      
      localStorage.setItem('activeSessions', JSON.stringify(filtered));
      window.dispatchEvent(new Event('sessionUpdate'));
      
      return true;
    } catch (error) {
      console.error('Failed to terminate session:', error);
      return false;
    }
  }

  // Terminate all sessions except current
  terminateAllOtherSessions() {
    try {
      const sessions = this.getActiveSessions();
      const currentOnly = sessions.filter(s => s.current && s.id === this.currentSessionId);
      
      localStorage.setItem('activeSessions', JSON.stringify(currentOnly));
      window.dispatchEvent(new Event('sessionUpdate'));
      
      return true;
    } catch (error) {
      console.error('Failed to terminate sessions:', error);
      return false;
    }
  }

  // Clear session on logout
  clearSession() {
    try {
      // Stop activity tracking
      if (this.activityInterval) {
        clearInterval(this.activityInterval);
        this.activityInterval = null;
      }

      // Remove current session
      if (this.currentSessionId) {
        const sessions = this.getActiveSessions();
        const filtered = sessions.filter(s => s.id !== this.currentSessionId);
        localStorage.setItem('activeSessions', JSON.stringify(filtered));
      }

      this.currentSessionId = null;
      window.dispatchEvent(new Event('sessionUpdate'));
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  // Get current session info
  getCurrentSession() {
    if (!this.currentSessionId) return null;
    
    const sessions = this.getActiveSessions();
    return sessions.find(s => s.id === this.currentSessionId) || null;
  }
}

// Export singleton instance
const sessionManager = new SessionManager();
export default sessionManager;