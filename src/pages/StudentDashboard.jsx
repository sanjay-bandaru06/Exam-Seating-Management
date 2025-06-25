import React, { useState, useEffect } from 'react';
import ChatBot from '../components/ChatBot';
import { 
  Calendar, 
  Clock, 
  Building2, 
  MapPin, 
  User, 
  BookOpen, 
  FileText, 
  Award, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  TrendingUp, 
  Users, 
  Shield, 
  Bell, 
  ChevronRight, 
  GraduationCap,
  Zap,
  Heart,
  Coffee,
  Sparkles,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Info,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { useToast } from './ToastProvider';

const StudentDashboard = ({ logout }) => {
  const [studentData, setStudentData] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [todayExam, setTodayExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [showChatBot, setShowChatBot] = useState(false);

  const { showToast } = useToast();
  
  // Get auth session from sessionStorage
  const authSession = JSON.parse(sessionStorage.getItem('authSession') || '{}');
  const { userId: studentRegNo, name: studentName } = authSession;

  const motivationalQuotes = [
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Education is the most powerful weapon which you can use to change the world.",
    "Your only limit is your mind. Keep pushing forward!",
    "Every expert was once a beginner. Every pro was once an amateur.",
    "The beautiful thing about learning is that no one can take it away from you.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Believe you can and you're halfway there. Keep going!"
  ];

  useEffect(() => {
    if (studentRegNo) {
      fetchStudentData();
      setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    } else {
      showToast('Student registration number not found in session. Please login again.', 'warning');
      setLoading(false);
    }
  }, [studentRegNo]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateForComparison = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all necessary data in parallel
      const [studentsRes, allocationsRes, examsRes, facultyAllocationsRes] = await Promise.all([
        axios.get(`${process.env.Backend_url}/api/students`),
        axios.get(`${process.env.Backend_url}/api/allocations`),
        axios.get(`${process.env.Backend_url}/api/exam-schedules`),
        axios.get(`${process.env.Backend_url}/api/faculty-allocations`)
      ]);

      // Find the current student
      const student = studentsRes.data.find(s => s.regNo === studentRegNo);
      if (!student) {
        throw new Error('Student not found');
      }

      setStudentData(student);

      // Find student's seat allocations
      const studentAllocations = allocationsRes.data
        .filter(allocation => allocation && allocation.student && allocation.student.regNo === studentRegNo)
        .map(allocation => {
          // Find the full exam details
          const exam = examsRes.data.find(e => e._id === allocation.exam._id);
          return {
            ...allocation,
            exam: exam || allocation.exam
          };
        });

      // Get today's date for comparison
      const today = new Date();
      const todayStr = formatDateForComparison(today);

      // Find today's exam
      const todayExamAllocation = studentAllocations.find(allocation => {
        const examDate = formatDateForComparison(allocation.exam.date);
        return examDate === todayStr;
      });

      if (todayExamAllocation) {
        // Find invigilator for today's exam
        const invigilator = facultyAllocationsRes.data.find(fa => 
          fa.exam && fa.room && 
          fa.exam._id === todayExamAllocation.exam._id && 
          fa.room._id === todayExamAllocation.room._id
        );

        setTodayExam({
          ...todayExamAllocation,
          invigilator: invigilator || null
        });
      }

      // Find upcoming exams (excluding today)
      const upcoming = studentAllocations
        .filter(allocation => {
          const examDate = new Date(allocation.exam.date);
          return examDate > today;
        })
        .sort((a, b) => new Date(a.exam.date) - new Date(b.exam.date))
        .slice(0, 5);

      // Add invigilator info to upcoming exams
      const upcomingWithInvigilators = upcoming.map(allocation => {
        const invigilator = facultyAllocationsRes.data.find(fa => 
          fa.exam && fa.room &&
          fa.exam._id === allocation.exam._id && 
          fa.room._id === allocation.room._id
        );
        return {
          ...allocation,
          invigilator: invigilator || null
        };
      });

      setUpcomingExams(upcomingWithInvigilators);

      console.log('Student data fetched successfully:', student);

    } catch (error) {
      console.error('Error fetching student data:', error);
      setError(error.message || 'Error fetching student data');
      showToast('Failed to load student data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilExam = (examDate, examTime) => {
    const now = new Date();
    const exam = new Date(examDate);
    
    // Set exam time
    if (examTime === 'FN') {
      exam.setHours(9, 0, 0, 0); // 9:00 AM
    } else {
      exam.setHours(14, 0, 0, 0); // 2:00 PM
    }

    const timeDiff = exam - now;
    
    if (timeDiff <= 0) {
      return 'Exam in progress or completed';
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  const getExamStatus = (examDate) => {
    const today = new Date();
    const exam = new Date(examDate);
    const todayStr = formatDateForComparison(today);
    const examStr = formatDateForComparison(examDate);

    if (examStr === todayStr) {
      return { status: 'today', color: 'bg-yellow-500', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50' };
    } else if (exam > today) {
      const daysDiff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 3) {
        return { status: 'soon', color: 'bg-orange-500', textColor: 'text-orange-800', bgColor: 'bg-orange-50' };
      }
      return { status: 'upcoming', color: 'bg-blue-500', textColor: 'text-blue-800', bgColor: 'bg-blue-50' };
    } else {
      return { status: 'completed', color: 'bg-green-500', textColor: 'text-green-800', bgColor: 'bg-green-50' };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl border border-gray-100 transform transition-all hover:scale-105">
          <div className="animate-pulse flex justify-center mb-6">
            <div className="relative">
              <RefreshCw className="h-12 w-12 animate-spin text-indigo-600" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            </div>
          </div>
          <p className="text-gray-700 text-lg font-medium">Loading your dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Preparing your personalized exam information</p>
          <div className="mt-6 h-2 w-48 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{width: '70%'}}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full transform transition-all hover:scale-[1.01]">
          <div className="bg-gradient-to-br from-red-100 to-pink-100 rounded-full p-5 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={fetchStudentData}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg"
            >
              <XCircle className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No student data state
  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-white/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full -mr-20 -mt-20 opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full -ml-16 -mb-16 opacity-60"></div>
          
          <div className="relative z-10">
            <div className="bg-gradient-to-br from-rose-100 to-pink-100 p-6 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center shadow-inner">
              <AlertCircle className="h-16 w-16 text-rose-500" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Student Details Not Found</h2>
            
            <div className="bg-blue-50/80 rounded-xl p-5 mb-6 border border-blue-200 backdrop-blur-sm max-w-lg mx-auto">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 mb-2">We couldn't find your academic records</p>
                  <p className="text-sm text-blue-700">
                    This might be due to one of these reasons:
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 mt-2">
                    <li>Your exam schedule hasn't been published yet</li>
                    <li>No exam allocated to you.</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={fetchStudentData}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={logout}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg"
              >
                <XCircle className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl p-5 border border-indigo-200/50 max-w-lg mx-auto">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500 p-2 rounded-lg shadow-inner">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-indigo-800">Need Help?</p>
                  <p className="text-sm text-indigo-700">
                    Contact your department office or examination cell for assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 lg:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full -mr-20 -mt-20 opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full -ml-16 -mb-16 opacity-60"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                  Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{studentName}</span>! 👋
                </h1>
                <p className="text-gray-600 text-lg">Your personalized exam dashboard</p>
                {studentData && (
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                    <div className="flex items-center space-x-1 bg-indigo-50 px-3 py-1 rounded-full">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span>{studentData.regNo}</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-purple-50 px-3 py-1 rounded-full">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                      <span>{studentData.department} - Semester {studentData.semester}</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-pink-50 px-3 py-1 rounded-full">
                      <Calendar className="h-4 w-4 text-pink-600" />
                      <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={fetchStudentData}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:bg-gray-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <XCircle className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="bg-gradient-to-r from-indigo-100/80 to-purple-100/80 rounded-xl p-4 border border-indigo-200/50 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg shadow-md">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <p className="text-indigo-800 font-medium italic">{motivationalQuote}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Exam Section */}
      {todayExam ? (
        <div className="mb-8">
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-50 rounded-full -ml-12 -mb-12 opacity-60"></div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Today's Exam</h2>
                  <p className="text-blue-600 font-medium">You have an exam scheduled for today</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Exam Details Card */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Exam Details</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="text-gray-500 w-24">Subject:</span>
                      <span className="font-medium text-gray-800">{todayExam.exam.subject}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Code:</span>
                      <span className="font-medium text-gray-800">{todayExam.exam.subjectCode}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Date:</span>
                      <span className="font-medium text-gray-800">
                        {formatDate(todayExam.exam.date)}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Time:</span>
                      <span className="font-medium text-gray-800">
                        {todayExam.exam.time === 'FN' ? 'Forenoon (9:00 AM - 12:00 PM)' : 'Afternoon (2:00 PM - 5:00 PM)'}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Type:</span>
                      <span className="font-medium text-gray-800">Written Examination</span>
                    </div>
                  </div>
                </div>

                {/* Location & Invigilator Card */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Location Details</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="text-gray-500 w-24">Room:</span>
                      <span className="font-medium text-gray-800">{todayExam.room.room_no}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Block:</span>
                      <span className="font-medium text-gray-800">{todayExam.room.block}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Floor:</span>
                      <span className="font-medium text-gray-800">{todayExam.room.floor_no}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">Seat No:</span>
                      <span className="font-medium text-gray-800">{todayExam.seatNumber}</span>
                    </div>
                    {todayExam.invigilator && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">Invigilator:</span>
                        <span className="font-medium text-gray-800">{todayExam.invigilator.facultyName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Exam Tips */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Exam Guidelines</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-1">
                      <li>Arrive at least 30 minutes before exam time</li>
                      <li>Bring your student ID, Hall Ticket and necessary stationery</li>
                      <li>Mobile phones are strictly prohibited</li>
                      <li>Follow all instructions from the invigilator</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">No Exam Today</h2>
                <p className="text-gray-600">You don't have any exams scheduled for today</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Exams */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg mr-3 shadow-md">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            Upcoming Exams
          </h2>
          {upcomingExams.length > 0 && (
            <span className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium shadow-inner">
              {upcomingExams.length} exam{upcomingExams.length > 1 ? 's' : ''} scheduled
            </span>
          )}
        </div>

        {upcomingExams.length > 0 ? (
          <div className="space-y-4">
            {upcomingExams.map((exam, index) => {
              const examStatus = getExamStatus(exam.exam.date);
              const statusColors = {
                today: { bg: 'bg-gradient-to-r from-amber-50 to-orange-50', border: 'border-l-amber-500', text: 'text-amber-800' },
                soon: { bg: 'bg-gradient-to-r from-orange-50 to-rose-50', border: 'border-l-orange-500', text: 'text-orange-800' },
                upcoming: { bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', border: 'border-l-blue-500', text: 'text-blue-800' },
                completed: { bg: 'bg-gradient-to-r from-green-50 to-emerald-50', border: 'border-l-green-500', text: 'text-green-800' }
              };
              
              return (
                <div 
                  key={index} 
                  className={`${statusColors[examStatus.status].bg} rounded-xl p-6 ${statusColors[examStatus.status].border} border-l-4 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1`}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-800">{exam.exam.subject}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[examStatus.status].text} bg-white shadow-inner`}>
                          {examStatus.status === 'today' ? 'Today' : 
                           examStatus.status === 'soon' ? 'Soon' : 'Upcoming'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{exam.exam.subjectCode} • {exam.exam.department} Department</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg">
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          <span>{formatDate(exam.exam.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg">
                          <Clock className="h-4 w-4 text-indigo-500" />
                          <span>{exam.exam.time === 'FN' ? 'Forenoon (9:00 AM)' : 'Afternoon (2:00 PM)'}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          <span>Room {exam.room.room_no} (Block {exam.room.block})</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg">
                          <Target className="h-4 w-4 text-indigo-500" />
                          <span>Seat {exam.seatNumber}</span>
                        </div>
                      </div>

                      {exam.invigilator && (
                        <div className="mt-3 p-3 bg-white rounded-lg shadow-inner">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm">
                              <strong>Invigilator:</strong> {exam.invigilator.facultyName} ({exam.invigilator.facultyId})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Time remaining:</p>
                      <p className="font-semibold text-gray-800">
                        {getTimeUntilExam(exam.exam.date, exam.exam.time)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-inner">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Upcoming Exams</h3>
            <p className="text-gray-600 mb-4">You don't have any exams scheduled at the moment.</p>
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 max-w-md mx-auto border border-emerald-100 shadow-inner">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-500 p-2 rounded-lg shadow-md">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-emerald-800">You're all caught up!</p>
                  <p className="text-sm text-emerald-600">Enjoy your free time and stay prepared for future exams.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ChatBot Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {showChatBot ? (
          <div className="relative">
            <div 
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowChatBot(false)}
            >
              <XCircle className="h-6 w-6 text-rose-500" />
            </div>
            <div className="bg-white rounded-2xl shadow-xl w-80 md:w-96 max-h-[80vh] overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold">Campus Navigation Assistant</h2>
                    <p className="text-xs text-indigo-100">Ask me about bhavan locations</p>
                  </div>
                </div>
              </div>
              <div className="p-4 h-96 overflow-y-auto">
                <ChatBot />
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowChatBot(true)}
            className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-110"
          >
            <MessageSquare className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Study Tips Section */}
      <div className="mt-8 bg-gradient-to-r from-indigo-500/90 to-purple-600/90 rounded-3xl shadow-xl p-6 text-white backdrop-blur-sm border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-white/20 p-3 rounded-xl shadow-inner backdrop-blur-sm">
            <Star className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Study Tips & Reminders</h2>
            <p className="text-indigo-100/90">Make the most of your preparation time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 hover:shadow-inner transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-gradient-to-br from-indigo-400 to-purple-400 p-1.5 rounded-md">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold">Study Schedule</h3>
            </div>
            <p className="text-sm text-indigo-100/90">Create a daily study routine and stick to it consistently.</p>
          </div>

          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 hover:shadow-inner transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-gradient-to-br from-amber-400 to-orange-400 p-1.5 rounded-md">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold">Practice Tests</h3>
            </div>
            <p className="text-sm text-indigo-100/90">Take mock exams to improve your time management skills.</p>
          </div>

          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 hover:shadow-inner transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-gradient-to-br from-rose-400 to-pink-400 p-1.5 rounded-md">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold">Stay Healthy</h3>
            </div>
            <p className="text-sm text-indigo-100/90">Get enough sleep, eat well, and take regular breaks.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;