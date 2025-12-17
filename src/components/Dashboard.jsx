// src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
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
  
  // Real-time data states
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh && activeMenu === 'dashboard') {
      const interval = setInterval(() => {
        fetchAllData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, activeMenu]);

  const fetchAllData = async () => {
    try {
      const [bedsRes, patientsRes, staffRes, transfersRes] = await Promise.all([
        axios.get('http://localhost:5001/api/beds'),
        axios.get('http://localhost:5001/api/patients'),
        axios.get('http://localhost:5001/api/staff'),
        axios.get('http://localhost:5001/api/transfers')
      ]);

      setBeds(bedsRes.data || []);
      setPatients(patientsRes.data || []);
      setStaff(staffRes.data || []);
      setTransfers(transfersRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

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
    avgStayDays: 3.5 // This could be calculated from patient admission dates
  };

  // Calculate time remaining
  const calculateTimeRemaining = (estimatedCompletion) => {
    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const diffMs = completion - now;
    
    if (diffMs <= 0) return "Completed";
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 24) {
      const days = Math.floor(diffHrs / 24);
      return `${days}d ${diffHrs % 24}h remaining`;
    }
    return `${diffHrs}h ${diffMins}m remaining`;
  };

  // Get stage icon
  const getStageIcon = (stage) => {
    switch(stage) {
      case "Admission": return "📋";
      case "Tests": return "🔬";
      case "Surgery": return "🏥";
      case "Recovery": return "💊";
      case "Discharge": return "✅";
      default: return "📍";
    }
  };

  // Get stage color
  const getStageColor = (status) => {
    switch(status) {
      case "completed": return "#000000";
      case "in-progress": return "#666666";
      case "pending": return "#cccccc";
      default: return "#e5e5e5";
    }
  };

  // Transform real patients into journey format
  const getActiveJourneys = () => {
    return patients
      .filter(p => p.status === "admitted")
      .map(patient => {
        // Calculate journey progress based on admission date
        const admissionDate = new Date(patient.admissionDate);
        const now = new Date();
        const daysSinceAdmission = Math.floor((now - admissionDate) / (1000 * 60 * 60 * 24));
        
        // Determine current stage based on days
        let currentStage = "Admission";
        let progress = 10;
        const stages = [
          { name: "Admission", status: "completed", duration: "45m" },
          { name: "Tests", status: "pending", duration: "" },
          { name: "Surgery", status: "pending", duration: "" },
          { name: "Recovery", status: "pending", duration: "" },
          { name: "Discharge", status: "pending", duration: "" }
        ];

        if (daysSinceAdmission >= 0) {
          stages[0].status = "completed";
          progress = 20;
        }
        if (daysSinceAdmission >= 1) {
          stages[1].status = "in-progress";
          stages[1].duration = "2h 15m";
          currentStage = "Tests";
          progress = 40;
        }
        if (daysSinceAdmission >= 2) {
          stages[1].status = "completed";
          stages[2].status = "in-progress";
          stages[2].duration = "3h 30m";
          currentStage = "Surgery";
          progress = 60;
        }
        if (daysSinceAdmission >= 3) {
          stages[2].status = "completed";
          stages[3].status = "in-progress";
          stages[3].duration = "1d 2h";
          currentStage = "Recovery";
          progress = 85;
        }
        if (daysSinceAdmission >= 4) {
          stages[3].status = "completed";
          stages[4].status = "in-progress";
          currentStage = "Discharge";
          progress = 95;
        }

        // Get assigned staff from database
        const assignedStaff = {};
        const wardStaff = staff.filter(s => 
          s.department === patient.ward && s.currentStatus === "on-duty"
        );
        
        if (wardStaff.length > 0) {
          const randomStaff = wardStaff[Math.floor(Math.random() * wardStaff.length)];
          assignedStaff[currentStage] = randomStaff.name;
        }

        // Calculate estimated completion (5 days from admission)
        const estimatedCompletion = new Date(admissionDate);
        estimatedCompletion.setDate(estimatedCompletion.getDate() + 5);

        return {
          id: patient.patientId,
          name: patient.name,
          currentStage,
          progress,
          stages,
          assignedStaff,
          estimatedCompletion: estimatedCompletion.toISOString(),
          isDelayed: daysSinceAdmission > 5,
          delayReason: daysSinceAdmission > 5 ? "Extended recovery period" : null,
          alerts: daysSinceAdmission > 5 ? [{
            type: 'warning',
            message: 'Patient stay exceeds expected duration'
          }] : [],
          notes: `${patient.diagnosis} - Ward: ${patient.ward || 'Not assigned'}`
        };
      });
  };

  const activeJourneys = getActiveJourneys();

  // Stats for display
  const stats = [
    { value: analytics.totalBeds, label: "Total Beds" },
    { value: analytics.admittedPatients, label: "Active Patients" },
    { value: analytics.onDutyStaff, label: "Staff On Duty" },
    { value: `${analytics.occupancyRate}%`, label: "Bed Occupancy" }
  ];

  const metrics = [
    { value: `${analytics.avgStayDays} days`, label: "Avg Stay Duration", icon: "⏱️" },
    { value: "94%", label: "Patient Satisfaction", icon: "😊" },
    { value: analytics.admittedPatients, label: "Active Cases", icon: "📋" },
    { value: analytics.totalPatients, label: "Total Patients", icon: "👥" }
  ];

  // Generate dynamic alert based on real data
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
              <div>
                <div className="alert-title">{alert.title}</div>
                <div className="alert-text">{alert.message}</div>
              </div>
              <button className="alert-btn" onClick={handleViewDetails}>
                VIEW DETAILS
              </button>
            </div>

            {/* Page Title */}
            <div className="page-header">
              <h1 className="page-title">Dashboard Overview</h1>
              <div className="breadcrumb">
                Home / Dashboard / Real-Time Monitoring
              </div>
            </div>

            {/* Live Stats Grid */}
            <div className="dashboard-stats">
              {stats.map((stat, index) => (
                <div key={index} className="dashboard-stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Journey Tracker Section */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="icon-box">📊</div>
                  <div>
                    <h2 className="card-title">Real-Time Patient Journey Tracker</h2>
                    <p className="card-subtitle">
                      Visual timeline of patient progress from admission to discharge with live updates
                    </p>
                  </div>
                </div>
                <div className="card-header-right">
                  <button className="tab-btn">Active Journeys ({analytics.admittedPatients})</button>
                  <button 
                    className={`tab-btn ${autoRefresh ? 'tab-btn-active' : ''}`}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    {autoRefresh ? '🔴 Live' : '⏸️ Paused'}
                  </button>
                </div>
              </div>

              <div className="patients-grid">
                {activeJourneys.length === 0 ? (
                  <div className="no-journeys">
                    <div className="no-journeys-icon">📋</div>
                    <div className="no-journeys-text">No active patient journeys</div>
                    <div className="no-journeys-subtext">Admitted patients will appear here with their treatment progress</div>
                  </div>
                ) : (
                  activeJourneys.map((journey) => (
                    <div key={journey.id} className={`patient-card ${journey.isDelayed ? 'delayed' : ''}`}>
                      <div className="patient-header">
                        <div>
                          <div className="patient-id">{journey.id}</div>
                          <div className="patient-name">{journey.name}</div>
                        </div>
                        <div className="header-badges">
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

                      {/* Staff Assignment */}
                      {journey.assignedStaff && journey.assignedStaff[journey.currentStage] && (
                        <div className="assigned-staff">
                          <span className="staff-icon">👨‍⚕️</span>
                          <span className="staff-name">{journey.assignedStaff[journey.currentStage]}</span>
                        </div>
                      )}

                      {/* Stage Timeline */}
                      <div className="stage-timeline">
                        {journey.stages.map((stage, index) => (
                          <div 
                            key={index} 
                            className={`stage-item ${stage.status} ${stage.isDelayed ? 'stage-delayed' : ''}`}
                            title={`${stage.name}: ${stage.status}${stage.assignedStaff ? ` - ${stage.assignedStaff}` : ''}`}
                          >
                            <div 
                              className="stage-dot"
                              style={{ background: getStageColor(stage.status) }}
                            >
                              {stage.status === 'in-progress' && (
                                <span className="pulse-ring"></span>
                              )}
                              {stage.isDelayed && (
                                <span className="delay-indicator">⚠️</span>
                              )}
                            </div>
                            <div className="stage-label">{getStageIcon(stage.name)}</div>
                            {stage.duration && (
                              <div className="stage-duration-small">{stage.duration}</div>
                            )}
                            {index < journey.stages.length - 1 && (
                              <div 
                                className="stage-line"
                                style={{ 
                                  background: stage.status === 'completed' ? '#000000' : '#e5e5e5'
                                }}
                              ></div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${journey.isDelayed ? 'delayed-progress' : ''}`}
                          style={{ width: `${journey.progress}%` }}
                        />
                      </div>
                      
                      <div className="patient-footer">
                        <span>{journey.progress}% Complete</span>
                        <span>{calculateTimeRemaining(journey.estimatedCompletion)}</span>
                      </div>

                      {/* Alerts */}
                      {journey.alerts && journey.alerts.length > 0 && (
                        <div className="journey-alerts">
                          {journey.alerts.slice(0, 2).map((alert, idx) => (
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

            {/* Metrics Grid */}
            <div className="metrics-grid">
              {metrics.map((metric, index) => (
                <div key={index} className="metric-card">
                  <div className="metric-icon">{metric.icon}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
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
      {/* Sidebar */}
      <aside className="sidebar">
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

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search patients, beds, equipment, staff..."
              className="search-input"
            />
          </div>

          <div className="header-right">
            <div className="weather-icon">🌤️ 28°C</div>
            
            <div className="notification-icon" onClick={() => handleMenuClick('notifications')}>
              🔔
              <span className="notification-badge">3</span>
            </div>
            
            <div className="notification-icon">☁</div>
            <div className="notification-icon">⚡</div>
            
            <div className="user-info" onClick={() => handleMenuClick('profile')}>
              <div className="user-avatar">
                {getDisplayName().charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="user-name">Dr. {getDisplayName()}</div>
                <div className="user-role">System Manager</div>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        {renderContent()}
      </main>
    </div>
  );
}