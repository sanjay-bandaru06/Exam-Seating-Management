import React from 'react';
import { useParams } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const { role } = useParams();

  return (
    <div className="dashboard-container">
      <h2>Welcome to the {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard</h2>
      <p>This is the dashboard page for {role}</p>
    </div>
  );
}

export default Dashboard;
