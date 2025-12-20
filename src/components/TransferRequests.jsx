// src/components/TransferRequests.jsx - WITH REAL-TIME UPDATES
import React, { useState, useEffect } from "react";
import API from "../api/api";
import { useData } from "../context/DataContext";
import { ActivityLogger } from "../utils/activityTracker";
import "../styles/TransferRequests.css";

export default function TransferRequests() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Use shared context for real-time patient updates
  const { patients, setPatients, beds, setBeds } = useData();

  useEffect(() => {
    fetchTransferRequests();
  }, []);

  const fetchTransferRequests = async () => {
    try {
      setLoading(true);
      const response = await API.get('/transfers');
      setRequests(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch transfer requests');
      console.error('Error fetching transfers:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    inProgress: requests.filter(r => r.status === "in-progress").length,
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;
    const matchesPriority = filterPriority === "all" || req.priority === filterPriority;
    const matchesSearch = 
      req.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.patientIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const handleApprove = async (requestId) => {
    try {
      const request = requests.find(r => r._id === requestId);
      const response = await API.patch(`/transfers/${requestId}/approve`, {
        approvedBy: "Admin"
      });
      
      // ✅ Update requests immediately
      setRequests(requests.map(r => r._id === requestId ? response.data : r));
      
      ActivityLogger.transferApproved(request.patientName);
      setError(null);
      alert('Transfer request approved successfully!');
    } catch (err) {
      setError('Failed to approve transfer');
      console.error('Error approving transfer:', err);
      alert('Failed to approve transfer. Please try again.');
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this transfer request?')) {
      return;
    }
    
    try {
      const request = requests.find(r => r._id === requestId);
      const response = await API.patch(`/transfers/${requestId}/reject`);
      
      // ✅ Update requests immediately
      setRequests(requests.map(r => r._id === requestId ? response.data : r));
      
      ActivityLogger.transferRejected(request.patientName);
      setError(null);
      alert('Transfer request rejected.');
    } catch (err) {
      setError('Failed to reject transfer');
      console.error('Error rejecting transfer:', err);
      alert('Failed to reject transfer. Please try again.');
    }
  };

  const handleStartTransfer = async (requestId) => {
    try {
      const response = await API.patch(`/transfers/${requestId}/start`);
      
      // ✅ Update requests immediately
      setRequests(requests.map(r => r._id === requestId ? response.data : r));
      
      setError(null);
    } catch (err) {
      setError('Failed to start transfer');
      console.error('Error starting transfer:', err);
      alert('Failed to start transfer. Please try again.');
    }
  };

  const handleCompleteTransfer = async (requestId) => {
    try {
      const request = requests.find(r => r._id === requestId);
      const response = await API.patch(`/transfers/${requestId}/complete`);
      
      // ✅ Update requests immediately
      setRequests(requests.map(r => r._id === requestId ? response.data : r));
      
      ActivityLogger.transferCompleted(request.patientName);

      // ✅ Update patient in context with new ward/bed info
      try {
        const patientResponse = await API.get(`/patients`);
        const updatedPatient = patientResponse.data.find(p => p.patientId === request.patientIdNumber);
        
        if (updatedPatient) {
          setPatients(patients.map(p => 
            p.patientId === request.patientIdNumber ? updatedPatient : p
          ));
        }
      } catch (patientErr) {
        console.error('Error fetching updated patient:', patientErr);
      }

      // ✅ Update beds in context
      try {
        // Free old bed
        const oldBed = beds.find(b => b.bedId === request.fromBed);
        if (oldBed) {
          const oldBedResponse = await API.patch(`/beds/${oldBed._id}/status`, {
            status: "available",
            patient: null,
            assignedDate: null
          });
          setBeds(beds.map(b => b._id === oldBed._id ? oldBedResponse.data : b));
        }

        // Occupy new bed
        const newBed = beds.find(b => b.bedId === request.toBed);
        if (newBed) {
          const newBedResponse = await API.patch(`/beds/${newBed._id}/status`, {
            status: "occupied",
            patient: request.patientName,
            assignedDate: new Date().toISOString()
          });
          setBeds(beds.map(b => b._id === newBed._id ? newBedResponse.data : b));
        }
      } catch (bedErr) {
        console.error('Error updating beds:', bedErr);
      }

      setError(null);
      alert('Transfer completed! Patient and bed records have been updated.');
    } catch (err) {
      setError('Failed to complete transfer');
      console.error('Error completing transfer:', err);
      alert('Failed to complete transfer. Please try again.');
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this transfer request?')) {
      return;
    }
    
    try {
      await API.delete(`/transfers/${requestId}`);
      
      // ✅ Update requests immediately
      setRequests(requests.filter(r => r._id !== requestId));
      
      setError(null);
    } catch (err) {
      setError('Failed to delete transfer');
      console.error('Error deleting transfer:', err);
      alert('Failed to delete transfer. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "pending": return "#999999";
      case "approved": return "#000000";
      case "in-progress": return "#666666";
      case "completed": return "#666666";
      case "rejected": return "#cccccc";
      default: return "#e5e5e5";
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case "high": return "#000000";
      case "medium": return "#666666";
      case "low": return "#999999";
      default: return "#cccccc";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="transfer-requests">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading transfer requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transfer-requests">
      <div className="transfer-header">
        <div>
          <h1 className="transfer-title">Transfer Requests</h1>
          <p className="transfer-subtitle">Manage patient transfer requests between wards and beds</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="transfer-stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
      </div>

      <div className="transfer-filters">
        <div className="filter-left">
          <input
            type="text"
            placeholder="Search by patient name or ID..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select 
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      <div className="requests-grid">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No Transfer Requests</div>
            <div className="empty-text">
              {requests.length === 0 
                ? "No transfer requests have been created yet" 
                : "No transfer requests match your current filters"}
            </div>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request._id} className={`request-card ${request.status}`}>
              <div className="request-card-header">
                <div>
                  <div className="request-id">Request #{request._id.slice(-6)}</div>
                  <div className="patient-name">{request.patientName}</div>
                  <div className="patient-id">{request.patientIdNumber}</div>
                </div>
                <div className="badges">
                  <span 
                    className="priority-badge"
                    style={{ background: getPriorityColor(request.priority) }}
                  >
                    {request.priority}
                  </span>
                  <span 
                    className="status-badge"
                    style={{ background: getStatusColor(request.status) }}
                  >
                    {request.status}
                  </span>
                </div>
              </div>

              <div className="request-card-body">
                <div className="transfer-route">
                  <div className="route-item">
                    <div className="route-label">From</div>
                    <div className="route-value">{request.fromWard}</div>
                    <div className="route-detail">{request.fromBed}</div>
                  </div>
                  <div className="route-arrow">→</div>
                  <div className="route-item">
                    <div className="route-label">To</div>
                    <div className="route-value">{request.toWard}</div>
                    <div className="route-detail">{request.toBed}</div>
                  </div>
                </div>

                <div className="request-details">
                  <div className="detail-item">
                    <span className="detail-label">Reason:</span>
                    <span className="detail-value">{request.reason}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Requested By:</span>
                    <span className="detail-value">{request.requestedBy}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Request Date:</span>
                    <span className="detail-value">{formatDate(request.requestedDate)}</span>
                  </div>
                  {request.approvedBy && (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Approved By:</span>
                        <span className="detail-value">{request.approvedBy}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Approved Date:</span>
                        <span className="detail-value">{formatDate(request.approvedDate)}</span>
                      </div>
                    </>
                  )}
                  {request.completedDate && (
                    <div className="detail-item">
                      <span className="detail-label">Completed Date:</span>
                      <span className="detail-value">{formatDate(request.completedDate)}</span>
                    </div>
                  )}
                  {request.notes && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Notes:</span>
                      <span className="detail-value">{request.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="request-card-footer">
                {request.status === "pending" && (
                  <>
                    <button className="action-btn primary" onClick={() => handleApprove(request._id)}>
                      Approve
                    </button>
                    <button className="action-btn" onClick={() => handleReject(request._id)}>
                      Reject
                    </button>
                  </>
                )}
                {request.status === "approved" && (
                  <button className="action-btn primary" onClick={() => handleStartTransfer(request._id)}>
                    Start Transfer
                  </button>
                )}
                {request.status === "in-progress" && (
                  <button className="action-btn primary" onClick={() => handleCompleteTransfer(request._id)}>
                    Complete Transfer
                  </button>
                )}
                {(request.status === "completed" || request.status === "rejected") && (
                  <button className="action-btn delete" onClick={() => handleDelete(request._id)}>
                    Delete
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