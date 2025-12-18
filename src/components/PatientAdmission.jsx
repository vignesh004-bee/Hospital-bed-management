// src/components/PatientAdmission.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useData } from "../context/DataContext";
import { ActivityLogger } from "../utils/activityTracker";
import "../styles/PatientAdmission.css";

export default function PatientAdmission() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [error, setError] = useState(null);

  // Use shared data context
  const { patients, setPatients, fetchPatients, fetchBeds } = useData();

  // Fetch available beds
  useEffect(() => {
    fetchAvailableBeds();
  }, []);

  const fetchAvailableBeds = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/beds');
      const available = response.data.filter(bed => bed.status === 'available');
      setAvailableBeds(available);
    } catch (err) {
      console.error('Error fetching beds:', err);
    }
  };

  const stats = {
    total: patients.length,
    admitted: patients.filter(p => p.status === "admitted").length,
    discharged: patients.filter(p => p.status === "discharged").length,
    emergency: patients.filter(p => p.ward === "ICU").length,
  };

  const filteredPatients = patients.filter((patient) => {
    const matchesStatus = filterStatus === "all" || patient.status === filterStatus;
    const matchesSearch = 
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // CREATE - Add new patient
  const handleAddPatient = async (formData) => {
    try {
      const response = await axios.post('http://localhost:5001/api/patients', {
        ...formData,
        admissionDate: new Date().toISOString(),
        status: "admitted"
      });
      
      // Update context immediately
      setPatients([...patients, response.data]);
      
      ActivityLogger.patientAdded(formData.name);

      // Update bed status if assigned
      if (formData.bedId) {
        try {
          const bedsResponse = await axios.get('http://localhost:5001/api/beds');
          const bed = bedsResponse.data.find(b => b.bedId === formData.bedId);
          
          if (bed) {
            await axios.patch(`http://localhost:5001/api/beds/${bed._id}/status`, {
              status: "occupied",
              patient: formData.name,
              assignedDate: new Date().toISOString()
            });

            // Refresh beds in context
            fetchBeds();

            await axios.post('http://localhost:5001/api/notifications', {
              type: 'patient',
              title: 'Patient Admitted',
              message: `${formData.name} (${formData.patientId}) admitted to bed ${formData.bedId} in ${formData.ward} ward`,
              actionRequired: false
            });
          }
        } catch (bedErr) {
          console.error('Error updating bed:', bedErr);
        }
      } else {
        await axios.post('http://localhost:5001/api/notifications', {
          type: 'patient',
          title: 'Patient Admitted',
          message: `${formData.name} (${formData.patientId}) admitted without bed assignment`,
          actionRequired: true
        });
      }

      setShowAddModal(false);
      setError(null);
      fetchAvailableBeds();
    } catch (err) {
      setError('Failed to add patient');
      console.error('Error adding patient:', err);
      alert('Failed to add patient. Please try again.');
    }
  };

  // UPDATE - Edit patient details
  const handleUpdatePatient = async (patientId, formData) => {
    try {
      const oldPatient = patients.find(p => p._id === patientId);
      const response = await axios.put(`http://localhost:5001/api/patients/${patientId}`, formData);
      
      // Update context immediately
      setPatients(patients.map(p => p._id === patientId ? response.data : p));

      ActivityLogger.patientUpdated(formData.name);

      // Update bed assignments if changed
      if (oldPatient.bedId !== formData.bedId) {
        if (oldPatient.bedId) {
          try {
            const bedsResponse = await axios.get('http://localhost:5001/api/beds');
            const oldBed = bedsResponse.data.find(b => b.bedId === oldPatient.bedId);
            if (oldBed) {
              await axios.patch(`http://localhost:5001/api/beds/${oldBed._id}/status`, {
                status: "available",
                patient: null,
                assignedDate: null
              });
            }
          } catch (err) {
            console.error('Error freeing old bed:', err);
          }
        }

        if (formData.bedId) {
          try {
            const bedsResponse = await axios.get('http://localhost:5001/api/beds');
            const newBed = bedsResponse.data.find(b => b.bedId === formData.bedId);
            if (newBed) {
              await axios.patch(`http://localhost:5001/api/beds/${newBed._id}/status`, {
                status: "occupied",
                patient: formData.name,
                assignedDate: new Date().toISOString()
              });
            }
          } catch (err) {
            console.error('Error occupying new bed:', err);
          }
        }

        // Refresh beds in context
        fetchBeds();
        fetchAvailableBeds();
      }

      setShowEditModal(false);
      setSelectedPatient(null);
      setError(null);
    } catch (err) {
      setError('Failed to update patient');
      console.error('Error updating patient:', err);
      alert('Failed to update patient. Please try again.');
    }
  };

  // CREATE TRANSFER REQUEST
  const handleCreateTransferRequest = async (formData) => {
    try {
      const transferData = {
        patientId: selectedPatient._id,
        patientName: selectedPatient.name,
        patientIdNumber: selectedPatient.patientId,
        fromWard: selectedPatient.ward || "Not Assigned",
        fromBed: selectedPatient.bedId || "Not Assigned",
        toWard: formData.toWard,
        toBed: formData.toBed,
        reason: formData.reason,
        priority: formData.priority,
        requestedBy: "Admin",
        notes: formData.notes || ""
      };

      const response = await axios.post('http://localhost:5001/api/transfers', transferData);

      ActivityLogger.transferRequested(selectedPatient.name);

      try {
        await axios.post('http://localhost:5001/api/notifications', {
          type: 'transfer',
          title: 'New Transfer Request',
          message: `Transfer request for ${selectedPatient.name} from ${selectedPatient.ward || 'Not Assigned'} to ${formData.toWard}`,
          relatedId: response.data._id,
          relatedType: 'transfer',
          actionRequired: true
        });
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }

      setShowTransferModal(false);
      setSelectedPatient(null);
      alert('Transfer request created successfully! Check the Notifications page.');
      setError(null);
    } catch (err) {
      console.error('Full error:', err);
      setError('Failed to create transfer request');
      alert(`Failed to create transfer request: ${err.response?.data?.message || err.message}`);
    }
  };

  // DELETE - Discharge patient
  const handleDischarge = async (patientId) => {
    const patient = patients.find(p => p._id === patientId);
    
    if (!window.confirm(`Are you sure you want to discharge ${patient.name}? This will free up bed ${patient.bedId || 'N/A'}.`)) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5001/api/patients/${patientId}`);
      
      // Update context immediately
      setPatients(patients.filter(p => p._id !== patientId));

      ActivityLogger.patientDischarged(patient.name);

      // Free up bed if assigned
      if (patient.bedId) {
        try {
          const bedsResponse = await axios.get('http://localhost:5001/api/beds');
          const bed = bedsResponse.data.find(b => b.bedId === patient.bedId);
          
          if (bed) {
            await axios.patch(`http://localhost:5001/api/beds/${bed._id}/status`, {
              status: "available",
              patient: null,
              assignedDate: null
            });

            // Refresh beds in context
            fetchBeds();

            await axios.post('http://localhost:5001/api/notifications', {
              type: 'patient',
              title: 'Patient Discharged - Bed Available',
              message: `${patient.name} (${patient.patientId}) discharged. Bed ${patient.bedId} in ${patient.ward} ward is now available`,
              actionRequired: false
            });
          }
        } catch (bedErr) {
          console.error('Error updating bed:', bedErr);
        }
      } else {
        await axios.post('http://localhost:5001/api/notifications', {
          type: 'patient',
          title: 'Patient Discharged',
          message: `${patient.name} (${patient.patientId}) has been discharged from the hospital`,
          actionRequired: false
        });
      }

      setSelectedPatient(null);
      setError(null);
      fetchAvailableBeds();
    } catch (err) {
      setError('Failed to discharge patient');
      console.error('Error discharging patient:', err);
      alert('Failed to discharge patient. Please try again.');
    }
  };

  return (
    <div className="patient-admission">
      <div className="admission-header">
        <div>
          <h1 className="admission-title">Patient Admission</h1>
          <p className="admission-subtitle">Manage patient admissions, records and discharges</p>
        </div>
        <button className="add-patient-btn" onClick={() => setShowAddModal(true)}>
          + Add New Patient
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="admission-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Patients</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.admitted}</div>
            <div className="stat-label">Currently Admitted</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.discharged}</div>
            <div className="stat-label">Discharged</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <div className="stat-value">{stats.emergency}</div>
            <div className="stat-label">In ICU</div>
          </div>
        </div>
      </div>

      <div className="admission-filters">
        <div className="filter-left">
          <input
            type="text"
            placeholder="Search by name, ID, or diagnosis..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            ☰ List
          </button>
          <button 
            className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            ⊞ Grid
          </button>
        </div>
      </div>

      <div className={`patients-container ${viewMode}`}>
        {filteredPatients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No Patients Found</div>
            <div className="empty-text">
              {patients.length === 0 
                ? "Click 'Add New Patient' to register a patient" 
                : "No patients match your current filters"}
            </div>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div 
              key={patient._id} 
              className={`patient-card ${patient.status}`}
              onClick={() => setSelectedPatient(patient)}
            >
              <div className="patient-card-header">
                <div className="patient-main-info">
                  <div className="patient-avatar">
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="patient-name">{patient.name}</div>
                    <div className="patient-id">{patient.patientId}</div>
                  </div>
                </div>
                <span className={`status-badge ${patient.status}`}>
                  {patient.status}
                </span>
              </div>

              <div className="patient-card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Age</span>
                    <span className="info-value">{patient.age} years</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Gender</span>
                    <span className="info-value">{patient.gender}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Contact</span>
                    <span className="info-value">{patient.contact}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Admission Date</span>
                    <span className="info-value">
                      {new Date(patient.admissionDate).toLocaleDateString()}
                    </span>
                  </div>
                  {patient.bedId && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Bed</span>
                        <span className="info-value">{patient.bedId}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Ward</span>
                        <span className="info-value">{patient.ward}</span>
                      </div>
                    </>
                  )}
                  <div className="info-item full-width">
                    <span className="info-label">Diagnosis</span>
                    <span className="info-value">{patient.diagnosis}</span>
                  </div>
                </div>
              </div>

              <div className="patient-card-footer">
                {patient.status === "admitted" && (
                  <>
                    <button className="action-btn" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(patient);
                      setShowEditModal(true);
                    }}>
                      Edit
                    </button>
                    <button className="action-btn" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(patient);
                      setShowTransferModal(true);
                    }}>
                      Transfer
                    </button>
                    <button className="action-btn primary" onClick={(e) => {
                      e.stopPropagation();
                      handleDischarge(patient._id);
                    }}>
                      Discharge
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Patient</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  patientId: e.target.patientId.value,
                  name: e.target.name.value,
                  age: parseInt(e.target.age.value),
                  gender: e.target.gender.value,
                  contact: e.target.contact.value,
                  diagnosis: e.target.diagnosis.value,
                  bedId: e.target.bedId.value || null,
                  ward: e.target.ward.value || null,
                  emergencyContact: e.target.emergencyContact.value,
                };
                handleAddPatient(formData);
              }}>
                <div className="form-group">
                  <label>Patient ID *</label>
                  <input type="text" name="patientId" placeholder="e.g., PT-2024-001" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="name" required />
                  </div>
                  <div className="form-group">
                    <label>Age *</label>
                    <input type="number" name="age" min="0" max="150" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" required>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input type="tel" name="contact" required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Diagnosis *</label>
                  <input type="text" name="diagnosis" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ward</label>
                    <select name="ward">
                      <option value="">Select Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="General">General</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Pediatric">Pediatric</option>
                      <option value="Surgery">Surgery</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Available Bed ({availableBeds.length} available)</label>
                    <select name="bedId">
                      <option value="">Select Bed (Optional)</option>
                      {availableBeds.map(bed => (
                        <option key={bed._id} value={bed.bedId}>
                          {bed.bedId} - {bed.ward} Ward (Floor {bed.floor})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Emergency Contact *</label>
                  <input type="text" name="emergencyContact" required placeholder="Name - Phone" />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Patient - {selectedPatient.patientId}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  name: e.target.name.value,
                  age: parseInt(e.target.age.value),
                  gender: e.target.gender.value,
                  contact: e.target.contact.value,
                  diagnosis: e.target.diagnosis.value,
                  bedId: e.target.bedId.value || null,
                  ward: e.target.ward.value || null,
                  emergencyContact: e.target.emergencyContact.value,
                };
                handleUpdatePatient(selectedPatient._id, formData);
              }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="name" defaultValue={selectedPatient.name} required />
                  </div>
                  <div className="form-group">
                    <label>Age *</label>
                    <input type="number" name="age" defaultValue={selectedPatient.age} min="0" max="150" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" defaultValue={selectedPatient.gender} required>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input type="tel" name="contact" defaultValue={selectedPatient.contact} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Diagnosis *</label>
                  <input type="text" name="diagnosis" defaultValue={selectedPatient.diagnosis} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ward</label>
                    <select name="ward" defaultValue={selectedPatient.ward || ''}>
                      <option value="">Select Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="General">General</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Pediatric">Pediatric</option>
                      <option value="Surgery">Surgery</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Available Bed</label>
                    <select name="bedId" defaultValue={selectedPatient.bedId || ''}>
                      <option value="">No Bed</option>
                      {selectedPatient.bedId && (
                        <option value={selectedPatient.bedId}>{selectedPatient.bedId} (Current)</option>
                      )}
                      {availableBeds.map(bed => (
                        <option key={bed._id} value={bed.bedId}>
                          {bed.bedId} - {bed.ward} Ward (Floor {bed.floor})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Emergency Contact *</label>
                  <input type="text" name="emergencyContact" defaultValue={selectedPatient.emergencyContact} required />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transfer Patient - {selectedPatient.name}</h2>
              <button className="close-btn" onClick={() => setShowTransferModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="transfer-info">
                <h3>Current Location</h3>
                <p><strong>Ward:</strong> {selectedPatient.ward || 'Not assigned'}</p>
                <p><strong>Bed:</strong> {selectedPatient.bedId || 'Not assigned'}</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  toWard: e.target.toWard.value,
                  toBed: e.target.toBed.value,
                  reason: e.target.reason.value,
                  priority: e.target.priority.value,
                  notes: e.target.notes.value,
                };
                handleCreateTransferRequest(formData);
              }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Transfer To Ward *</label>
                    <select name="toWard" required>
                      <option value="">Select Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="General">General</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Pediatric">Pediatric</option>
                      <option value="Surgery">Surgery</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Transfer To Bed *</label>
                    <input type="text" name="toBed" placeholder="e.g., B-201" required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Transfer Reason *</label>
                  <input type="text" name="reason" placeholder="Enter reason for transfer" required />
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select name="priority" required>
                    <option value="">Select Priority</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea name="notes" rows="3" placeholder="Any additional information..."></textarea>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowTransferModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Transfer Request
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