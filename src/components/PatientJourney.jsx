// src/components/PatientJourney.jsx
// Optional component for detailed journey management
import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import "../styles/PatientJourney.css";

export default function PatientJourney() {
  const { patients, updatePatientJourney } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const activePatients = patients.filter(p => p.status === "admitted" && p.journey);

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

  const handleUpdateStage = (patientId, newStage) => {
    updatePatientJourney(patientId, newStage);
    setShowUpdateModal(false);
    setSelectedPatient(null);
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "Not started";
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="patient-journey">
      <div className="journey-header">
        <div>
          <h1 className="journey-title">Patient Journey Tracking</h1>
          <p className="journey-subtitle">Monitor and update patient journey stages</p>
        </div>
      </div>

      <div className="journey-list">
        {activePatients.map((patient) => (
          <div key={patient.id} className="journey-card">
            <div className="journey-card-header">
              <div className="patient-info">
                <div className="patient-avatar">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="patient-name">{patient.name}</div>
                  <div className="patient-id">{patient.id}</div>
                  <div className="patient-diagnosis">{patient.diagnosis}</div>
                </div>
              </div>
              <div className="journey-progress-circle">
                <svg width="80" height="80">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="#e5e5e5"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - patient.journey.progress / 100)}`}
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <div className="progress-text">{patient.journey.progress}%</div>
              </div>
            </div>

            <div className="journey-stages-detail">
              {patient.journey.stages.map((stage, index) => (
                <div key={index} className={`stage-detail ${stage.status}`}>
                  <div className="stage-icon-large">{getStageIcon(stage.name)}</div>
                  <div className="stage-info">
                    <div className="stage-name">{stage.name}</div>
                    <div className="stage-status-badge">{stage.status}</div>
                    {stage.startTime && (
                      <div className="stage-time">
                        Started: {formatDateTime(stage.startTime)}
                      </div>
                    )}
                    {stage.endTime && (
                      <div className="stage-time">
                        Completed: {formatDateTime(stage.endTime)}
                      </div>
                    )}
                    {stage.duration && (
                      <div className="stage-duration">Duration: {stage.duration}</div>
                    )}
                  </div>
                  {stage.status === 'in-progress' && (
                    <button 
                      className="complete-stage-btn"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowUpdateModal(true);
                      }}
                    >
                      Complete & Move to Next
                    </button>
                  )}
                </div>
              ))}
            </div>

            {patient.journey.notes && (
              <div className="journey-notes-section">
                <strong>Notes:</strong> {patient.journey.notes}
              </div>
            )}

            <div className="journey-card-footer">
              <div className="estimated-completion">
                <span className="label">Estimated Completion:</span>
                <span className="value">{formatDateTime(patient.journey.estimatedCompletion)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Update Stage Modal */}
      {showUpdateModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Journey Stage</h2>
              <button className="close-btn" onClick={() => setShowUpdateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Current Stage: <strong>{selectedPatient.journey.currentStage}</strong></p>
              <p>Select next stage:</p>
              <div className="stage-options">
                {selectedPatient.journey.stages
                  .filter(s => s.status === 'pending')
                  .map((stage, index) => (
                    <button
                      key={index}
                      className="stage-option-btn"
                      onClick={() => handleUpdateStage(selectedPatient.id, stage.name)}
                    >
                      {getStageIcon(stage.name)} {stage.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}