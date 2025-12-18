// src/context/DataContext.jsx - Using centralized API
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../api/api'; // ✅ Use centralized API config

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      const [bedsRes, patientsRes, staffRes, transfersRes] = await Promise.all([
        API.get('/beds'),
        API.get('/patients'),
        API.get('/staff'),
        API.get('/transfers')
      ]);

      setBeds(bedsRes.data || []);
      setPatients(patientsRes.data || []);
      setStaff(staffRes.data || []);
      setTransfers(transfersRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch individual resources
  const fetchPatients = useCallback(async () => {
    try {
      const response = await API.get('/patients');
      setPatients(response.data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  }, []);

  const fetchBeds = useCallback(async () => {
    try {
      const response = await API.get('/beds');
      setBeds(response.data || []);
    } catch (err) {
      console.error('Error fetching beds:', err);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await API.get('/staff');
      setStaff(response.data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      const response = await API.get('/transfers');
      setTransfers(response.data || []);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const value = {
    beds,
    patients,
    staff,
    transfers,
    loading,
    error,
    setBeds,
    setPatients,
    setStaff,
    setTransfers,
    fetchAllData,
    fetchPatients,
    fetchBeds,
    fetchStaff,
    fetchTransfers
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};