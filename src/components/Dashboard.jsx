// src/components/Dashboard.jsx - Live Patient Journey Tracker
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import BedManagement from "./BedManagement";
import PatientAdmission from "./PatientAdmission";
import EquipmentTracking from "./EquipmentTracking";
import StaffSchedule from "./StaffSchedule";
import TransferRequests from "./TransferRequests";
import Notifications from "./Notifications";
import Profile from "./Profile";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterType, setFilterType] = useState("all"); // all, general, emergency, icu
  
  // Get shared data from context
  const { beds, patients, staff, transfers, loading, fetchAllData } = useData();

  // Update current time every second for live tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh && activeMenu === 'dashboard') {
      const interval = setInterval(() => {
        fetchAllData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, activeMenu, fetchAllData]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && !e.target.closest('.sidebar') && !e.target.closest('.hamburger-btn')) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults(null);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = {
      patients: patients.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.patientId.toLowerCase().includes(term) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(term))
      ),
      beds: beds.filter(b => 
        b.bedId.toLowerCase().includes(term) ||
        b.ward.toLowerCase().includes(term) ||
        (b.patient && b.patient.toLowerCase().includes(term))
      ),
      staff: staff.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.staffId.toLowerCase().includes(term) ||
        s.role.toLowerCase().includes(term) ||
        s.department.toLowerCase().includes(term)
      ),
      transfers: transfers.filter(t => 
        t.patientName.toLowerCase().includes(term) ||
        t.patientIdNumber.toLowerCase().includes(term) ||
        t.fromWard.toLowerCase().includes(term) ||
        t.toWard.toLowerCase().includes(term)
      )
    };

    setSearchResults(results);
  }, [searchTerm, patients, beds, staff, transfers]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "Admin";
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setSearchTerm("");
    setSearchResults(null);
    setSidebarOpen(false);
  };

  const handleViewDetails = () => {
    setActiveMenu('beds');
  };

  // Calculate real analytics
  const analytics = {
    totalBeds: beds.length,
    occupiedBeds: beds.filter(b => b.status === "occupied").length,
    availableBeds: beds.filter(b => b.status === "available").length,
    maintenanceBeds: beds.filter(b => b.status === "maintenance").length,
    admittedPatients: patients.filter(p => p.status === "admitted").length,
    totalPatients: patients.length,
    totalStaff: staff.length,
    onDutyStaff: staff.filter(s => s.currentStatus === "on-duty").length,
    pendingTransfers: transfers.filter(t => t.status === "pending").length,
    occupancyRate: beds.length > 0 ? Math.round((beds.filter(b => b.status === "occupied").length / beds.length) * 100) : 0,
    avgStayDays: 3.5
  };

  // Get patient type duration based on ward
  const getPatientTypeDuration = (ward) => {
    const wardLower = (ward || '').toLowerCase();
    if (wardLower.includes('icu') || wardLower.includes('intensive')) {
      return { days: 10, type: 'ICU', icon: '🏥', color: '#000000' };
    } else if (wardLower.includes('emergency') || wardLower.includes('er')) {
      return { days: 4, type: 'Emergency', icon: '🚨', color: '#000000' };
    } else {
      return { days: 1, type: 'General', icon: '🏨', color: '#000000' };
    }
  };

  // Format time remaining
  const formatTimeRemaining = (milliseconds) => {
    if (milliseconds <= 0) return "Ready for discharge";
    
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const totalHours = Math.floor(milliseconds / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Format elapsed time
  const formatElapsedTime = (milliseconds) => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const totalHours = Math.floor(milliseconds / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStageIcon = (stage) => {
    switch(stage) {
      case "Admission": return "📋";
      case "Assessment": return "🔍";
      case "Tests": return "🔬";
      case "Treatment": return "💊";
      case "Surgery": return "⚕️";
      case "ICU Care": return "🏥";
      case "Recovery": return "🛏️";
      case "Monitoring": return "📊";
      case "Discharge": return "✅";
      default: return "📍";
    }
  };

  const getStageColor = (status) => {
    switch(status) {
      case "completed": return "#000000";
      case "in-progress": return "#666666";
      case "pending": return "#e0e0e0";
      default: return "#e0e0e0";
    }
  };

  // Transform real patients into journey format with live tracking
  const getActiveJourneys = () => {
    return patients
      .filter(p => p.status === "admitted")
      .map(patient => {
        const admissionDate = new Date(patient.admissionDate);
        
        // Calculate precise time since admission using currentTime
        const timeSinceAdmission = currentTime - admissionDate;
        const daysSinceAdmission = timeSinceAdmission / (1000 * 60 * 60 * 24);
        
        // Get patient type and expected duration
        const patientType = getPatientTypeDuration(patient.ward);
        const expectedDurationDays = patientType.days;
        
        // Calculate stages based on patient type
        let stages = [];
        let currentStage = "Admission";
        let currentStageIndex = 0;
        
        // Different timelines for different patient types
        if (patientType.type === 'General') {
          // General: 1 day (24 hours)
          stages = [
            { name: "Admission", checkpoint: 0, duration: "30m" },
            { name: "Assessment", checkpoint: 0.04, duration: "1h" }, // 1 hour
            { name: "Treatment", checkpoint: 0.21, duration: "8h" }, // 5 hours
            { name: "Monitoring", checkpoint: 0.63, duration: "6h" }, // 15 hours
            { name: "Discharge", checkpoint: 0.96, duration: "1h" } // 23 hours
          ];
        } else if (patientType.type === 'Emergency') {
          // Emergency: 4 days (96 hours)
          stages = [
            { name: "Admission", checkpoint: 0, duration: "1h" },
            { name: "Assessment", checkpoint: 0.02, duration: "3h" }, // 2 hours
            { name: "Tests", checkpoint: 0.13, duration: "12h" }, // 12 hours
            { name: "Treatment", checkpoint: 0.38, duration: "24h" }, // 36 hours
            { name: "Recovery", checkpoint: 0.75, duration: "36h" }, // 72 hours
            { name: "Discharge", checkpoint: 0.96, duration: "4h" } // 92 hours
          ];
        } else {
          // ICU: 10 days (240 hours)
          stages = [
            { name: "Admission", checkpoint: 0, duration: "2h" },
            { name: "Assessment", checkpoint: 0.02, duration: "6h" }, // 4 hours
            { name: "ICU Care", checkpoint: 0.08, duration: "72h" }, // 20 hours
            { name: "Surgery", checkpoint: 0.38, duration: "48h" }, // 92 hours
            { name: "Recovery", checkpoint: 0.58, duration: "72h" }, // 140 hours
            { name: "Monitoring", checkpoint: 0.83, duration: "36h" }, // 200 hours
            { name: "Discharge", checkpoint: 0.96, duration: "8h" } // 230 hours
          ];
        }
        
        // Calculate progress as percentage of expected duration
        const progressPercent = Math.min((daysSinceAdmission / expectedDurationDays) * 100, 100);
        
        // Determine current stage based on progress
        for (let i = 0; i < stages.length; i++) {
          const checkpointPercent = (stages[i].checkpoint / expectedDurationDays) * 100;
          if (progressPercent >= checkpointPercent * 100) {
            currentStageIndex = i;
            currentStage = stages[i].name;
          }
        }
        
        // Update stage statuses
        stages = stages.map((stage, index) => {
          if (index < currentStageIndex) {
            return { ...stage, status: "completed" };
          } else if (index === currentStageIndex) {
            return { ...stage, status: "in-progress" };
          } else {
            return { ...stage, status: "pending" };
          }
        });

        // Calculate estimated discharge time
        const estimatedDischarge = new Date(admissionDate);
        estimatedDischarge.setDate(estimatedDischarge.getDate() + expectedDurationDays);
        const timeUntilDischarge = estimatedDischarge - currentTime;
        
        // Check if delayed
        const isDelayed = daysSinceAdmission > expectedDurationDays;
        const delayHours = isDelayed ? (daysSinceAdmission - expectedDurationDays) * 24 : 0;

        // Assign staff
        const assignedStaff = {};
        const wardStaff = staff.filter(s => 
          s.department === patient.ward && s.currentStatus === "on-duty"
        );
        
        if (wardStaff.length > 0) {
          const randomStaff = wardStaff[Math.floor(Math.random() * wardStaff.length)];
          assignedStaff[currentStage] = randomStaff.name;
        }

        // Generate alerts
        const alerts = [];
        if (isDelayed) {
          alerts.push({
            type: 'warning',
            message: `Patient stay delayed by ${Math.floor(delayHours)} hours`
          });
        }
        if (progressPercent > 90 && progressPercent < 100) {
          alerts.push({
            type: 'info',
            message: 'Prepare discharge documentation'
          });
        }
        if (timeUntilDischarge < 3600000 && timeUntilDischarge > 0) {
          alerts.push({
            type: 'success',
            message: 'Discharge within 1 hour'
          });
        }

        return {
          id: patient.patientId,
          name: patient.name,
          patientType: patientType.type,
          patientTypeIcon: patientType.icon,
          patientTypeColor: patientType.color,
          currentStage,
          progress: Math.round(progressPercent),
          stages,
          assignedStaff,
          admissionDate: admissionDate.toISOString(),
          estimatedDischarge: estimatedDischarge.toISOString(),
          timeElapsed: formatElapsedTime(timeSinceAdmission),
          timeRemaining: formatTimeRemaining(timeUntilDischarge),
          isDelayed,
          delayReason: isDelayed ? `Extended ${patientType.type.toLowerCase()} care - ${Math.floor(delayHours)}h over expected` : null,
          alerts,
          notes: `${patient.diagnosis} - ${patient.ward || 'Not assigned'}`,
          expectedDuration: `${expectedDurationDays} day${expectedDurationDays > 1 ? 's' : ''}`
        };
      })
      .sort((a, b) => {
        // Sort by progress (most urgent first)
        if (a.isDelayed && !b.isDelayed) return -1;
        if (!a.isDelayed && b.isDelayed) return 1;
        return b.progress - a.progress;
      });
  };

  const activeJourneys = getActiveJourneys();
  
  // Filter journeys by type
  const filteredJourneys = filterType === "all" 
    ? activeJourneys 
    : activeJourneys.filter(j => j.patientType.toLowerCase() === filterType);

  // Calculate type-specific analytics
  const typeAnalytics = {
    general: activeJourneys.filter(j => j.patientType === 'General').length,
    emergency: activeJourneys.filter(j => j.patientType === 'Emergency').length,
    icu: activeJourneys.filter(j => j.patientType === 'ICU').length,
    delayed: activeJourneys.filter(j => j.isDelayed).length,
    nearDischarge: activeJourneys.filter(j => j.progress > 90).length
  };

  const stats = [
    { value: analytics.totalBeds, label: "Total Beds" },
    { value: analytics.admittedPatients, label: "Active Patients" },
    { value: analytics.onDutyStaff, label: "Staff On Duty" },
    { value: `${analytics.occupancyRate}%`, label: "Bed Occupancy" }
  ];

  const metrics = [
    { value: typeAnalytics.general, label: "General Ward", icon: "🏨", color: "#000000" },
    { value: typeAnalytics.emergency, label: "Emergency", icon: "🚨", color: "#000000" },
    { value: typeAnalytics.icu, label: "ICU Patients", icon: "🏥", color: "#000000" },
    { value: typeAnalytics.nearDischarge, label: "Near Discharge", icon: "✅", color: "#000000" }
  ];

  const getAlertMessage = () => {
    const occupancy = analytics.occupancyRate;
    
    if (occupancy >= 90) {
      return {
        level: "critical",
        title: "CRITICAL: High Occupancy Alert",
        message: `ICU capacity at ${occupancy}% - URGENT: Only ${analytics.availableBeds} beds available. Prepare emergency overflow beds immediately!`,
        icon: "🚨"
      };
    } else if (occupancy >= 80) {
      return {
        level: "warning",
        title: "High Occupancy Warning",
        message: `Bed occupancy at ${occupancy}% - ${analytics.availableBeds} beds remaining. Consider preparing additional beds for incoming patients`,
        icon: "⚠️"
      };
    } else if (occupancy >= 70) {
      return {
        level: "info",
        title: "Occupancy Notice",
        message: `Current bed occupancy at ${occupancy}% - ${analytics.availableBeds} beds available. Monitor capacity levels`,
        icon: "ℹ️"
      };
    } else {
      return {
        level: "normal",
        title: "System Status: Normal",
        message: `Bed occupancy at ${occupancy}% - ${analytics.availableBeds} beds available. ${analytics.occupiedBeds} beds occupied, ${analytics.maintenanceBeds} under maintenance`,
        icon: "✅"
      };
    }
  };

  const alert = getAlertMessage();

  // Render content based on active menu
  const renderContent = () => {
    switch(activeMenu) {
      case 'beds':
        return <BedManagement />;
      case 'patients':
        return <PatientAdmission />;
      case 'equipment':
        return <EquipmentTracking />;
      case 'staff':
        return <StaffSchedule />;
      case 'transfers':
        return <TransferRequests />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile />;
      default:
        return (
          <>
            {/* Dynamic Alert Banner */}
            <div className={`alert-banner alert-${alert.level}`}>
              <span className="alert-icon">{alert.icon}</span>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-text">{alert.message}</div>
              </div>
              <button className="alert-btn" onClick={handleViewDetails}>
                VIEW DETAILS
              </button>
            </div>

            <div className="page-header">
              <h1 className="page-title">Live Patient Journey Tracker</h1>
              <div className="breadcrumb">
                Home / Dashboard / Live Tracking - {currentTime.toLocaleTimeString()}
              </div>
            </div>

            <div className="dashboard-stats">
              {stats.map((stat, index) => (
                <div key={index} className="dashboard-stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Type-specific metrics */}
            <div className="metrics-grid">
              {metrics.map((metric, index) => (
                <div 
                  key={index} 
                  className="metric-card"
                  style={{ borderLeft: `4px solid ${metric.color}` }}
                >
                  <div className="metric-icon">{metric.icon}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="icon-box">🔴</div>
                  <div>
                    <h2 className="card-title">Real-Time Patient Journey Tracker</h2>
                    <p className="card-subtitle">
                      Live tracking: General (1 day) • Emergency (4 days) • ICU (10 days)
                    </p>
                  </div>
                </div>
                <div className="card-header-right">
                  <button 
                    className={`tab-btn ${filterType === 'all' ? 'tab-btn-active' : ''}`}
                    onClick={() => setFilterType('all')}
                  >
                    All ({analytics.admittedPatients})
                  </button>
                  <button 
                    className={`tab-btn ${filterType === 'general' ? 'tab-btn-active' : ''}`}
                    onClick={() => setFilterType('general')}
                  >
                    🏨 General ({typeAnalytics.general})
                  </button>
                  <button 
                    className={`tab-btn ${filterType === 'emergency' ? 'tab-btn-active' : ''}`}
                    onClick={() => setFilterType('emergency')}
                  >
                    🚨 Emergency ({typeAnalytics.emergency})
                  </button>
                  <button 
                    className={`tab-btn ${filterType === 'icu' ? 'tab-btn-active' : ''}`}
                    onClick={() => setFilterType('icu')}
                  >
                    🏥 ICU ({typeAnalytics.icu})
                  </button>
                  <button 
                    className={`tab-btn ${autoRefresh ? 'tab-btn-active' : ''}`}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    {autoRefresh ? '🔴 Live' : '⏸️ Paused'}
                  </button>
                </div>
              </div>

              <div className="patients-grid">
                {filteredJourneys.length === 0 ? (
                  <div className="no-journeys">
                    <div className="no-journeys-icon">📋</div>
                    <div className="no-journeys-text">
                      {filterType === 'all' 
                        ? 'No active patient journeys' 
                        : `No ${filterType} patients currently`}
                    </div>
                    <div className="no-journeys-subtext">
                      Admitted patients will appear here with their live treatment progress
                    </div>
                  </div>
                ) : (
                  filteredJourneys.map((journey) => (
                    <div 
                      key={journey.id} 
                      className={`patient-card ${journey.isDelayed ? 'delayed' : ''}`}
                      style={{ borderLeft: `4px solid ${journey.patientTypeColor}` }}
                    >
                      <div className="patient-header">
                        <div>
                          <div className="patient-id">{journey.id}</div>
                          <div className="patient-name">{journey.name}</div>
                        </div>
                        <div className="header-badges">
                          <span 
                            className="type-badge" 
                            style={{ background: journey.patientTypeColor, color: 'white' }}
                          >
                            {journey.patientTypeIcon} {journey.patientType}
                          </span>
                          {journey.isDelayed && (
                            <span className="delay-badge" title={journey.delayReason}>
                              ⚠️ DELAYED
                            </span>
                          )}
                          <span className="live-badge">
                            {autoRefresh ? '🔴 LIVE' : '⏸️'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="patient-stage">
                        <span>Current Stage:</span>
                        <strong>{getStageIcon(journey.currentStage)} {journey.currentStage}</strong>
                      </div>

                      <div className="time-info">
                        <div className="time-item">
                          <span className="time-label">⏱️ Elapsed:</span>
                          <span className="time-value">{journey.timeElapsed}</span>
                        </div>
                        <div className="time-item">
                          <span className="time-label">⏳ Remaining:</span>
                          <span className="time-value">{journey.timeRemaining}</span>
                        </div>
                      </div>

                      {journey.assignedStaff && journey.assignedStaff[journey.currentStage] && (
                        <div className="assigned-staff">
                          <span className="staff-icon">👨‍⚕️</span>
                          <span className="staff-name">{journey.assignedStaff[journey.currentStage]}</span>
                        </div>
                      )}

                      <div className="stage-timeline">
                        {journey.stages.map((stage, index) => (
                          <div 
                            key={index} 
                            className={`stage-item ${stage.status}`}
                            title={`${stage.name}: ${stage.status}${stage.duration ? ` - ${stage.duration}` : ''}`}
                          >
                            <div 
                              className="stage-dot"
                              style={{ background: getStageColor(stage.status) }}
                            >
                              {stage.status === 'in-progress' && (
                                <span className="pulse-ring"></span>
                              )}
                            </div>
                            <div className="stage-label">{getStageIcon(stage.name)}</div>
                            {stage.duration && stage.status !== 'pending' && (
                              <div className="stage-duration-small">{stage.duration}</div>
                            )}
                            {index < journey.stages.length - 1 && (
                              <div 
                                className="stage-line"
                                style={{ 
                                  background: stage.status === 'completed' ? '#000000' : '#e0e0e0'
                                }}
                              ></div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${journey.isDelayed ? 'delayed-progress' : ''}`}
                          style={{ 
                            width: `${journey.progress}%`,
                            background: journey.isDelayed 
                              ? '#666666' 
                              : '#000000'
                          }}
                        />
                      </div>
                      
                      <div className="patient-footer">
                        <span>{journey.progress}% Complete</span>
                        <span>Expected: {journey.expectedDuration}</span>
                      </div>

                      {journey.alerts && journey.alerts.length > 0 && (
                        <div className="journey-alerts">
                          {journey.alerts.map((alert, idx) => (
                            <div key={idx} className={`alert-item alert-${alert.type}`}>
                              {alert.type === 'warning' && '⚠️'}
                              {alert.type === 'info' && 'ℹ️'}
                              {alert.type === 'success' && '✅'}
                              <span>{alert.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {journey.notes && (
                        <div className="journey-notes">
                          <span className="notes-icon">📝</span>
                          {journey.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Summary Statistics */}
            {typeAnalytics.delayed > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-header-left">
                    <div className="icon-box">⚠️</div>
                    <div>
                      <h2 className="card-title">Attention Required</h2>
                      <p className="card-subtitle">{typeAnalytics.delayed} patient(s) exceeding expected duration</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">M+</div>
          <div>
            <div className="brand-title">MediCare+</div>
            <div className="brand-sub">Smart Hospital System</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-section">MAIN MENU</div>
          <button 
            className={`nav-item ${activeMenu === 'dashboard' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('dashboard')}
          >
            <span>📊</span> Dashboard
          </button>
          <button 
            className={`nav-item ${activeMenu === 'beds' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('beds')}
          >
            <span>🛏️</span> Bed Management 
            <span className="badge">{analytics.totalBeds}</span>
          </button>
          <button 
            className={`nav-item ${activeMenu === 'patients' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('patients')}
          >
            <span>👥</span> Patient Admission 
            <span className="badge">{analytics.admittedPatients}</span>
          </button>
          <button 
            className={`nav-item ${activeMenu === 'equipment' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('equipment')}
          >
            <span>📦</span> Equipment Tracking
          </button>

          <div className="nav-section">OPERATIONS</div>
          <button 
            className={`nav-item ${activeMenu === 'staff' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('staff')}
          >
            <span>👨‍⚕️</span> Staff Schedule
          </button>
          <button 
            className={`nav-item ${activeMenu === 'transfers' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('transfers')}
          >
            <span>🔄</span> Transfer Requests 
            <span className="badge">{analytics.pendingTransfers}</span>
          </button>

          <div className="nav-section">SYSTEM</div>
          <button 
            className={`nav-item ${activeMenu === 'notifications' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('notifications')}
          >
            <span>🔔</span> Notifications
          </button>
          <button 
            className={`nav-item ${activeMenu === 'profile' ? 'nav-item-active' : ''}`}
            onClick={() => handleMenuClick('profile')}
          >
            <span>👤</span> My Profile
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <button 
            className="hamburger-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(!sidebarOpen);
            }}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
          </button>

          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search patients, beds, equipment, staff..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchResults && (
              <div className="search-dropdown">
                {searchResults.patients.length === 0 && 
                 searchResults.beds.length === 0 && 
                 searchResults.staff.length === 0 && 
                 searchResults.transfers.length === 0 ? (
                  <div className="search-empty">No results found for "{searchTerm}"</div>
                ) : (
                  <>
                    {searchResults.patients.length > 0 && (
                      <div className="search-section">
                        <div className="search-section-title">Patients ({searchResults.patients.length})</div>
                        {searchResults.patients.slice(0, 3).map(p => (
                          <div key={p._id} className="search-item" onClick={() => {
                            handleMenuClick('patients');
                            setSearchTerm('');
                          }}>
                            <span className="search-icon">👤</span>
                            <div>
                              <div className="search-item-title">{p.name}</div>
                              <div className="search-item-sub">{p.patientId} - {p.diagnosis}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.beds.length > 0 && (
                      <div className="search-section">
                        <div className="search-section-title">Beds ({searchResults.beds.length})</div>
                        {searchResults.beds.slice(0, 3).map(b => (
                          <div key={b._id} className="search-item" onClick={() => {
                            handleMenuClick('beds');
                            setSearchTerm('');
                          }}>
                            <span className="search-icon">🛏️</span>
                            <div>
                              <div className="search-item-title">{b.bedId} - {b.ward}</div>
                              <div className="search-item-sub">Status: {b.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.staff.length > 0 && (
                      <div className="search-section">
                        <div className="search-section-title">Staff ({searchResults.staff.length})</div>
                        {searchResults.staff.slice(0, 3).map(s => (
                          <div key={s._id} className="search-item" onClick={() => {
                            handleMenuClick('staff');
                            setSearchTerm('');
                          }}>
                            <span className="search-icon">👨‍⚕️</span>
                            <div>
                              <div className="search-item-title">{s.name}</div>
                              <div className="search-item-sub">{s.role} - {s.department}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="header-right">
            <div className="weather-icon">🌤️ 28°C</div>
            
            <div className="notification-icon" onClick={() => handleMenuClick('notifications')}>
              🔔
              <span className="notification-badge">3</span>
            </div>
            
            <div className="notification-icon cloud-icon">☁</div>
            <div className="notification-icon lightning-icon">⚡</div>
            
            <div className="user-info" onClick={() => handleMenuClick('profile')}>
              <div className="user-avatar">
                {getDisplayName().charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">Dr. {getDisplayName()}</div>
                <div className="user-role">System Manager</div>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}