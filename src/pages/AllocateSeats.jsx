import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Calendar, 
  Download, 
  Upload, 
  Settings,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
  Info
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from './ToastProvider';

const AllocateSeats = () => {
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('classroom');
  const [allocations, setAllocations] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roomAvailability, setRoomAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchAllocationsForExam();
      checkRoomAvailabilityForExam();
    } else {
      setAllocations([]);
      setRoomAvailability(null);
    }
  }, [selectedExam]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching all data...');
      
      const [studentsRes, roomsRes, examsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/students`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/exam-schedules`)
      ]);
      
      console.log('Students fetched:', studentsRes.data.length);
      console.log('Rooms fetched:', roomsRes.data.length);
      console.log('Exams fetched:', examsRes.data.length);
      
      setStudents(studentsRes.data);
      setRooms(roomsRes.data);
      setExams(examsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error fetching data. Please refresh the page.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationsForExam = async () => {
    if (!selectedExam) return;
    
    try {
      console.log('Fetching allocations for exam:', selectedExam);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/allocations?examId=${selectedExam}`);
      console.log('Allocations fetched:', response.data.length);
      setAllocations(response.data);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setAllocations([]);
    }
  };

  const checkRoomAvailabilityForExam = async () => {
    if (!selectedExam) return;
    
    const selectedExamData = exams.find(exam => exam._id === selectedExam);
    if (!selectedExamData) return;
    
    try {
      setCheckingAvailability(true);
      console.log('Checking room availability for:', {
        date: selectedExamData.date.split('T')[0],
        time: selectedExamData.time
      });

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/room-availability`, {
        params: {
          date: selectedExamData.date.split('T')[0],
          time: selectedExamData.time
        }
      });
      
      console.log('Room availability:', response.data);
      setRoomAvailability(response.data);
    } catch (error) {
      console.error('Error checking room availability:', error);
      setRoomAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const notifyStudents = async () => {
    if (!selectedExam) {
      showToast('⚠️ Please select an exam first.', 'warning');
      return;
    }

    setNotifyLoading(true);

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/notify-students`, {
        examId: selectedExam
      });

      const successCount = data?.successCount || 0;

      if (successCount > 0) {
        showToast(`Notifications sent to ${successCount} student${successCount > 1 ? 's' : ''}!`, 'success');
      } else {
        showToast('ℹ No students were found to notify.', 'warning');
      }
    } catch (error) {
      const errMsg = error?.response?.data?.message || error.message || 'An unexpected error occurred.';
      console.error('Notification error:', error);
      showToast(`🚫 Failed to send notifications: ${errMsg}`, 'error');
    } finally {
      setNotifyLoading(false);
    }
  };

const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);
  const reader = new FileReader();
  
  reader.onload = async (event) => {
    try {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const processedData = data.map((row, index) => {
        // Parse exam date - handle multiple formats
        let examDate = '';
        if (row.examDate) {
          // Case 1: Excel date number (serial number)
          if (typeof row.examDate === 'number') {
            try {
              const excelDate = XLSX.SSF.parse_date_code(row.examDate);
              examDate = new Date(Date.UTC(excelDate.y, excelDate.m-1, excelDate.d)).toISOString();
            } catch (excelError) {
              console.warn(`Failed to parse Excel date at row ${index+1}`, excelError);
            }
          }
          // Case 2: ISO format string (YYYY-MM-DD)
          else if (/^\d{4}-\d{2}-\d{2}$/.test(row.examDate.toString().trim())) {
            examDate = `${row.examDate.toString().trim()}T00:00:00Z`; // Explicit UTC
          }
          // Case 3: Other string formats
          else {
            const dateStr = row.examDate.toString().trim();
            
            // Try common date formats (UTC)
            const formats = [
              'yyyy-MM-dd', 'MM/dd/yyyy', 'dd-MM-yyyy',
              'yyyy/MM/dd', 'MM-dd-yyyy', 'dd/MM/yyyy'
            ];
            
            for (const format of formats) {
              try {
                const parsedDate = parse(dateStr, format, new Date());
                if (!isNaN(parsedDate.getTime())) {
                  examDate = new Date(Date.UTC(
                    parsedDate.getFullYear(),
                    parsedDate.getMonth(),
                    parsedDate.getDate()
                  )).toISOString();
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            // Fallback to native parsing if above failed
            if (!examDate) {
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                examDate = new Date(Date.UTC(
                  parsedDate.getFullYear(),
                  parsedDate.getMonth(),
                  parsedDate.getDate()
                )).toISOString();
              }
            }
          }
        }

        // Process all other fields
        const processedRow = {
          name: row.name || row.Name || row.student_name || row['Student Name'] || '',
          regNo: (row.regNo || row.RegNo || row.reg_no || row['Register Number'] || row.registerNumber || '').toString().trim(),
          department: (row.department || row.Department || row.dept || row.Dept || '').toString().trim().toUpperCase(),
          semester: (row.semester || row.Semester || row.sem || row.Sem || '').toString().trim(),
          email: row.email || row.Email || row.emailId || row['Email ID'] || '',
          examDate: examDate, // Use the parsed ISO string (UTC)
          subject: row.subject || row.Subject || row.subjectName || row['Subject Name'] || '',
          subjectCode: row.subjectCode || row.SubjectCode || row.subject_code || row['Subject Code'] || '',
          type: (row.type || row.Type || row.examType || row['Exam Type'] || 'regular').toString().toLowerCase(),
          isActive: true
        };
        
        // Validate required fields
        if (!processedRow.name || !processedRow.regNo || !processedRow.department || !processedRow.semester) {
          console.warn(`Row ${index + 1} missing required fields:`, processedRow);
        }
        
        return processedRow;
      }).filter(row => row.name && row.regNo && row.department && row.semester);

      console.log('Processed data for upload:', processedData);

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/students/bulk`, processedData);

      await fetchData();
      setShowUploadModal(false);
      
      const successCount = response.data.students?.length || response.data.created?.length || processedData.length;
      showToast(`Successfully uploaded ${successCount} students!`, 'success');
      
    } catch (error) {
      console.error('Error uploading students:', error);
      showToast(`Error uploading student data: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };
  
  reader.readAsBinaryString(file);
};

  const allocateSeats = async () => {
    if (!selectedExam) {
      showToast('Please select an exam first', 'warning');
      return;
    }

    const selectedExamData = exams.find(exam => exam._id === selectedExam);
    if (!selectedExamData) {
      showToast('Selected exam not found', 'error');
      return;
    }

    const eligibleStudents = students.filter(student => {
      const studentDept = (student.department || '').toString().trim().toUpperCase();
      const studentSem = (student.semester || '').toString().trim();
      const studentSubject = (student.subject || '').toString().trim().toLowerCase();
      const studentSubjectCode = (student.subjectCode || '').toString().trim().toUpperCase();
      
      const examDept = (selectedExamData.department || '').toString().trim().toUpperCase();
      const examSem = (selectedExamData.semester || '').toString().trim();
      const examSubject = (selectedExamData.subject || '').toString().trim().toLowerCase();
      const examSubjectCode = (selectedExamData.subjectCode || '').toString().trim().toUpperCase();
      
      const deptMatch = studentDept === examDept;
      const semMatch = studentSem === examSem;
      const isActive = student.isActive !== false;
      
      let subjectMatch = false;
      
      if (studentSubjectCode && examSubjectCode) {
        subjectMatch = studentSubjectCode === examSubjectCode;
      } else if (studentSubject && examSubject) {
        subjectMatch = studentSubject.includes(examSubject) || examSubject.includes(studentSubject);
      } else {
        subjectMatch = true;
      }
      
      return deptMatch && semMatch && subjectMatch && isActive;
    });

    if (eligibleStudents.length === 0) {
      showToast(`No eligible students found for ${selectedExamData.subject} (${selectedExamData.subjectCode}) - ${selectedExamData.department} Department, Semester ${selectedExamData.semester}.`, 'warning');
      return;
    }

    const filteredRooms = rooms.filter(room => 
      room.room_type === selectedRoomType && 
      (room.isActive !== false)
    );

    if (filteredRooms.length === 0) {
      showToast(`No ${selectedRoomType} rooms available for allocation`, 'error');
      return;
    }

    if (roomAvailability) {
      const availableRoomsOfType = roomAvailability.availableRooms.rooms.filter(
        room => room.room_type === selectedRoomType
      );
      
      if (availableRoomsOfType.length === 0) {
        showToast(`No ${selectedRoomType} rooms available for ${roomAvailability.date} at ${roomAvailability.time}.`, 'error');
        return;
      }
    }

    const availableCapacity = roomAvailability 
      ? roomAvailability.availableRooms.rooms
          .filter(room => room.room_type === selectedRoomType)
          .reduce((sum, room) => sum + room.capacity, 0)
      : filteredRooms.reduce((sum, room) => sum + room.capacity, 0);

    if (eligibleStudents.length > availableCapacity) {
      showToast(`Not enough available ${selectedRoomType} room capacity. Students: ${eligibleStudents.length}, Available Capacity: ${availableCapacity}`, 'error');
      return;
    }

    try {
      setAllocating(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/allocate-seats`, {
        examId: selectedExam,
        roomType: selectedRoomType
      });
      
      setAllocations(response.data);
      await Promise.all([
      fetchData(), // Refresh students, rooms, and exams
      fetchAllocationsForExam(), // Refresh allocations for this exam
      checkRoomAvailabilityForExam() // Refresh room availability
    ]);

    console.log('Allocation response:', response.data);

    showToast(`Successfully allocated ${response.data.allocations.length} students to ${selectedRoomType} rooms!`, 'success');
    } catch (error) {
      console.error('Error allocating seats:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      showToast(`Error allocating seats: ${errorMessage}`, 'error');
    } finally {
      setAllocating(false);
    }
  };

  const clearAllocations = async () => {
    if (!selectedExam) {
      showToast('Please select an exam first', 'warning');
      return;
    }

    if (allocations.length === 0) {
      showToast('No allocations to clear', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to clear all seat allocations for this exam?')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/allocations/exam/${selectedExam}`);
      setAllocations([]);
      await checkRoomAvailabilityForExam();
      showToast('All allocations cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing allocations:', error);
      showToast('Error clearing allocations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadStudentTemplate = () => {
    const template = [
      {
        name: 'Student 1',
        regNo: '22a91a12b0',
        department: 'CS',
        semester: '5',
        email: 'student1@example.com',
        examDate: '2025-06-19',
        subject: 'Operating Systems',
        subjectCode: 'CS301',
        type: 'regular'
      },
      {
        name: 'Student 2',
        regNo: '22a95abw',
        department: 'CS',
        semester: '5',
        email: 'student2@example.com',
        examDate: '2025-06-19',
        subject: 'Database Management',
        subjectCode: 'CS302',
        type: 'supply'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'students_template.xlsx');
  };

  const downloadAllocations = () => {
    if (allocations.length === 0) {
      showToast('No allocations to download', 'warning');
      return;
    }

    const selectedExamData = exams.find(exam => exam._id === selectedExam);
    
    const roomGroups = {};
    allocations.forEach(allocation => {
      const roomNo = allocation.room.room_no;
      if (!roomGroups[roomNo]) {
        roomGroups[roomNo] = [];
      }
      roomGroups[roomNo].push(allocation);
    });

    const wb = XLSX.utils.book_new();
    
    Object.keys(roomGroups).forEach(roomNo => {
      const sortedAllocations = [...roomGroups[roomNo]].sort((a, b) => {
        const getParts = (seat) => {
          const match = (seat.seatNumber || '').match(/^([A-Za-z]+)(\d+)$/);
          return match ? [match[1], parseInt(match[2], 10)] : ['', 0];
        };
        
        const [aLetter, aNum] = getParts(a);
        const [bLetter, bNum] = getParts(b);
        
        return aLetter.localeCompare(bLetter) || aNum - bNum;
      });

      const roomData = sortedAllocations.map((allocation) => ({
        'Seat No': allocation.seatNumber,
        'Student Name': allocation.student.name,
        'Register Number': allocation.student.regNo,
        'Department': allocation.student.department,
        'Semester': allocation.student.semester,
        'Subject': allocation.exam.subject,
        'Subject Code': allocation.exam.subjectCode,
        'Room': allocation.room.room_no,
        'Block': allocation.room.block,
        'Floor': allocation.room.floor_no,
        'Room Type': allocation.room.room_type
      }));
      
      const ws = XLSX.utils.json_to_sheet(roomData);
      XLSX.utils.book_append_sheet(wb, ws, `Room_${roomNo}`);
    });
    
    const fileName = selectedExamData 
      ? `seat_allocations_${selectedExamData.subject}_${selectedExamData.department}_${new Date(selectedExamData.date).toISOString().split('T')[0]}.xlsx`
      : 'seat_allocations.xlsx';
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
  };


  const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Try different date formats
  const formats = [
    'yyyy-MM-dd',    // ISO (2025-06-23)
    'dd-MM-yyyy',    // European (23-06-2025)
    'MM/dd/yyyy',    // US (06/23/2025)
    'yyyy/MM/dd',    // Alternative (2025/06/23)
    'dd MMM yyyy',   // 23 Jun 2025
    'MMM dd, yyyy',  // Jun 23, 2025
    'dd-MM-yy',      // 23-06-25
    'MM/dd/yy'       // 06/23/25
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


  const selectedExamData = exams.find(exam => exam._id === selectedExam);
  
const eligibleStudents = students.filter(student => {
  if (!selectedExamData) return false;
  
  // Department and semester matching
  const studentDept = (student.department || '').toString().trim().toUpperCase();
  const studentSem = (student.semester || '').toString().trim();
  const examDept = (selectedExamData.department || '').toString().trim().toUpperCase();
  const examSem = (selectedExamData.semester || '').toString().trim();
  
  if (studentDept !== examDept || studentSem !== examSem) return false;
  
  // Subject matching
  const studentSubject = (student.subject || '').toString().trim().toLowerCase();
  const studentSubjectCode = (student.subjectCode || '').toString().trim().toUpperCase();
  const examSubject = (selectedExamData.subject || '').toString().trim().toLowerCase();
  const examSubjectCode = (selectedExamData.subjectCode || '').toString().trim().toUpperCase();
  
  let subjectMatch = false;
  if (studentSubjectCode && examSubjectCode) {
    subjectMatch = studentSubjectCode === examSubjectCode;
  } else if (studentSubject && examSubject) {
    subjectMatch = studentSubject.includes(examSubject) || examSubject.includes(studentSubject);
  } else {
    subjectMatch = true;
  }
  
  // Date matching with flexible parsing
  const studentExamDate = formatDateForComparison(student.examDate);
  const examDate = formatDateForComparison(selectedExamData.date);
  
  const dateMatch = studentExamDate && examDate ? studentExamDate === examDate : true;
  
  return subjectMatch && dateMatch && (student.isActive !== false);
});

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Allocate Seats</h1>
          <p className="text-gray-600">Manage student seating arrangements for examinations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadStudentTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Student Template</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Students</span>
          </button>

          <button
            onClick={downloadAllocations}
            disabled={allocations.length === 0}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors 
              ${allocations.length === 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Download className="w-5 h-5" />
            <span>Download Allocations</span>
          </button>

          <button
            onClick={notifyStudents}
            disabled={!selectedExam || allocations.length === 0 || notifyLoading}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors 
              ${!selectedExam || allocations.length === 0 || notifyLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {notifyLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Notifying...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Notify Students</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Total Students</h3>
              <p className="text-3xl font-bold text-blue-600">{students.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Eligible Students</h3>
              <p className="text-3xl font-bold text-green-600">{eligibleStudents.length}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{selectedRoomType.charAt(0).toUpperCase() + selectedRoomType.slice(1)}s Available</h3>
              <p className="text-3xl font-bold text-purple-600">
                {roomAvailability 
                  ? roomAvailability.availableRooms.rooms.filter(r => r.room_type === selectedRoomType).length
                  : rooms.filter(r => r.room_type === selectedRoomType).length}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Allocations</h3>
              <p className="text-3xl font-bold text-orange-600">{allocations.length}</p>
            </div>
            <Settings className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Select Exam for Seat Allocation</h2>
          <button
            onClick={fetchData}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors 
              ${loading ? 'bg-gray-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'}`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select an exam</option>
            {[...exams]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.subject} ({exam.subjectCode}) - {exam.department} Sem {exam.semester} - {new Date(exam.date).toLocaleDateString()} {exam.time}
                </option>
              ))}
          </select>
          
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="classroom">Classroom</option>
            <option value="lab">Lab</option>
            <option value="drawinghall">Drawing Hall</option>
          </select>
          
          <button
            onClick={allocateSeats}
            disabled={!selectedExam || allocating || eligibleStudents.length === 0 || (roomAvailability && roomAvailability.availableRooms.rooms.filter(r => r.room_type === selectedRoomType).length === 0)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {allocating ? 'Allocating...' : 'Allocate Seats'}
          </button>
          
          {allocations.length > 0 && (
            <button
              onClick={clearAllocations}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-5 w-5 inline mr-2" />
              Clear All
            </button>
          )}
        </div>
        
        {selectedExamData && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                <strong>Selected Exam:</strong> {selectedExamData.subject} ({selectedExamData.subjectCode}) for {selectedExamData.department} Department, 
                Semester {selectedExamData.semester} on {new Date(selectedExamData.date).toLocaleDateString()} ({selectedExamData.time})
              </p>
              <p className="text-blue-700 mt-2">
                <strong>Eligible Students:</strong> {eligibleStudents.length} | 
                <strong> Current Allocations:</strong> {allocations.length}
              </p>
            </div>

            {checkingAvailability ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Checking room availability...</p>
              </div>
            ) : roomAvailability && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Available {selectedRoomType}s</h4>
                  </div>
                  <p className="text-green-700">
                    <strong>
                      {roomAvailability.availableRooms.rooms.filter(r => r.room_type === selectedRoomType).length}
                    </strong> {selectedRoomType}s available
                  </p>
                  <p className="text-green-600 text-sm">
                    Total Capacity: {
                      roomAvailability.availableRooms.rooms
                        .filter(r => r.room_type === selectedRoomType)
                        .reduce((sum, room) => sum + room.capacity, 0)
                    }
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Occupied {selectedRoomType}s</h4>
                  </div>
                  <p className="text-red-700">
                    <strong>
                      {roomAvailability.occupiedRooms.rooms.filter(r => r.room_type === selectedRoomType).length}
                    </strong> {selectedRoomType}s occupied
                  </p>
                  <p className="text-red-600 text-sm">
                    Capacity Used: {
                      roomAvailability.occupiedRooms.rooms
                        .filter(r => r.room_type === selectedRoomType)
                        .reduce((sum, room) => sum + room.capacity, 0)
                    }
                  </p>
                </div>
              </div>
            )}

            {roomAvailability && roomAvailability.conflictingExams.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-semibold text-yellow-800">Conflicting Exams</h4>
                </div>
                <p className="text-yellow-700 mb-2">
                  The following exams are scheduled at the same time:
                </p>
                <ul className="text-yellow-600 text-sm space-y-1">
                  {roomAvailability.conflictingExams.map((exam, index) => (
                    <li key={index}>
                      • {exam.subject} - {exam.department} Sem {exam.semester}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eligibleStudents.length === 0 && (
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 font-medium">
                    No eligible students found for this exam. Please check if student data includes the correct subject ({selectedExamData.subject}) and subject code ({selectedExamData.subjectCode}).
                  </p>
                </div>
              </div>
            )}

            {roomAvailability && roomAvailability.availableRooms.rooms.filter(r => r.room_type === selectedRoomType).length === 0 && (
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 font-medium">
                    No {selectedRoomType} rooms available for this date and time. All {selectedRoomType} rooms are occupied by other exams.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {allocations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Seat Allocations</h2>
          
          {Object.entries(
            allocations.reduce((acc, allocation) => {
              const roomNo = allocation.room.room_no;
              if (!acc[roomNo]) acc[roomNo] = [];
              acc[roomNo].push(allocation);
              return acc;
            }, {})
          ).map(([roomNo, roomAllocations]) => {
            const sortedAllocations = [...roomAllocations].sort((a, b) => {
              const getParts = (seat) => {
                const match = (seat.seatNumber || '').match(/^([A-Za-z]+)(\d+)$/);
                return match ? [match[1], parseInt(match[2], 10)] : ['', 0];
              };
              
              const [aLetter, aNum] = getParts(a);
              const [bLetter, bNum] = getParts(b);
              
              return aLetter.localeCompare(bLetter) || aNum - bNum;
            });

            return (
              <div key={roomNo} className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-800">Room {roomNo}</h3>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                    {sortedAllocations.length} students
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    Block {sortedAllocations[0].room.block}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    Floor {sortedAllocations[0].room.floor_no}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {sortedAllocations[0].room.room_type}
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Seat No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Register Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedAllocations.map((allocation) => (
                        <tr key={allocation._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {allocation.seatNumber}
                          </td>
                          <td className="px-4 py-3">{allocation.student.name}</td>
                          <td className="px-4 py-3 font-mono">{allocation.student.regNo}</td>
                          <td className="px-4 py-3">{allocation.student.department}</td>
                          <td className="px-4 py-3">
                            {allocation.exam.subject} ({allocation.exam.subjectCode})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Student Data</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <p className="text-yellow-800 font-medium">Important</p>
                </div>
                <p className="text-yellow-700 text-sm mt-2">
                  Please ensure your Excel file has the correct format with columns: name, regNo, department, semester, <strong>subject, subjectCode</strong>, examDate, type.
                </p>
              </div>
              
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                key={Date.now()}
              />
              
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
              
              {uploading && (
                <div className="text-center">
                  <p className="text-blue-600">Uploading...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocateSeats;