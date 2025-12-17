// src/utils/activityTracker.js
// Global activity tracker for logging user actions

export const logActivity = (action, icon = "📋") => {
  try {
    const activity = {
      action,
      timestamp: Date.now(), // Use Date.now() for milliseconds
      timeDisplay: "Just now",
      icon
    };
    
    // Get existing activities
    const savedActivity = localStorage.getItem('userActivity');
    let activities = [];
    
    if (savedActivity) {
      try {
        activities = JSON.parse(savedActivity);
        // Validate existing activities have valid timestamps
        activities = activities.filter(a => 
          a && typeof a.timestamp === 'number' && !isNaN(a.timestamp) && a.timestamp > 0
        );
      } catch (parseErr) {
        console.warn('Invalid activity data, resetting:', parseErr);
        activities = [];
      }
    }
    
    // Check if this exact action was logged in the last 5 seconds (prevent duplicates)
    const recentDuplicate = activities.find(a => 
      a.action === action && 
      (Date.now() - a.timestamp) < 5000
    );
    
    if (recentDuplicate) {
      console.log('Skipping duplicate activity:', action);
      return;
    }
    
    // Add new activity at the beginning, keep only last 20
    const updatedActivities = [activity, ...activities].slice(0, 20);
    
    // Save back to localStorage
    localStorage.setItem('userActivity', JSON.stringify(updatedActivities));
    
    console.log('✅ Activity logged:', action);
    
    // Dispatch event so Profile component can update
    window.dispatchEvent(new Event('activityUpdate'));
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// Helper function to calculate time ago
export const getTimeAgo = (timestamp) => {
  // Validate timestamp
  if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
    return 'Unknown time';
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  
  // If timestamp is in the future or too old (more than 10 years), it's invalid
  if (diff < 0 || diff > 315360000000) {
    return 'Unknown time';
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Function to clean invalid activities
export const cleanActivities = () => {
  try {
    const savedActivity = localStorage.getItem('userActivity');
    if (!savedActivity) return;
    
    const activities = JSON.parse(savedActivity);
    const validActivities = activities.filter(a => 
      a && 
      typeof a.timestamp === 'number' && 
      !isNaN(a.timestamp) && 
      a.timestamp > 0 &&
      a.action &&
      typeof a.action === 'string'
    );
    
    localStorage.setItem('userActivity', JSON.stringify(validActivities));
    console.log(`Cleaned activities: ${activities.length} -> ${validActivities.length}`);
  } catch (err) {
    console.error('Failed to clean activities:', err);
  }
};

// Specific activity loggers for common actions
export const ActivityLogger = {
  // Authentication
  login: () => logActivity("Logged in", "🔓"),
  logout: () => logActivity("Logged out", "🔒"),
  passwordChange: () => logActivity("Changed password", "🔒"),
  
  // Profile
  profileUpdate: () => logActivity("Updated profile information", "✏️"),
  enable2FA: () => logActivity("Enabled 2FA", "📱"),
  
  // Patients
  patientAdded: (patientName) => logActivity(`Added patient: ${patientName}`, "👤"),
  patientUpdated: (patientName) => logActivity(`Updated patient: ${patientName}`, "📝"),
  patientDischarged: (patientName) => logActivity(`Discharged patient: ${patientName}`, "✅"),
  transferRequested: (patientName) => logActivity(`Requested transfer for: ${patientName}`, "🔄"),
  
  // Beds
  bedAssigned: (bedId, patientName) => logActivity(`Assigned bed ${bedId} to ${patientName}`, "🛏️"),
  bedReleased: (bedId) => logActivity(`Released bed ${bedId}`, "✅"),
  bedMaintenance: (bedId) => logActivity(`Marked bed ${bedId} for maintenance`, "🔧"),
  bedMaintenanceComplete: (bedId) => logActivity(`Completed maintenance on bed ${bedId}`, "✅"),
  
  // Staff
  staffAdded: (staffName) => logActivity(`Added staff: ${staffName}`, "👨‍⚕️"),
  staffUpdated: (staffName) => logActivity(`Updated staff: ${staffName}`, "📝"),
  staffScheduled: (staffName) => logActivity(`Assigned schedule to ${staffName}`, "📅"),
  staffStatusChanged: (staffName, status) => logActivity(`${staffName} is now ${status}`, "👨‍⚕️"),
  
  // Equipment
  equipmentAdded: (equipmentName) => logActivity(`Added equipment: ${equipmentName}`, "📦"),
  equipmentAssigned: (equipmentName) => logActivity(`Assigned equipment: ${equipmentName}`, "🔧"),
  equipmentMaintenance: (equipmentName) => logActivity(`${equipmentName} moved to maintenance`, "⚠️"),
  equipmentMaintenanceComplete: (equipmentName) => logActivity(`${equipmentName} maintenance completed`, "✅"),
  
  // Transfers
  transferApproved: (patientName) => logActivity(`Approved transfer for ${patientName}`, "✅"),
  transferRejected: (patientName) => logActivity(`Rejected transfer for ${patientName}`, "❌"),
  transferCompleted: (patientName) => logActivity(`Completed transfer for ${patientName}`, "🔄"),
  
  // Reports
  reportGenerated: (reportType) => logActivity(`Generated ${reportType} report`, "📊"),
  
  // System
  settingsChanged: () => logActivity("Updated system settings", "⚙️"),
};

// Clean activities on module load
cleanActivities();