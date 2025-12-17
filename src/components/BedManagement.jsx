// src/components/BedManagement.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ActivityLogger } from "../utils/activityTracker";
import "../styles/BedManagement.css";

export default function BedManagement() {
  const [beds, setBeds] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [filterWard, setFilterWard] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBed, setSelectedBed] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wards = ["all", "ICU", "General", "Emergency", "Pediatric", "Surgery"];

  useEffect(() => {
    fetchBeds();
    checkOccupancy();
    // Check occupancy every 2 minutes
    const interval = setInterval(checkOccupancy, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/beds');
      setBeds(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch beds');
      console.error('Error fetching beds:', err);
      setBeds([]);
    } finally {
      setLoading(false);
    }
  };

  const checkOccupancy = async () => {
    try {
      await axios.get('http://localhost:5001/api/beds/check-occupancy');
    } catch (err) {
      console.error('Error checking occupancy:', err);
    }
  };

  const initializeBeds = async () => {
    try {
      const response = await axios.post('http://localhost:5001/api/beds/initialize');
      alert(response.data.message);
      fetchBeds();
    } catch (err) {
      console.error('Error initializing beds:', err);
      alert('Failed to initialize beds');
    }
  };

  const filteredBeds = beds.filter((bed) => {
    const matchesWard = filterWard === "all" || bed.ward === filterWard;
    const matchesSearch =
      bed.bedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bed.patient && bed.patient.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesWard && matchesSearch;
  });

  const stats = {
    total: beds.length,
    occupied: beds.filter((b) => b.status === "occupied").length,
    available: beds.filter((b) => b.status === "available").length,
    maintenance: beds.filter((b) => b.status === "maintenance").length,
  };

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
  };

  const handleStatusChange = async (bedId, newStatus) => {
    try {
      const bed = beds.find(b => b._id === bedId);
      const updateData = {
        status: newStatus,
        patient: newStatus === "available" ? null : bed?.patient,
        assignedDate: newStatus === "available" ? null : bed?.assignedDate
      };

      const response = await axios.patch(`http://localhost:5001/api/beds/${bedId}/status`, updateData);
      setBeds(beds.map((b) => b._id === bedId ? response.data : b));
      
      // Log activity based on status change
      if (newStatus === "available" && bed?.patient) {
        // Bed became available after patient discharge
        ActivityLogger.bedReleased(bed.bedId);
        
        await axios.post('http://localhost:5001/api/notifications', {
          type: 'patient',
          title: 'Bed Available',
          message: `Bed ${bed.bedId} in ${bed.ward} ward is now available after patient discharge`,
          actionRequired: false
        });
      } else if (newStatus === "maintenance") {
        // Bed sent for maintenance
        ActivityLogger.bedMaintenance(bed.bedId);
        
        await axios.post('http://localhost:5001/api/notifications', {
          type: 'equipment',
          title: 'Bed Maintenance',
          message: `Bed ${bed.bedId} in ${bed.ward} ward has been marked for maintenance`,
          actionRequired: true
        });
      } else if (newStatus === "available" && bed?.status === "maintenance") {
        // Maintenance completed
        ActivityLogger.bedMaintenanceComplete(bed.bedId);
        
        await axios.post('http://localhost:5001/api/notifications', {
          type: 'equipment',
          title: 'Maintenance Complete',
          message: `Bed ${bed.bedId} in ${bed.ward} ward maintenance completed and is now available`,
          actionRequired: false
        });
      }
      
      setSelectedBed(null);
      checkOccupancy();
    } catch (err) {
      setError('Failed to update bed status');
      console.error('Error updating bed:', err);
      alert('Failed to update bed status. Please try again.');
    }
  };

  const handleAssignBed = async (bedId, patientData) => {
    try {
      const bed = beds.find(b => b._id === bedId);
      
      // Update bed status
      const updateData = {
        status: "occupied",
        patient: patientData.name,
        assignedDate: new Date().toISOString()
      };

      const bedResponse = await axios.patch(`http://localhost:5001/api/beds/${bedId}/status`, updateData);
      setBeds(beds.map((b) => b._id === bedId ? bedResponse.data : b));

      // Create patient record
      const patientPayload = {
        ...patientData,
        bedId: bed.bedId,
        ward: bed.ward,
        admissionDate: new Date().toISOString(),
        status: "admitted"
      };

      await axios.post('http://localhost:5001/api/patients', patientPayload);

      // Log activity AFTER successful operation
      ActivityLogger.bedAssigned(bed.bedId, patientData.name);

      // Create notification
      await axios.post('http://localhost:5001/api/notifications', {
        type: 'patient',
        title: 'Patient Admitted',
        message: `${patientData.name} (${patientData.patientId}) admitted to bed ${bed.bedId} in ${bed.ward} ward`,
        actionRequired: false
      });

      setShowAssignModal(false);
      setSelectedBed(null);
      alert('Patient assigned successfully!');
      checkOccupancy();
    } catch (err) {
      setError('Failed to assign bed');
      console.error('Error assigning bed:', err);
      alert('Failed to assign bed. Please try again.');
    }
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const newBed = {
        bedId: formData.get("bedId"),
        ward: formData.get("ward"),
        floor: parseInt(formData.get("floor")),
        status: "available"
      };

      const response = await axios.post('http://localhost:5001/api/beds', newBed);
      setBeds([...beds, response.data]);
      setShowAddBedModal(false);
      setError(null);
    } catch (err) {
      setError('Failed to add bed');
      console.error('Error adding bed:', err);
      alert('Failed to add bed. Please try again.');
    }
  };

  const handleDeleteBed = async (bedId) => {
    if (!window.confirm('Are you sure you want to delete this bed?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5001/api/beds/${bedId}`);
      setBeds(beds.filter(b => b._id !== bedId));
      setError(null);
    } catch (err) {
      setError('Failed to delete bed');
      console.error('Error deleting bed:', err);
      alert('Failed to delete bed. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "occupied":
        return "#000000";
      case "available":
        return "#666666";
      case "maintenance":
        return "#999999";
      default:
        return "#cccccc";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && beds.length === 0) {
    return (
      <div className="bed-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading beds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bed-management">
      <div className="bed-header">
        <div>
          <div className="bed-title">Bed Management</div>
          <div className="bed-subtitle">Monitor and manage hospital bed allocation - Live Data</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {beds.length === 0 && (
            <button className="add-bed-btn" onClick={initializeBeds}>
              Initialize 50 Beds
            </button>
          )}
          <button className="add-bed-btn" onClick={() => setShowAddBedModal(true)}>
            + Add New Bed
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="bed-stats">
        <div className="stat-card">
          <div className="stat-icon">🛏️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Beds</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.occupied}</div>
            <div className="stat-label">Occupied</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Available</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-info">
            <div className="stat-value">{stats.maintenance}</div>
            <div className="stat-label">Maintenance</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bed-filters">
        <div className="filter-left">
          <input
            type="text"
            className="search-input"
            placeholder="Search beds or patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select className="filter-select" value={filterWard} onChange={(e) => setFilterWard(e.target.value)}>
            {wards.map((ward) => (
              <option key={ward} value={ward}>
                {ward === "all" ? "All Wards" : `${ward} Ward`}
              </option>
            ))}
          </select>
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
            ⊞ Grid
          </button>
          <button className={`view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
            ☰ List
          </button>
        </div>
      </div>

      {/* Beds Display */}
      <div className={`beds-container ${viewMode}`}>
        {filteredBeds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛏️</div>
            <div className="empty-title">No Beds Available</div>
            <div className="empty-text">
              {beds.length === 0 
                ? "Click 'Initialize 50 Beds' to create 10 beds for each ward, or add beds manually" 
                : "No beds match your current filters"}
            </div>
          </div>
        ) : (
          filteredBeds.map((bed) => (
            <div key={bed._id} className={`bed-card ${bed.status}`} onClick={() => handleBedClick(bed)}>
              <div className="bed-card-header">
                <div className="bed-id">{bed.bedId}</div>
                <div className="status-badge" style={{ background: getStatusColor(bed.status) }}>
                  {bed.status}
                </div>
              </div>
              <div className="bed-card-body">
                <div className="bed-info-row">
                  <span className="info-label">Ward:</span>
                  <span className="info-value">{bed.ward}</span>
                </div>
                <div className="bed-info-row">
                  <span className="info-label">Floor:</span>
                  <span className="info-value">Level {bed.floor}</span>
                </div>
                {bed.patient && (
                  <>
                    <div className="bed-info-row">
                      <span className="info-label">Patient:</span>
                      <span className="info-value">{bed.patient}</span>
                    </div>
                    <div className="bed-info-row">
                      <span className="info-label">Since:</span>
                      <span className="info-value">{formatDate(bed.assignedDate)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="bed-card-footer">
                {bed.status === "available" && (
                  <button
                    className="action-btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBed(bed);
                      setShowAssignModal(true);
                    }}
                  >
                    Assign Patient
                  </button>
                )}
                {bed.status === "occupied" && (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(bed._id, "available");
                    }}
                  >
                    Mark Available
                  </button>
                )}
                {bed.status === "maintenance" && (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(bed._id, "available");
                    }}
                  >
                    Complete Maintenance
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(bed._id, "maintenance");
                  }}
                >
                  Maintenance
                </button>
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBed(bed._id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Bed Modal */}
      {showAddBedModal && (
        <div className="modal-overlay" onClick={() => setShowAddBedModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Bed</h2>
              <button className="close-btn" onClick={() => setShowAddBedModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddBed}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Bed ID</label>
                  <input type="text" name="bedId" placeholder="e.g., ICU-011" required />
                </div>
                <div className="form-group">
                  <label>Ward</label>
                  <select name="ward" required>
                    <option value="">Select Ward</option>
                    <option value="ICU">ICU Ward</option>
                    <option value="General">General Ward</option>
                    <option value="Emergency">Emergency Ward</option>
                    <option value="Pediatric">Pediatric Ward</option>
                    <option value="Surgery">Surgery Ward</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Floor Level</label>
                  <input type="number" name="floor" placeholder="e.g., 1" min="1" max="20" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddBedModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal - Enhanced with full patient form */}
      {showAssignModal && selectedBed && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Patient to {selectedBed.bedId}</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const patientData = {
                patientId: e.target.patientIdInput.value,
                name: e.target.patientName.value,
                age: parseInt(e.target.age.value),
                gender: e.target.gender.value,
                contact: e.target.contact.value,
                diagnosis: e.target.diagnosis.value,
                emergencyContact: e.target.emergencyContact.value,
              };
              handleAssignBed(selectedBed._id, patientData);
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Patient ID *</label>
                  <input type="text" name="patientIdInput" placeholder="e.g., PT-2024-001" required />
                </div>
                <div className="form-group">
                  <label>Patient Name *</label>
                  <input type="text" name="patientName" placeholder="Enter patient name" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age *</label>
                    <input type="number" name="age" placeholder="Age" min="0" max="150" required />
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Contact Number *</label>
                  <input type="tel" name="contact" placeholder="Phone number" required />
                </div>
                <div className="form-group">
                  <label>Diagnosis *</label>
                  <input type="text" name="diagnosis" placeholder="Enter diagnosis" required />
                </div>
                <div className="form-group">
                  <label>Emergency Contact *</label>
                  <input type="text" name="emergencyContact" placeholder="Name - Phone" required />
                </div>
                <div className="form-group">
                  <label>Bed Assignment</label>
                  <input type="text" value={`${selectedBed.bedId} - ${selectedBed.ward} Ward`} disabled />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Assign Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}