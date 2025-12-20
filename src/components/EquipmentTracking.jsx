// src/components/EquipmentTracking.jsx
import React, { useState, useEffect } from "react";
import API from "../api/api";
import { ActivityLogger } from "../utils/activityTracker";
import "../styles/EquipmentTracking.css";

export default function EquipmentTracking() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = ["all", "Diagnostic", "Life Support", "Monitoring", "Emergency", "Surgical"];
  const statuses = ["all", "available", "in-use", "maintenance"];

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await API.get('/equipment');
      setEquipment(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch equipment');
      console.error('Error fetching equipment:', err);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: equipment.length,
    available: equipment.filter(e => e.status === "available").length,
    inUse: equipment.filter(e => e.status === "in-use").length,
    maintenance: equipment.filter(e => e.status === "maintenance").length,
  };

  const filteredEquipment = equipment.filter((eq) => {
    const matchesCategory = filterCategory === "all" || eq.category === filterCategory;
    const matchesStatus = filterStatus === "all" || eq.status === filterStatus;
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleAddEquipment = async (formData) => {
    try {
      const response = await API.post('/equipment', {
        ...formData,
        status: "available",
        lastMaintenance: new Date().toISOString(),
        assignedTo: null
      });
      setEquipment([...equipment, response.data]);
      ActivityLogger.equipmentAdded(formData.name);
      setShowAddModal(false);
      setError(null);
    } catch (err) {
      setError('Failed to add equipment');
      console.error('Error adding equipment:', err);
      alert('Failed to add equipment. Please try again.');
    }
  };

  const handleStatusChange = async (eqId, newStatus) => {
    try {
      const currentEquipment = equipment.find(e => e._id === eqId);
      let updateData = { status: newStatus };
      
      if (newStatus === "maintenance") {
        const maintenanceDate = new Date();
        updateData.lastMaintenance = maintenanceDate.toISOString();
        updateData.maintenanceStartDate = maintenanceDate.toISOString();
        ActivityLogger.equipmentMaintenance(currentEquipment.name);
        
        try {
          await API.post('/notifications', {
            type: 'equipment',
            title: 'Equipment Maintenance Started',
            message: `${currentEquipment.name} (${currentEquipment.equipmentId}) has been moved to maintenance at ${currentEquipment.location}`,
            actionRequired: false
          });
        } catch (notifErr) {
          console.error('Failed to create maintenance notification:', notifErr);
        }
      }
      
      if (newStatus === "available") {
        if (currentEquipment && currentEquipment.status === "maintenance") {
          const completionDate = new Date();
          const nextMaintenanceDate = new Date(completionDate);
          nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + 30);
          
          updateData.maintenanceCompletionDate = completionDate.toISOString();
          updateData.nextMaintenance = nextMaintenanceDate.toISOString();
          updateData.assignedTo = null;
          ActivityLogger.equipmentMaintenanceComplete(currentEquipment.name);
          
          try {
            await API.post('/notifications', {
              type: 'equipment',
              title: 'Equipment Maintenance Completed',
              message: `${currentEquipment.name} (${currentEquipment.equipmentId}) maintenance completed. Next maintenance scheduled for ${nextMaintenanceDate.toLocaleDateString()}`,
              actionRequired: false
            });
          } catch (notifErr) {
            console.error('Failed to create completion notification:', notifErr);
          }
        }
      }
      
      if (newStatus === "available" && currentEquipment?.status === "in-use") {
        updateData.assignedTo = null;
      }

      const response = await API.patch(`/equipment/${eqId}/status`, updateData);
      setEquipment(equipment.map(eq => eq._id === eqId ? response.data : eq));
      setError(null);
    } catch (err) {
      setError('Failed to update equipment status');
      console.error('Error updating status:', err);
      alert('Failed to update equipment status. Please try again.');
    }
  };

  const handleAssignEquipment = async (eqId, assignedTo) => {
    try {
      const currentEquipment = equipment.find(e => e._id === eqId);
      const response = await API.patch(`/equipment/${eqId}/assign`, {
        assignedTo,
        status: "in-use"
      });
      setEquipment(equipment.map(eq => eq._id === eqId ? response.data : eq));
      ActivityLogger.equipmentAssigned(currentEquipment.name);
      setError(null);
    } catch (err) {
      setError('Failed to assign equipment');
      console.error('Error assigning equipment:', err);
      alert('Failed to assign equipment. Please try again.');
    }
  };

  const handleUpdateEquipment = async (eqId, formData) => {
    try {
      const response = await API.put(`/equipment/${eqId}`, formData);
      setEquipment(equipment.map(eq => eq._id === eqId ? response.data : eq));
      setShowEditModal(false);
      setSelectedEquipment(null);
      setError(null);
    } catch (err) {
      setError('Failed to update equipment');
      console.error('Error updating equipment:', err);
      alert('Failed to update equipment. Please try again.');
    }
  };

  const handleDeleteEquipment = async (eqId) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) {
      return;
    }
    
    try {
      await API.delete(`/equipment/${eqId}`);
      setEquipment(equipment.filter(eq => eq._id !== eqId));
      setError(null);
    } catch (err) {
      setError('Failed to delete equipment');
      console.error('Error deleting equipment:', err);
      alert('Failed to delete equipment. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "available": return "#666666";
      case "in-use": return "#000000";
      case "maintenance": return "#999999";
      default: return "#cccccc";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="equipment-tracking">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="equipment-tracking">
      <div className="equipment-header">
        <div>
          <h1 className="equipment-title">Equipment Tracking</h1>
          <p className="equipment-subtitle">Monitor and manage medical equipment inventory</p>
        </div>
        <button className="add-equipment-btn" onClick={() => setShowAddModal(true)}>
          + Add Equipment
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="equipment-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Equipment</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Available</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-info">
            <div className="stat-value">{stats.inUse}</div>
            <div className="stat-label">In Use</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.maintenance}</div>
            <div className="stat-label">Maintenance</div>
          </div>
        </div>
      </div>

      <div className="equipment-filters">
        <div className="filter-left">
          <input
            type="text"
            placeholder="Search by name, ID, or location..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === "all" ? "All Status" : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="equipment-grid">
        {filteredEquipment.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No Equipment Found</div>
            <div className="empty-text">
              {equipment.length === 0 
                ? "Click 'Add Equipment' to start tracking your medical equipment" 
                : "No equipment matches your current filters"}
            </div>
          </div>
        ) : (
          filteredEquipment.map((eq) => (
            <div key={eq._id} className={`equipment-card ${eq.status}`}>
              <div className="equipment-card-header">
                <div className="equipment-id">{eq.equipmentId}</div>
                <span 
                  className="status-badge"
                  style={{ background: getStatusColor(eq.status) }}
                >
                  {eq.status}
                </span>
              </div>

              <div className="equipment-card-body">
                <h3 className="equipment-name">{eq.name}</h3>
                <div className="equipment-info">
                  <div className="info-row">
                    <span className="info-label">Category:</span>
                    <span className="info-value">{eq.category}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Location:</span>
                    <span className="info-value">{eq.location}</span>
                  </div>
                  {eq.assignedTo && (
                    <div className="info-row">
                      <span className="info-label">Assigned To:</span>
                      <span className="info-value">{eq.assignedTo}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Last Maintenance:</span>
                    <span className="info-value">{formatDate(eq.lastMaintenance)}</span>
                  </div>
                  {eq.maintenanceStartDate && eq.status === "maintenance" && (
                    <div className="info-row">
                      <span className="info-label">Maintenance Started:</span>
                      <span className="info-value">{formatDate(eq.maintenanceStartDate)}</span>
                    </div>
                  )}
                  {eq.maintenanceCompletionDate && (
                    <div className="info-row">
                      <span className="info-label">Last Completed:</span>
                      <span className="info-value">{formatDate(eq.maintenanceCompletionDate)}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Next Maintenance:</span>
                    <span className="info-value">{formatDate(eq.nextMaintenance)}</span>
                  </div>
                </div>
              </div>

              <div className="equipment-card-footer">
                {eq.status === "available" && (
                  <>
                    <button className="action-btn primary" onClick={() => {
                      const assignTo = prompt('Assign to (Patient ID or Name):');
                      if (assignTo) handleAssignEquipment(eq._id, assignTo);
                    }}>
                      Assign
                    </button>
                    <button className="action-btn" onClick={() => handleStatusChange(eq._id, "maintenance")}>
                      Maintenance
                    </button>
                  </>
                )}
                {eq.status === "in-use" && (
                  <>
                    <button className="action-btn" onClick={() => handleStatusChange(eq._id, "available")}>
                      Release
                    </button>
                    <button className="action-btn" onClick={() => handleStatusChange(eq._id, "maintenance")}>
                      Maintenance
                    </button>
                  </>
                )}
                {eq.status === "maintenance" && (
                  <button className="action-btn primary" onClick={() => handleStatusChange(eq._id, "available")}>
                    Complete Maintenance
                  </button>
                )}
                <button className="action-btn" onClick={() => {
                  setSelectedEquipment(eq);
                  setShowEditModal(true);
                }}>
                  Edit
                </button>
                <button className="action-btn delete" onClick={() => handleDeleteEquipment(eq._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add & Edit Modals - keeping same as original */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Equipment</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const nextMaintenanceDate = new Date();
                nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + 30);
                
                const formData = {
                  equipmentId: e.target.equipmentId.value,
                  name: e.target.name.value,
                  category: e.target.category.value,
                  location: e.target.location.value,
                  nextMaintenance: nextMaintenanceDate.toISOString(),
                };
                handleAddEquipment(formData);
              }}>
                <div className="form-group">
                  <label>Equipment ID *</label>
                  <input type="text" name="equipmentId" placeholder="e.g., EQ-001" required />
                </div>
                <div className="form-group">
                  <label>Equipment Name *</label>
                  <input type="text" name="name" placeholder="e.g., X-Ray Machine" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select name="category" required>
                      <option value="">Select Category</option>
                      {categories.filter(c => c !== "all").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location *</label>
                    <input type="text" name="location" placeholder="e.g., Radiology Room 1" required />
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                  * Next maintenance will be automatically set to 30 days from now
                </p>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Equipment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedEquipment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Equipment - {selectedEquipment.equipmentId}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  name: e.target.name.value,
                  category: e.target.category.value,
                  location: e.target.location.value,
                };
                handleUpdateEquipment(selectedEquipment._id, formData);
              }}>
                <div className="form-group">
                  <label>Equipment Name *</label>
                  <input type="text" name="name" defaultValue={selectedEquipment.name} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select name="category" defaultValue={selectedEquipment.category} required>
                      {categories.filter(c => c !== "all").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location *</label>
                    <input type="text" name="location" defaultValue={selectedEquipment.location} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Equipment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}