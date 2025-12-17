// src/utils/deviceDetection.js
// Utility to detect device information and location

export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  // Detect device type
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  // Detect browser
  let browser = 'Unknown';
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('Edg') > -1) browser = 'Edge';
  else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) browser = 'IE';
  
  // Detect OS
  let os = 'Unknown';
  if (ua.indexOf('Win') > -1) os = 'Windows';
  else if (ua.indexOf('Mac') > -1) os = 'MacOS';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
  
  // Device type label
  let deviceType = 'Desktop';
  if (isMobile) deviceType = 'Mobile';
  else if (isTablet) deviceType = 'Tablet';
  
  return {
    deviceType,
    browser,
    os,
    fullDevice: `${deviceType} - ${browser}`,
    userAgent: ua
  };
};

export const getLocationInfo = async () => {
  try {
    // Try to get accurate location using ipapi.co (free, no API key needed)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    return {
      city: data.city || 'Unknown',
      region: data.region || 'Unknown',
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'Unknown',
      ip: data.ip || 'Unknown',
      location: `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country_code || 'Unknown'}`,
      timezone: data.timezone || 'Unknown',
      latitude: data.latitude || null,
      longitude: data.longitude || null
    };
  } catch (error) {
    console.error('Error fetching location:', error);
    
    // Fallback to a simpler API
    try {
      const fallbackResponse = await fetch('https://api.ipify.org?format=json');
      const fallbackData = await fallbackResponse.json();
      
      return {
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        countryCode: 'Unknown',
        ip: fallbackData.ip || 'Unknown',
        location: 'Unknown Location',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        latitude: null,
        longitude: null
      };
    } catch (fallbackError) {
      // Ultimate fallback
      return {
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        countryCode: 'Unknown',
        ip: 'Unknown',
        location: 'Unknown Location',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        latitude: null,
        longitude: null
      };
    }
  }
};

export const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getSessionFingerprint = () => {
  const device = getDeviceInfo();
  const screen = `${window.screen.width}x${window.screen.height}`;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create a unique fingerprint for this session
  const fingerprint = `${device.userAgent}-${screen}-${language}-${timezone}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};