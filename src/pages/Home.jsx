import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Building2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';

const Home = () => {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalExams: 0,
    totalStudents: 0,
    upcomingExams: 0,
    ongoingExams: 0,
    completedExams: 0
  });

  const [recentExams, setRecentExams] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [roomsRes, examsRes, studentsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/exam-schedules`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/students`)
      ]);

      const exams = examsRes.data;
      const today = new Date();
      
      const upcoming = exams.filter(exam => new Date(exam.date) > today);
      const ongoing = exams.filter(exam => {
        const examDate = new Date(exam.date);
        return examDate.toDateString() === today.toDateString();
      });
      const completed = exams.filter(exam => new Date(exam.date) < today);

      setStats({
        totalRooms: roomsRes.data.length,
        totalExams: exams.length,
        totalStudents: studentsRes.data.length,
        upcomingExams: upcoming.length,
        ongoingExams: ongoing.length,
        completedExams: completed.length
      });

      setRecentExams(exams.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`${bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to ExamSeat Pro Management System</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Rooms"
          value={stats.totalRooms}
          icon={Building2}
          color="text-blue-600"
          bgColor="bg-white"
        />
        <StatCard
          title="Total Exams"
          value={stats.totalExams}
          icon={Calendar}
          color="text-green-600"
          bgColor="bg-white"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="text-purple-600"
          bgColor="bg-white"
        />
        <StatCard
          title="Upcoming Exams"
          value={stats.upcomingExams}
          icon={Clock}
          color="text-orange-600"
          bgColor="bg-white"
        />
      </div>

      {/* Exam Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 mb-1">Completed Exams</p>
              <p className="text-3xl font-bold">{stats.completedExams}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 mb-1">Ongoing Exams</p>
              <p className="text-3xl font-bold">{stats.ongoingExams}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 mb-1">Upcoming Exams</p>
              <p className="text-3xl font-bold">{stats.upcomingExams}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Recent Exams */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Exam Schedules</h2>
        {recentExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Semester</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{new Date(exam.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        exam.time === 'FN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {exam.time}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{exam.subject}</td>
                    <td className="py-3 px-4">{exam.department}</td>
                    <td className="py-3 px-4">{exam.semester}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        new Date(exam.date) > new Date() 
                          ? 'bg-blue-100 text-blue-800' 
                          : new Date(exam.date).toDateString() === new Date().toDateString()
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {new Date(exam.date) > new Date() 
                          ? 'Upcoming' 
                          : new Date(exam.date).toDateString() === new Date().toDateString()
                          ? 'Ongoing'
                          : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No exam schedules found</p>
        )}
      </div>
    </div>
  );
};

export default Home;