import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PatientPortal from './components/PatientPortal';
import AdminEMR from './components/AdminEMR';
import { usePageTitle } from './hooks/usePageTitle';
import './App.css';

function AppContent() {
  usePageTitle();
  return (
    <Routes>
      <Route path="/" element={<PatientPortal />} />
      <Route path="/admin" element={<AdminEMR />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;
