import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Home from './Home';
import ManageRooms from './ManageRooms';
import ExamSchedules from './ExamSchedules';
import AllocateSeats from './AllocateSeats';
import AllocateFaculty from './AllocateFaculty';
import AddUser from './AddUsers';
import SendNotifications from './SendMails';

const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manage-rooms" element={<ManageRooms />} />
          <Route path="/exam-schedules" element={<ExamSchedules />} />
          <Route path="/allocate-seats" element={<AllocateSeats />} />
          <Route path="/allocate-faculty" element={<AllocateFaculty />} />
          <Route path="/add-user" element={<AddUser/>} />
          <Route path="/send-mails" element={<SendNotifications />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;