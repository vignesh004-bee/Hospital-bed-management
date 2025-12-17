// src/context/HospitalContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
// import io from 'socket.io-client'; // Uncomment when backend is ready

const HospitalContext = createContext();

export function useHospital() {
  return useContext(HospitalContext);
}

export function HospitalProvider({ children }) {
  // Socket.io connection (uncomment when backend ready)
  // const [socket, setSocket] = useState(null);
  
  // useEffect(() => {
  //   const newSocket = io('http://localhost:5000');
  //   setSocket(newSocket);
  //   
  //   newSocket.on('journey-update', (data) => {
  //     // Handle real-time journey updates
  //     updatePatientJourneyFromSocket(data);
  //   });
  //
  //   return () => newSocket.close();
  // }, []);

  // Journey History Storage
  const [journeyHistory, setJourneyHistory] = useState([]);
  // Beds Data
  const [beds, setBeds] = useState([
    { id: "B-101", ward: "ICU", floor: 1, status: "occupied", patient: "John Doe", assignedDate: "2025-11-20" },
    { id: "B-102", ward: "ICU", floor: 1, status: "available", patient: null, assignedDate: null },
    { id: "B-103", ward: "ICU", floor: 1, status: "maintenance", patient: null, assignedDate: null },
    { id: "B-201", ward: "General", floor: 2, status: "occupied", patient: "Sarah Smith", assignedDate: "2025-11-22" },
    { id: "B-202", ward: "General", floor: 2, status: "available", patient: null, assignedDate: null },
    { id: "B-203", ward: "General", floor: 2, status: "occupied", patient: "Mike Johnson", assignedDate: "2025-11-25" },
    { id: "B-301", ward: "Emergency", floor: 3, status: "available", patient: null, assignedDate: null },
    { id: "B-302", ward: "Emergency", floor: 3, status: "occupied", patient: "Emma Wilson", assignedDate: "2025-11-26" },
  ]);

  // Patients Data with Journey Tracking
  const [patients, setPatients] = useState([
    {
      id: "PT-2024-001",
      name: "John Smith",
      age: 45,
      gender: "Male",
      contact: "+1 234-567-8900",
      admissionDate: "2025-11-20",
      bedId: "B-101",
      ward: "ICU",
      diagnosis: "Cardiac Arrest",
      status: "admitted",
      emergencyContact: "Jane Smith - +1 234-567-8901",
      // Journey Tracking
      journey: {
        currentStage: "Surgery",
        assignedStaff: {
          Admission: "Dr. Sarah Wilson",
          Tests: "Dr. Michael Chen",
          Surgery: "Dr. Sarah Wilson",
          Recovery: null,
          Discharge: null
        },
        stages: [
          { 
            name: "Admission", 
            status: "completed", 
            startTime: "2025-11-20 08:00", 
            endTime: "2025-11-20 09:30", 
            duration: "1h 30m",
            assignedStaff: "Dr. Sarah Wilson",
            notes: "Initial assessment completed"
          },
          { 
            name: "Tests", 
            status: "completed", 
            startTime: "2025-11-20 09:30", 
            endTime: "2025-11-20 12:00", 
            duration: "2h 30m",
            assignedStaff: "Dr. Michael Chen",
            notes: "Blood work and ECG completed"
          },
          { 
            name: "Surgery", 
            status: "in-progress", 
            startTime: "2025-11-20 12:00", 
            endTime: null, 
            duration: null,
            assignedStaff: "Dr. Sarah Wilson",
            expectedDuration: "4h",
            isDelayed: false,
            notes: "Cardiac surgery in progress"
          },
          { 
            name: "Recovery", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null,
            assignedStaff: null,
            expectedDuration: "24h"
          },
          { 
            name: "Discharge", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null,
            assignedStaff: null
          }
        ],
        progress: 55,
        estimatedCompletion: "2025-11-22 16:00",
        isDelayed: false,
        delayReason: null,
        notes: "Patient stable, surgery progressing well",
        alerts: []
      }
    },
    {
      id: "PT-2024-002",
      name: "Sarah Johnson",
      age: 32,
      gender: "Female",
      contact: "+1 234-567-8902",
      admissionDate: "2025-11-22",
      bedId: "B-201",
      ward: "General",
      diagnosis: "Pneumonia",
      status: "admitted",
      emergencyContact: "Mike Johnson - +1 234-567-8903",
      journey: {
        currentStage: "Recovery",
        assignedStaff: {
          Admission: "Nurse Emily Davis",
          Tests: "Dr. James Anderson",
          Surgery: "Dr. Sarah Wilson",
          Recovery: "Nurse Rachel Martinez",
          Discharge: null
        },
        stages: [
          { 
            name: "Admission", 
            status: "completed", 
            startTime: "2025-11-22 10:00", 
            endTime: "2025-11-22 10:45", 
            duration: "45m",
            assignedStaff: "Nurse Emily Davis"
          },
          { 
            name: "Tests", 
            status: "completed", 
            startTime: "2025-11-22 10:45", 
            endTime: "2025-11-22 13:00", 
            duration: "2h 15m",
            assignedStaff: "Dr. James Anderson"
          },
          { 
            name: "Surgery", 
            status: "completed", 
            startTime: "2025-11-22 13:00", 
            endTime: "2025-11-22 16:30", 
            duration: "3h 30m",
            assignedStaff: "Dr. Sarah Wilson"
          },
          { 
            name: "Recovery", 
            status: "in-progress", 
            startTime: "2025-11-22 16:30", 
            endTime: null, 
            duration: null,
            assignedStaff: "Nurse Rachel Martinez",
            expectedDuration: "48h",
            isDelayed: false
          },
          { 
            name: "Discharge", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          }
        ],
        progress: 85,
        estimatedCompletion: "2025-11-24 10:00",
        isDelayed: false,
        notes: "Recovering well, vital signs stable",
        alerts: [
          { type: "info", message: "Patient ready for discharge planning", time: "2025-11-23 14:00" }
        ]
      }
    },
    {
      id: "PT-2024-003",
      name: "Michael Brown",
      age: 58,
      gender: "Male",
      contact: "+1 234-567-8904",
      admissionDate: "2025-11-25",
      bedId: "B-203",
      ward: "General",
      diagnosis: "Diabetes Management",
      status: "admitted",
      emergencyContact: "Lisa Brown - +1 234-567-8905",
      journey: {
        currentStage: "Tests",
        assignedStaff: {
          Admission: "Dr. Michael Chen",
          Tests: "Dr. James Anderson",
          Surgery: null,
          Recovery: null,
          Discharge: null
        },
        stages: [
          { 
            name: "Admission", 
            status: "completed", 
            startTime: "2025-11-25 14:00", 
            endTime: "2025-11-25 15:00", 
            duration: "1h",
            assignedStaff: "Dr. Michael Chen"
          },
          { 
            name: "Tests", 
            status: "in-progress", 
            startTime: "2025-11-25 15:00", 
            endTime: null, 
            duration: null,
            assignedStaff: "Dr. James Anderson",
            expectedDuration: "3h",
            isDelayed: true,
            delayReason: "Waiting for lab results"
          },
          { 
            name: "Surgery", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          },
          { 
            name: "Recovery", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          },
          { 
            name: "Discharge", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          }
        ],
        progress: 30,
        estimatedCompletion: "2025-11-28 12:00",
        isDelayed: true,
        delayReason: "Waiting for lab results",
        notes: "Blood work in progress, monitoring glucose levels",
        alerts: [
          { type: "warning", message: "Tests delayed - lab results pending", time: "2025-11-25 16:00" }
        ]
      }
    },
    {
      id: "PT-2024-004",
      name: "Emma Wilson",
      age: 28,
      gender: "Female",
      contact: "+1 234-567-8906",
      admissionDate: "2025-11-26",
      bedId: "B-302",
      ward: "Emergency",
      diagnosis: "Fracture",
      status: "admitted",
      emergencyContact: "Tom Wilson - +1 234-567-8907",
      journey: {
        currentStage: "Admission",
        assignedStaff: {
          Admission: "Nurse Emily Davis",
          Tests: null,
          Surgery: null,
          Recovery: null,
          Discharge: null
        },
        stages: [
          { 
            name: "Admission", 
            status: "in-progress", 
            startTime: "2025-11-26 08:00", 
            endTime: null, 
            duration: null,
            assignedStaff: "Nurse Emily Davis",
            expectedDuration: "1h"
          },
          { 
            name: "Tests", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          },
          { 
            name: "Surgery", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          },
          { 
            name: "Recovery", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          },
          { 
            name: "Discharge", 
            status: "pending", 
            startTime: null, 
            endTime: null, 
            duration: null
          }
        ],
        progress: 10,
        estimatedCompletion: "2025-11-27 18:00",
        isDelayed: false,
        notes: "Initial assessment in progress",
        alerts: []
      }
    },
  ]);

  // Staff Data
  const [staff, setStaff] = useState([
    {
      id: "ST-001",
      name: "Dr. Sarah Wilson",
      role: "Surgeon",
      department: "Surgery",
      shift: "Morning",
      time: "08:00 - 16:00",
      status: "on-duty",
      contact: "+1 234-567-8901",
      specialty: "Cardiothoracic Surgery"
    },
    {
      id: "ST-002",
      name: "Dr. Michael Chen",
      role: "Doctor",
      department: "Emergency",
      shift: "Night",
      time: "20:00 - 08:00",
      status: "on-duty",
      contact: "+1 234-567-8902",
      specialty: "Emergency Medicine"
    },
  ]);

  // Equipment Data
  const [equipment, setEquipment] = useState([
    {
      id: "EQ-001",
      name: "X-Ray Machine",
      category: "Diagnostic",
      location: "Radiology Room 1",
      status: "available",
      lastMaintenance: "2025-10-15",
      nextMaintenance: "2026-01-15",
      assignedTo: null
    },
    {
      id: "EQ-002",
      name: "Ventilator",
      category: "Life Support",
      location: "ICU Bed 3",
      status: "in-use",
      lastMaintenance: "2025-11-01",
      nextMaintenance: "2025-12-01",
      assignedTo: "John Smith (PT-2024-001)"
    },
  ]);

  // Transfer Requests
  const [transfers, setTransfers] = useState([
    {
      id: "TR-001",
      patientId: "PT-2024-001",
      patientName: "John Smith",
      fromWard: "General",
      fromBed: "B-201",
      toWard: "ICU",
      toBed: "B-103",
      reason: "Critical condition requires intensive monitoring",
      priority: "high",
      status: "pending",
      requestedBy: "Dr. Sarah Wilson",
      requestedDate: "2025-12-04",
      notes: "Patient showing signs of respiratory distress"
    },
  ]);

  // Waiting List
  const [waitingList, setWaitingList] = useState([
    {
      id: "WL-001",
      patientName: "David Miller",
      age: 52,
      contact: "+1 234-567-9001",
      department: "Surgery",
      procedure: "Cardiac Surgery",
      priority: "high",
      estimatedWait: "2-3 days",
      addedDate: "2025-12-02",
      status: "waiting",
      notes: "Requires pre-op assessment"
    },
  ]);

  // Historical Data for Analytics (Track admissions/discharges by month)
  const [historicalData, setHistoricalData] = useState({
    "2025-01": { admissions: 120, discharges: 115, revenue: 180000 },
    "2025-02": { admissions: 135, discharges: 128, revenue: 195000 },
    "2025-03": { admissions: 142, discharges: 138, revenue: 210000 },
    "2025-04": { admissions: 156, discharges: 142, revenue: 225000 },
    "2025-05": { admissions: 148, discharges: 145, revenue: 220000 },
    "2025-06": { admissions: 160, discharges: 155, revenue: 240000 },
  });

  // Calculate real-time analytics
  const getAnalytics = () => {
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === "occupied").length;
    const availableBeds = beds.filter(b => b.status === "available").length;
    const maintenanceBeds = beds.filter(b => b.status === "maintenance").length;
    
    const admittedPatients = patients.filter(p => p.status === "admitted").length;
    const dischargedPatients = patients.filter(p => p.status === "discharged").length;
    
    const onDutyStaff = staff.filter(s => s.status === "on-duty").length;
    const totalStaff = staff.length;
    
    const availableEquipment = equipment.filter(e => e.status === "available").length;
    const inUseEquipment = equipment.filter(e => e.status === "in-use").length;
    
    const pendingTransfers = transfers.filter(t => t.status === "pending").length;
    const waitingPatients = waitingList.filter(w => w.status === "waiting").length;
    
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    
    // Calculate average stay duration
    const admittedPatientsWithDates = patients.filter(p => p.status === "admitted" && p.admissionDate);
    let avgStayDays = 0;
    if (admittedPatientsWithDates.length > 0) {
      const totalDays = admittedPatientsWithDates.reduce((sum, p) => {
        const admitDate = new Date(p.admissionDate);
        const today = new Date();
        const days = Math.floor((today - admitDate) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgStayDays = (totalDays / admittedPatientsWithDates.length).toFixed(1);
    }
    
    // Ward-wise occupancy
    const wards = [...new Set(beds.map(b => b.ward))];
    const wardOccupancy = wards.map(ward => {
      const wardBeds = beds.filter(b => b.ward === ward);
      const wardOccupied = wardBeds.filter(b => b.status === "occupied").length;
      const wardTotal = wardBeds.length;
      return {
        ward,
        total: wardTotal,
        occupied: wardOccupied,
        rate: wardTotal > 0 ? Math.round((wardOccupied / wardTotal) * 100) : 0
      };
    });
    
    // Department stats
    const departments = [...new Set(staff.map(s => s.department))];
    const departmentStats = departments.map(dept => {
      const deptStaff = staff.filter(s => s.department === dept);
      const deptPatients = patients.filter(p => p.ward === dept && p.status === "admitted");
      return {
        name: dept,
        patients: deptPatients.length,
        staff: deptStaff.length,
        satisfaction: Math.floor(Math.random() * 10) + 90 // Mock satisfaction for now
      };
    });

    // Get active patient journeys (patients currently admitted)
    const activeJourneys = patients
      .filter(p => p.status === "admitted" && p.journey)
      .map(p => ({
        id: p.id,
        name: p.name,
        currentStage: p.journey.currentStage,
        progress: p.journey.progress,
        estimatedCompletion: p.journey.estimatedCompletion,
        stages: p.journey.stages,
        notes: p.journey.notes,
        isDelayed: p.journey.isDelayed,
        delayReason: p.journey.delayReason,
        assignedStaff: p.journey.assignedStaff,
        alerts: p.journey.alerts || []
      }));
    
    // Get delayed journeys count
    const delayedJourneys = activeJourneys.filter(j => j.isDelayed).length;

    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyRate,
      admittedPatients,
      dischargedPatients,
      totalPatients: patients.length,
      onDutyStaff,
      totalStaff,
      availableEquipment,
      inUseEquipment,
      totalEquipment: equipment.length,
      pendingTransfers,
      waitingPatients,
      avgStayDays,
      wardOccupancy,
      departmentStats,
      historicalData,
      activeJourneys, // Active patient journeys
      delayedJourneys // Count of delayed journeys
    };
  };

  // Function to update patient journey stage
  const updatePatientJourney = (patientId, newStage, staffId = null, notes = null) => {
    setPatients(patients.map(p => {
      if (p.id === patientId && p.journey) {
        const updatedStages = p.journey.stages.map(stage => {
          if (stage.name === p.journey.currentStage) {
            // Complete current stage
            const completedStage = {
              ...stage,
              status: "completed",
              endTime: new Date().toISOString(),
              duration: calculateDuration(stage.startTime, new Date().toISOString())
            };
            
            // Add to history
            addToHistory(patientId, p.name, p.journey.currentStage, "completed", completedStage);
            
            return completedStage;
          } else if (stage.name === newStage) {
            // Start new stage
            const newStageData = {
              ...stage,
              status: "in-progress",
              startTime: new Date().toISOString(),
              assignedStaff: staffId,
              notes: notes
            };
            
            // Add to history
            addToHistory(patientId, p.name, newStage, "started", newStageData);
            
            // Create notification
            createJourneyNotification(patientId, p.name, newStage, "started");
            
            return newStageData;
          }
          return stage;
        });

        // Calculate new progress
        const completedStages = updatedStages.filter(s => s.status === "completed").length;
        const newProgress = Math.round((completedStages / updatedStages.length) * 100);
        
        // Check for delays
        const currentStageData = updatedStages.find(s => s.status === "in-progress");
        const isDelayed = checkForDelay(currentStageData);

        return {
          ...p,
          journey: {
            ...p.journey,
            currentStage: newStage,
            stages: updatedStages,
            progress: newProgress,
            isDelayed,
            assignedStaff: {
              ...p.journey.assignedStaff,
              [newStage]: staffId
            }
          }
        };
      }
      return p;
    }));
  };

  // Add staff to journey stage
  const assignStaffToStage = (patientId, stageName, staffId, staffName) => {
    setPatients(patients.map(p => {
      if (p.id === patientId && p.journey) {
        return {
          ...p,
          journey: {
            ...p.journey,
            assignedStaff: {
              ...p.journey.assignedStaff,
              [stageName]: staffName
            },
            stages: p.journey.stages.map(stage => 
              stage.name === stageName ? { ...stage, assignedStaff: staffName } : stage
            )
          }
        };
      }
      return p;
    }));
    
    // Add notification
    createJourneyNotification(patientId, patients.find(p => p.id === patientId)?.name, stageName, "staff-assigned", staffName);
  };

  // Mark journey as delayed
  const markJourneyDelayed = (patientId, reason) => {
    setPatients(patients.map(p => {
      if (p.id === patientId && p.journey) {
        const updatedAlerts = [...(p.journey.alerts || []), {
          type: "warning",
          message: `Journey delayed: ${reason}`,
          time: new Date().toISOString()
        }];
        
        createJourneyNotification(patientId, p.name, p.journey.currentStage, "delayed", reason);
        
        return {
          ...p,
          journey: {
            ...p.journey,
            isDelayed: true,
            delayReason: reason,
            alerts: updatedAlerts
          }
        };
      }
      return p;
    }));
  };

  // Resolve delay
  const resolveDelay = (patientId) => {
    setPatients(patients.map(p => {
      if (p.id === patientId && p.journey) {
        const updatedAlerts = [...(p.journey.alerts || []), {
          type: "success",
          message: "Delay resolved, journey resumed",
          time: new Date().toISOString()
        }];
        
        return {
          ...p,
          journey: {
            ...p.journey,
            isDelayed: false,
            delayReason: null,
            alerts: updatedAlerts
          }
        };
      }
      return p;
    }));
  };

  // Check for delay (if stage exceeds expected duration)
  const checkForDelay = (stage) => {
    if (!stage || !stage.startTime || !stage.expectedDuration) return false;
    
    const start = new Date(stage.startTime);
    const now = new Date();
    const elapsedHours = (now - start) / (1000 * 60 * 60);
    const expectedHours = parseInt(stage.expectedDuration);
    
    return elapsedHours > expectedHours * 1.2; // 20% buffer
  };

  // Add to journey history
  const addToHistory = (patientId, patientName, stage, action, stageData) => {
    const historyEntry = {
      id: `HIST-${Date.now()}`,
      patientId,
      patientName,
      stage,
      action,
      timestamp: new Date().toISOString(),
      data: stageData
    };
    
    setJourneyHistory(prev => [historyEntry, ...prev].slice(0, 100)); // Keep last 100 entries
  };

  // Create journey notification
  const createJourneyNotification = (patientId, patientName, stage, action, extra = null) => {
    const notificationMessages = {
      "started": `${patientName} has started ${stage} stage`,
      "completed": `${patientName} has completed ${stage} stage`,
      "delayed": `${patientName}'s ${stage} stage is delayed: ${extra}`,
      "staff-assigned": `${extra} assigned to ${patientName}'s ${stage} stage`
    };
    
    // This would trigger a notification in the Notifications component
    // For now, we'll add it to patient journey alerts
    console.log(`Journey Notification: ${notificationMessages[action]}`);
  };

  // Helper function to calculate duration
  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  };

  const value = {
    // Data
    beds,
    patients,
    staff,
    equipment,
    transfers,
    waitingList,
    journeyHistory,
    
    // Setters
    setBeds,
    setPatients,
    setStaff,
    setEquipment,
    setTransfers,
    setWaitingList,
    
    // Analytics
    getAnalytics,
    
    // Journey Management
    updatePatientJourney,
    assignStaffToStage,
    markJourneyDelayed,
    resolveDelay,
    checkForDelay
  };

  return (
    <HospitalContext.Provider value={value}>
      {children}
    </HospitalContext.Provider>
  );
}