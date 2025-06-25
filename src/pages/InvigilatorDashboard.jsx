import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  RefreshCw,
  UserCheck,
  Shield,
  MapPin,
  BookOpen,
  Eye,
  FileText,
  AlertCircle,
  Info,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  Timer,
  Star,
  ChevronRight,
  Bell,
  Activity
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from './ToastProvider'; 
const InvigilatorDashboard = () => {
  const [invigilatorData, setInvigilatorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().getHours() < 14 ? 'FN' : 'AN');
  const [attendanceChanges, setAttendanceChanges] = useState({});
  const [malpracticeModal, setMalpracticeModal] = useState({ show: false, student: null });
  const [malpracticeDescription, setMalpracticeDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [facultyStats, setFacultyStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
const {showToast} = useToast();
  // Get auth session from sessionStorage
  const authSession = JSON.parse(sessionStorage.getItem('authSession') || '{}');
  const { userId: facultyId, name: facultyName } = authSession;

  useEffect(() => {
    if (facultyId) {
      fetchInvigilatorData();
      fetchUpcomingExams();
      fetchFacultyStats();
    } else {
      setError('Faculty ID not found in session. Please login again.');
      setLoading(false);
    }
  }, [facultyId, selectedDate, selectedTime]);

  // Add these utility functions at the top of your component
const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // If it's already a Date object
  if (dateString instanceof Date) {
    return !isNaN(dateString.getTime()) ? dateString : null;
  }
  
  // If it's an ISO string
  if (typeof dateString === 'string' && dateString.includes('T')) {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date : null;
  }
  
  // Try different date formats
  const formats = [
    'yyyy-MM-dd',    // ISO (2025-06-23)
    'dd-MM-yyyy',    // European (23-06-2025)
    'MM/dd/yyyy',    // US (06/23/2025)
    'yyyy/MM/dd',    // Alternative (2025/06/23)
    'dd MMM yyyy',   // 23 Jun 2025
    'MMM dd, yyyy',  // Jun 23, 2025
  ];
  
  // Try parsing with each format
  for (const format of formats) {
    try {
      const parsed = parse(dateString.toString(), format, new Date());
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      continue;
    }
  }
  
  // Fallback to native Date parsing
  const date = new Date(dateString);
  return !isNaN(date.getTime()) ? date : null;
};

const formatDateForComparison = (date) => {
  const d = parseDate(date);
  return d ? d.toISOString().split('T')[0] : null;
};

const isSameDate = (date1, date2) => {
  const d1 = formatDateForComparison(date1);
  const d2 = formatDateForComparison(date2);
  return d1 && d2 && d1 === d2;
};

const fetchInvigilatorData = async () => {
  try {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    console.log('Fetching data for:', { facultyId, selectedDate, selectedTime });
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/attendance/invigilator/${facultyId}`, {
      params: {
        date: selectedDate,
        time: selectedTime
      }
    });
    
    // Additional validation to ensure we got the right exam
    const examData = response.data?.examInfo;
    if (examData) {
      const examDate = formatDateForComparison(examData.date);
      const selectedDateFormatted = formatDateForComparison(selectedDate);
      
      if (!isSameDate(examDate, selectedDateFormatted) || examData.time !== selectedTime) {
        throw new Error('Exam data does not match selected date/time');
      }
    }
    
    console.log('API Response:', response.data);
    setInvigilatorData(response.data);
    setAttendanceChanges({});
  } catch (error) {
    console.error('Error fetching invigilator data:', error);
    
    // If 404, try to get debug information
    if (error.response?.status === 404) {
      try {
        const debugResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/attendance/debug/${facultyId}`);
        setDebugInfo(debugResponse.data);
        console.log('Debug info:', debugResponse.data);
      } catch (debugError) {
        console.error('Error fetching debug info:', debugError);
      }
    }
    
    setError(error.response?.data?.message || error.message || 'Error fetching data');
    setInvigilatorData(null);
  } finally {
    setLoading(false);
  }
};

const fetchUpcomingExams = async () => {
  try {
    const [allocationsRes, examsRes] = await Promise.all([
      axios.get(`${import.meta.env.VITE_API_URL}/api/faculty-allocations`),
      axios.get(`${import.meta.env.VITE_API_URL}/api/exam-schedules`)
    ]);
    
    // Filter allocations for this faculty
    const facultyAllocations = allocationsRes.data.filter(allocation => 
      allocation.facultyId === facultyId
    );
    
    // Get upcoming exams for this faculty
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const upcoming = facultyAllocations
      .filter(allocation => {
        const examDate = parseDate(allocation.exam.date);
        return examDate && examDate >= today;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.exam.date);
        const dateB = parseDate(b.exam.date);
        return dateA - dateB;
      })
      .slice(0, 5);
    
    setUpcomingExams(upcoming);
  } catch (error) {
    console.error('Error fetching upcoming exams:', error);
  }
};

  const fetchFacultyStats = async () => {
    try {
      const [allocationsRes, attendanceRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/faculty-allocations`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/attendance/report/${facultyId}`)
      ]);
      
      const facultyAllocations = allocationsRes.data.filter(allocation => 
        allocation.facultyId === facultyId
      );
      
      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const stats = {
        totalExamsAssigned: facultyAllocations.length,
        examsThisMonth: facultyAllocations.filter(allocation => 
          new Date(allocation.exam.date) >= thisMonth
        ).length,
        completedExams: facultyAllocations.filter(allocation => 
          new Date(allocation.exam.date) < today
        ).length,
        upcomingExams: facultyAllocations.filter(allocation => 
          new Date(allocation.exam.date) > today
        ).length,
        totalStudentsSupervised: attendanceRes.data.length,
        averageAttendance: attendanceRes.data.length > 0 
          ? Math.round((attendanceRes.data.filter(record => record.status === 'present').length / attendanceRes.data.length) * 100)
          : 0
      };
      
      setFacultyStats(stats);
      
      // Generate recent activity
      const activities = [
        { type: 'exam', message: `Supervised ${stats.completedExams} exams this semester`, time: '2 days ago', icon: Award },
        { type: 'attendance', message: `Maintained ${stats.averageAttendance}% average attendance`, time: '1 week ago', icon: TrendingUp },
        { type: 'assignment', message: `Assigned to ${stats.totalExamsAssigned} examination duties`, time: '2 weeks ago', icon: Target }
      ];
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching faculty stats:', error);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceChanges(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async (studentId, status) => {
    if (!invigilatorData) return;
    
    try {
      setSaving(true);

      await axios.post(`${import.meta.env.VITE_API_URL}/api/attendance/mark-attendance`, {
        studentId: studentId,
        examId: invigilatorData.examInfo._id,
        roomId: invigilatorData.roomInfo._id,
        status: status,
        facultyId: facultyId,
        facultyName: facultyName
      });
      
      // Update local state
      setInvigilatorData(prev => ({
        ...prev,
        students: prev.students.map(student => 
          student.student._id === studentId 
            ? { ...student, attendance: { ...student.attendance, status } }
            : student
        ),
        summary: {
          ...prev.summary,
          presentCount: prev.students.filter(s => 
            s.student._id === studentId ? status === 'present' : s.attendance.status === 'present'
          ).length,
          absentCount: prev.students.filter(s => 
            s.student._id === studentId ? status === 'absent' : s.attendance.status === 'absent'
          ).length
        }
      }));
      
      // Remove from pending changes
      setAttendanceChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[studentId];
        return newChanges;
      });
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      showToast('Error saving attendance: ' + (error.response?.data?.message || error.message),'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMalpracticeReport = async () => {
    if (!malpracticeModal.student || !malpracticeDescription.trim()) {
      showToast('Please provide a description for the malpractice report','warning');
      return;
    }
    
    try {
      setSaving(true);

      await axios.post(`${import.meta.env.VITE_API_URL}/api/attendance/report-malpractice`, {
        studentId: malpracticeModal.student._id,
        examId: invigilatorData.examInfo._id,
        roomId: invigilatorData.roomInfo._id,
        description: malpracticeDescription,
        facultyId: facultyId,
        facultyName: facultyName
      });
      
      // Update local state
      setInvigilatorData(prev => ({
        ...prev,
        students: prev.students.map(student => 
          student.student._id === malpracticeModal.student._id 
            ? { 
                ...student, 
                attendance: { 
                  ...student.attendance, 
                  malpractice: { 
                    reported: true, 
                    description: malpracticeDescription 
                  } 
                } 
              }
            : student
        ),
        summary: {
          ...prev.summary,
          malpracticeCount: prev.summary.malpracticeCount + 1
        }
      }));
      
      setMalpracticeModal({ show: false, student: null });
      setMalpracticeDescription('');
      showToast('Malpractice reported successfully','success');
      
    } catch (error) {
      console.error('Error reporting malpractice:', error);
      showToast('Error reporting malpractice: ' + (error.response?.data?.message || error.message),'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadAttendanceReport = () => {
    if (!invigilatorData || !invigilatorData.students.length) {
     showToast('No data to download','warning');
      return;
    }
    
    const reportData = invigilatorData.students.map((student, index) => ({
      'S.No': index + 1,
      'Seat Number': student.seatNumber,
      'Register Number': student.student.regNo,
      'Student Name': student.student.name,
      'Department': student.student.department,
      'Semester': student.student.semester,
      'Attendance': student.attendance.status.toUpperCase(),
      'Malpractice': student.attendance.malpractice?.reported ? 'YES' : 'NO',
      'Malpractice Description': student.attendance.malpractice?.description || '',
      'Subject': invigilatorData.examInfo.subject,
      'Subject Code': invigilatorData.examInfo.subjectCode,
      'Room': invigilatorData.roomInfo.room_no,
      'Block': invigilatorData.roomInfo.block,
      'Date': new Date(invigilatorData.examInfo.date).toLocaleDateString(),
      'Time': invigilatorData.examInfo.time,
      'Invigilator': facultyName,
      'Faculty ID': facultyId
    }));
    
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    
    const fileName = `attendance_${invigilatorData.roomInfo.room_no}_${selectedDate}_${selectedTime}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
  };

  const renderSeatingArrangement = () => {
    if (!invigilatorData || !invigilatorData.students.length) return null;
    
    // Sort students by seat number in numerical order (A1, A2, A3... B1, B2...)
    const sortedStudents = [...invigilatorData.students].sort((a, b) => {
        // Extract letter and number parts
        const letterA = a.seatNumber.match(/[A-Za-z]+/)[0];
        const numA = parseInt(a.seatNumber.match(/\d+/)[0]);
        const letterB = b.seatNumber.match(/[A-Za-z]+/)[0];
        const numB = parseInt(b.seatNumber.match(/\d+/)[0]);
        
        // First sort by letter (A comes before B)
        if (letterA !== letterB) {
            return letterA.localeCompare(letterB);
        }
        // Then sort by number numerically
        return numA - numB;
    });
    
    // Create a grid layout for seating arrangement
    const maxSeatsPerRow = 6; // 3 benches per row (A and B sides)
    const rows = [];
    
    for (let i = 0; i < sortedStudents.length; i += maxSeatsPerRow) {
        rows.push(sortedStudents.slice(i, i + maxSeatsPerRow));
    }
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-gray-800 to-gray-900 text-white px-8 py-3 rounded-xl shadow-lg">
            <BookOpen className="h-6 w-6 inline mr-3" />
            <span className="text-lg font-semibold">BLACKBOARD</span>
          </div>
        </div>
        
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center space-x-4 flex-wrap">
            {row.map((studentData) => {
              const student = studentData.student;
              const attendance = studentData.attendance;
              const isAbsent = attendance.status === 'absent';
              const hasMalpractice = attendance.malpractice?.reported;
              const hasChanges = attendanceChanges[student._id] !== undefined;
              const currentStatus = hasChanges ? attendanceChanges[student._id] : attendance.status;
              
              return (
                <div
                  key={student._id}
                  className={`relative p-4 rounded-xl border-2 min-w-[160px] transition-all duration-300 mb-3 shadow-md hover:shadow-lg transform hover:-translate-y-1 ${
                    hasMalpractice 
                      ? 'border-red-500 bg-gradient-to-br from-red-50 to-red-100' 
                      : currentStatus === 'absent'
                      ? 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50'
                      : 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
                  } ${hasChanges ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
                >
                  {/* Seat Number */}
                  <div className="text-sm font-bold text-gray-700 mb-2 text-center bg-white rounded-md py-1">
                    {studentData.seatNumber}
                  </div>
                  
                  {/* Student Info */}
                  <div className="text-sm font-semibold text-gray-800 mb-1 text-center">
                    {student.regNo}
                  </div>
                  <div className="text-xs text-gray-700 mb-3 line-clamp-2 text-center">
                    {student.name}
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex items-center justify-center space-x-2">
                    {/* Attendance Checkbox */}
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentStatus === 'absent'}
                        onChange={(e) => {
                          const newStatus = e.target.checked ? 'absent' : 'present';
                          handleAttendanceChange(student._id, newStatus);
                          saveAttendance(student._id, newStatus);
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        currentStatus === 'absent' 
                          ? 'bg-red-500 border-red-500 shadow-lg' 
                          : 'bg-green-500 border-green-500 shadow-lg'
                      }`}>
                        {currentStatus === 'absent' ? (
                          <XCircle className="h-3 w-3 text-white" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </label>
                    
                    {/* Malpractice Button */}
                    <button
                      onClick={() => setMalpracticeModal({ show: true, student })}
                      className={`p-1.5 rounded-full transition-all duration-200 ${
                        hasMalpractice 
                          ? 'bg-red-500 text-white shadow-lg' 
                          : 'bg-gray-200 text-gray-600 hover:bg-orange-200 hover:shadow-md'
                      }`}
                      title={hasMalpractice ? 'Malpractice Reported' : 'Report Malpractice'}
                    >
                      <AlertTriangle className="h-3 w-3" />
                    </button>
                  </div>
                  
                  {/* Malpractice Indicator */}
                  {hasMalpractice && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg">
                      <Shield className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const logout = () => {
    sessionStorage.removeItem('authSession');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <RefreshCw className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading invigilator data...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-4xl w-full">
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">No Assignment Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Search Criteria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="bg-white p-3 rounded-lg">
                <p className="font-medium text-gray-800">Faculty ID</p>
                <p>{facultyId}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="font-medium text-gray-800">Date</p>
                <p>{new Date(selectedDate).toLocaleDateString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="font-medium text-gray-800">Time</p>
                <p>{selectedTime}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={fetchInvigilatorData}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Retry</span>
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              <XCircle className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 lg:p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                Welcome back, {facultyName}! 👋
              </h1>
              <p className="text-gray-600 text-lg">Invigilator Dashboard</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchInvigilatorData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={downloadAttendanceReport}
                disabled={!invigilatorData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Download className="h-5 w-5" />
                <span>Download Report</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <XCircle className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
          
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              >
                <option value="FN">Forenoon (FN)</option>
                <option value="AN">Afternoon (AN)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Total Exams</h3>
              <p className="text-3xl font-bold">{facultyStats.totalExamsAssigned || 0}</p>
              <p className="text-sm opacity-80">Assigned this semester</p>
            </div>
            <Award className="h-10 w-10 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Completed</h3>
              <p className="text-3xl font-bold">{facultyStats.completedExams || 0}</p>
              <p className="text-sm opacity-80">Exams supervised</p>
            </div>
            <CheckCircle2 className="h-10 w-10 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Attendance Rate</h3>
              <p className="text-3xl font-bold">{facultyStats.averageAttendance || 0}%</p>
              <p className="text-sm opacity-80">Average performance</p>
            </div>
            <TrendingUp className="h-10 w-10 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Students</h3>
              <p className="text-3xl font-bold">{facultyStats.totalStudentsSupervised || 0}</p>
              <p className="text-sm opacity-80">Total supervised</p>
            </div>
            <Users className="h-10 w-10 opacity-80" />
          </div>
        </div>
      </div>

      {/* Upcoming Exams and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-indigo-600" />
              Upcoming Exams
            </h2>
            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
              {upcomingExams.length} scheduled
            </span>
          </div>
          
          {upcomingExams.length > 0 ? (
            <div className="space-y-4">
              {upcomingExams.map((exam, index) => (
                <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{exam.exam.subject}</h3>
                      <p className="text-sm text-gray-600">{exam.exam.subjectCode} - {exam.exam.department}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(exam.exam.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {exam.exam.time}
                        </span>
                        <span className="flex items-center">
                          <Building2 className="h-3 w-3 mr-1" />
                          {exam.room.room_no}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming exams scheduled</p>
              <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Activity className="h-6 w-6 mr-2 text-green-600" />
              Recent Activity
            </h2>
            <Bell className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <activity.icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {invigilatorData && (
        <>
          {/* Enhanced Room and Exam Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Room</h3>
                  <p className="text-3xl font-bold text-blue-600">{invigilatorData.roomInfo.room_no}</p>
                  <p className="text-sm text-gray-600">Block {invigilatorData.roomInfo.block} • Floor {invigilatorData.roomInfo.floor_no}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Students</h3>
                  <p className="text-3xl font-bold text-green-600">{invigilatorData.summary.totalStudents}</p>
                  <p className="text-sm text-gray-600">Total Assigned</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Present</h3>
                  <p className="text-3xl font-bold text-green-600">{invigilatorData.summary.presentCount}</p>
                  <p className="text-sm text-gray-600">Absent: {invigilatorData.summary.absentCount}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Malpractice</h3>
                  <p className="text-3xl font-bold text-red-600">{invigilatorData.summary.malpracticeCount}</p>
                  <p className="text-sm text-gray-600">Cases Reported</p>
                </div>
                <div className="bg-red-100 p-3 rounded-xl">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Exam Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <BookOpen className="h-6 w-6 mr-2 text-indigo-600" />
              Current Exam Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Subject</p>
                    <p className="font-semibold text-gray-800">{invigilatorData.examInfo.subject}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Code</p>
                    <p className="font-semibold text-gray-800">{invigilatorData.examInfo.subjectCode}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Date</p>
                    <p className="font-semibold text-gray-800">{new Date(invigilatorData.examInfo.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Time</p>
                    <p className="font-semibold text-gray-800">{invigilatorData.examInfo.time}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Seating Arrangement */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4 lg:mb-0">
                <Eye className="h-6 w-6 mr-2 text-indigo-600" />
                Seating Arrangement
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-800">Present</span>
                </div>
                <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-red-800">Absent</span>
                </div>
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-2 rounded-lg">
                  <Shield className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Malpractice</span>
                </div>
              </div>
            </div>
            
            {renderSeatingArrangement()}
          </div>
        </>
      )}

      {/* Enhanced Malpractice Modal */}
      {malpracticeModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Report Malpractice</h2>
              <p className="text-gray-600 mt-2">Please provide details about the incident</p>
            </div>
            
            {malpracticeModal.student && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-800">{malpracticeModal.student.name}</p>
                <p className="text-sm text-gray-600">{malpracticeModal.student.regNo}</p>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Description of Malpractice
              </label>
              <textarea
                value={malpracticeDescription}
                onChange={(e) => setMalpracticeDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                rows="4"
                placeholder="Describe the malpractice incident in detail..."
                required
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleMalpracticeReport}
                disabled={saving || !malpracticeDescription.trim()}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {saving ? 'Reporting...' : 'Report Malpractice'}
              </button>
              <button
                onClick={() => {
                  setMalpracticeModal({ show: false, student: null });
                  setMalpracticeDescription('');
                }}
                disabled={saving}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvigilatorDashboard;