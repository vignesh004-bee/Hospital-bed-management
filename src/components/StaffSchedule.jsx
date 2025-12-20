// src/components/StaffSchedule.jsx
import React, { useState, useEffect } from "react";
import API from "../api/api";
import { ActivityLogger } from "../utils/activityTracker";
import "../styles/StaffSchedule.css";

export default function StaffSchedule() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const departments = ["all", "Surgery", "Emergency", "ICU", "Pediatrics", "General", "Radiology"];
  const shifts = ["Day Shift", "Night Shift"];

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await API.get('/staff');
      setStaff(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch staff');
      console.error('Error fetching staff:', err);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: staff.length,
    onDuty: staff.filter(s => s.currentStatus === "on-duty").length,
    offDuty: staff.filter(s => s.currentStatus === "off-duty").length,
    onLeave: staff.filter(s => s.currentStatus === "on-leave").length,
  };

  const filteredStaff = staff.filter((member) => {
    const matchesDept = filterDepartment === "all" || member.department === filterDepartment;
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleAddStaff = async (formData) => {
    try {
      const response = await API.post('/staff', {
        ...formData,
        currentStatus: "off-duty"
      });
      setStaff([...staff, response.data]);
      ActivityLogger.staffAdded(formData.name);
      setShowAddModal(false);
      setError(null);
    } catch (err) {
      setError('Failed to add staff');
      console.error('Error adding staff:', err);
      alert('Failed to add staff. Please try again.');
    }
  };

  const handleAssignSchedule = async (staffId, scheduleData) => {
    try {
      const response = await API.patch(`/staff/${staffId}/schedule`, scheduleData);
      setStaff(staff.map(s => s._id === staffId ? response.data : s));
      const staffMember = staff.find(s => s._id === staffId);
      ActivityLogger.staffScheduled(staffMember.name);
      
      const weekStart = new Date(scheduleData.startDate).toLocaleDateString();
      const weekEnd = new Date(scheduleData.startDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      try {
        await API.post('/notifications', {
          type: 'staff',
          title: 'Staff Schedule Assigned',
          message: `${staffMember.name} (${staffMember.staffId}) has been assigned to ${scheduleData.shift} for the week of ${weekStart} - ${weekEnd.toLocaleDateString()}. Department: ${staffMember.department}`,
          actionRequired: false
        });
      } catch (notifErr) {
        console.error('Failed to create schedule notification:', notifErr);
      }
      
      setShowScheduleModal(false);
      setSelectedStaff(null);
      setError(null);
      alert('Schedule assigned successfully!');
    } catch (err) {
      setError('Failed to assign schedule');
      console.error('Error assigning schedule:', err);
      alert('Failed to assign schedule. Please try again.');
    }
  };

  const handleStatusChange = async (staffId, newStatus) => {
    try {
      const staffMember = staff.find(s => s._id === staffId);
      const response = await API.patch(`/staff/${staffId}/status`, {
        currentStatus: newStatus
      });
      setStaff(staff.map(s => s._id === staffId ? response.data : s));
      ActivityLogger.staffStatusChanged(staffMember.name, newStatus);
      
      if (newStatus === "on-duty") {
        try {
          await API.post('/notifications', {
            type: 'staff',
            title: 'Staff On Duty',
            message: `${staffMember.name} (${staffMember.role}) from ${staffMember.department} is now on duty${staffMember.currentShift ? ` - ${staffMember.currentShift}` : ''}`,
            actionRequired: false
          });
        } catch (notifErr) {
          console.error('Failed to create status notification:', notifErr);
        }
      } else if (newStatus === "off-duty") {
        try {
          await API.post('/notifications', {
            type: 'staff',
            title: 'Staff Off Duty',
            message: `${staffMember.name} (${staffMember.role}) from ${staffMember.department} has completed their shift and is now off duty`,
            actionRequired: false
          });
        } catch (notifErr) {
          console.error('Failed to create status notification:', notifErr);
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to update status');
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleUpdateStaff = async (staffId, formData) => {
    try {
      const response = await API.put(`/staff/${staffId}`, formData);
      setStaff(staff.map(s => s._id === staffId ? response.data : s));
      ActivityLogger.staffUpdated(formData.name);
      setShowEditModal(false);
      setSelectedStaff(null);
      setError(null);
    } catch (err) {
      setError('Failed to update staff');
      console.error('Error updating staff:', err);
      alert('Failed to update staff. Please try again.');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }
    
    try {
      await API.delete(`/staff/${staffId}`);
      setStaff(staff.filter(s => s._id !== staffId));
      setError(null);
    } catch (err) {
      setError('Failed to delete staff');
      console.error('Error deleting staff:', err);
      alert('Failed to delete staff. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "on-duty": return "#000000";
      case "off-duty": return "#666666";
      case "on-leave": return "#999999";
      default: return "#cccccc";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    return dates;
  };

  if (loading) {
    return (
      <div className="staff-schedule">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-schedule">
      <div className="staff-header">
        <div>
          <h1 className="staff-title">Staff Schedule</h1>
          <p className="staff-subtitle">Manage staff shifts, availability and assignments</p>
        </div>
        <div className="header-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
          <button className="add-staff-btn" onClick={() => setShowAddModal(true)}>
            + Add Staff
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="staff-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Staff</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.onDuty}</div>
            <div className="stat-label">On Duty</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏠</div>
          <div className="stat-info">
            <div className="stat-value">{stats.offDuty}</div>
            <div className="stat-label">Off Duty</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌴</div>
          <div className="stat-info">
            <div className="stat-value">{stats.onLeave}</div>
            <div className="stat-label">On Leave</div>
          </div>
        </div>
      </div>

      <div className="staff-filters">
        <div className="filter-left">
          <input
            type="text"
            placeholder="Search by name, ID, or role..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === "all" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="staff-grid">
        {filteredStaff.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No Staff Found</div>
            <div className="empty-text">
              {staff.length === 0 
                ? "Click 'Add Staff' to register staff members" 
                : "No staff matches your current filters"}
            </div>
          </div>
        ) : (
          filteredStaff.map((member) => (
            <div key={member._id} className={`staff-card ${member.currentStatus}`}>
              <div className="staff-card-header">
                <div className="staff-avatar">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="staff-main-info">
                  <div className="staff-name">{member.name}</div>
                  <div className="staff-id">{member.staffId}</div>
                </div>
                <span 
                  className="status-badge"
                  style={{ background: getStatusColor(member.currentStatus) }}
                >
                  {member.currentStatus}
                </span>
              </div>

              <div className="staff-card-body">
                <div className="info-row">
                  <span className="info-label">Role:</span>
                  <span className="info-value">{member.role}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Department:</span>
                  <span className="info-value">{member.department}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Specialty:</span>
                  <span className="info-value">{member.specialty}</span>
                </div>
                {member.currentShift && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Current Shift:</span>
                      <span className="info-value">{member.currentShift}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Shift Time:</span>
                      <span className="info-value">
                        {member.currentShift === "Day Shift" ? "9:00 AM - 6:00 PM" : "6:00 PM - 9:00 AM"}
                      </span>
                    </div>
                  </>
                )}
                {member.weekSchedule && (
                  <div className="info-row">
                    <span className="info-label">Week Start:</span>
                    <span className="info-value">{formatDate(member.weekSchedule.startDate)}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Contact:</span>
                  <span className="info-value">{member.contact}</span>
                </div>
              </div>

              <div className="staff-card-footer">
                <button 
                  className="action-btn primary" 
                  onClick={() => {
                    setSelectedStaff(member);
                    setShowScheduleModal(true);
                  }}
                >
                  Assign Schedule
                </button>
                <button 
                  className="action-btn" 
                  onClick={() => {
                    setSelectedStaff(member);
                    setShowEditModal(true);
                  }}
                >
                  Edit
                </button>
                {member.currentStatus === "off-duty" && (
                  <button 
                    className="action-btn" 
                    onClick={() => handleStatusChange(member._id, "on-duty")}
                  >
                    Mark On Duty
                  </button>
                )}
                {member.currentStatus === "on-duty" && (
                  <button 
                    className="action-btn" 
                    onClick={() => handleStatusChange(member._id, "off-duty")}
                  >
                    Mark Off Duty
                  </button>
                )}
                <button 
                  className="action-btn delete" 
                  onClick={() => handleDeleteStaff(member._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals - Add/Edit/Schedule (keeping same as original) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Staff Member</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  staffId: e.target.staffId.value,
                  name: e.target.name.value,
                  role: e.target.role.value,
                  department: e.target.department.value,
                  specialty: e.target.specialty.value,
                  contact: e.target.contact.value,
                };
                handleAddStaff(formData);
              }}>
                <div className="form-group">
                  <label>Staff ID *</label>
                  <input type="text" name="staffId" placeholder="e.g., ST-001" required />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="name" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role *</label>
                    <select name="role" required>
                      <option value="">Select Role</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Surgeon">Surgeon</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Technician">Technician</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select name="department" required>
                      <option value="">Select Department</option>
                      {departments.filter(d => d !== "all").map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Specialty *</label>
                  <input type="text" name="specialty" required />
                </div>
                <div className="form-group">
                  <label>Contact Number *</label>
                  <input type="tel" name="contact" required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Staff - {selectedStaff.staffId}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  name: e.target.name.value,
                  role: e.target.role.value,
                  department: e.target.department.value,
                  specialty: e.target.specialty.value,
                  contact: e.target.contact.value,
                };
                handleUpdateStaff(selectedStaff._id, formData);
              }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="name" defaultValue={selectedStaff.name} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role *</label>
                    <select name="role" defaultValue={selectedStaff.role} required>
                      <option value="Doctor">Doctor</option>
                      <option value="Surgeon">Surgeon</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Technician">Technician</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select name="department" defaultValue={selectedStaff.department} required>
                      {departments.filter(d => d !== "all").map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Specialty *</label>
                  <input type="text" name="specialty" defaultValue={selectedStaff.specialty} required />
                </div>
                <div className="form-group">
                  <label>Contact Number *</label>
                  <input type="tel" name="contact" defaultValue={selectedStaff.contact} required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Weekly Schedule - {selectedStaff.name}</h2>
              <button className="close-btn" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  shift: e.target.shift.value,
                  startDate: e.target.startDate.value,
                };
                handleAssignSchedule(selectedStaff._id, formData);
              }}>
                <div className="schedule-info">
                  <h3>Schedule Information</h3>
                  <p>📅 Staff will work the selected shift for the entire week (7 days)</p>
                  <p>☀️ Day Shift: 9:00 AM - 6:00 PM</p>
                  <p>🌙 Night Shift: 6:00 PM - 9:00 AM</p>
                </div>
                <div className="form-group">
                  <label>Week Start Date *</label>
                  <input type="date" name="startDate" defaultValue={selectedDate} required />
                </div>
                <div className="form-group">
                  <label>Shift Assignment *</label>
                  <select name="shift" required>
                    <option value="">Select Shift</option>
                    <option value="Day Shift">Day Shift (9:00 AM - 6:00 PM)</option>
                    <option value="Night Shift">Night Shift (6:00 PM - 9:00 AM)</option>
                  </select>
                </div>
                <div className="week-preview">
                  <h4>Week Schedule Preview:</h4>
                  <div className="week-days">
                    {getWeekDates(selectedDate).map((day, index) => (
                      <div key={index} className="day-badge">
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Assign Schedule
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