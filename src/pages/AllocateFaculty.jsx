import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  Building2, 
  Plus, 
  Edit, 
  Trash2,
  Download,
  Upload,
  Shuffle,
  Users,
  Info,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Mail
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import toast, { Toaster } from 'react-hot-toast';

const AllocateFaculty = () => {
  const [facultyAllocations, setFacultyAllocations] = useState([]);
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [seatAllocations, setSeatAllocations] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const [formData, setFormData] = useState({
  facultyName: '',
  facultyId: '',
  email: '',
  role: 'invigilator',
  roomId: '',
  designation: 'faculty'
});

  const roles = ['invigilator', 'chief_invigilator', 'supervisor'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      fetchRoomsForDateTime();
    } else {
      setAvailableRooms([]);
      setSeatAllocations([]);
    }
  }, [selectedDate, selectedTime, exams]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [allocationsRes, examsRes, roomsRes] = await Promise.all([
        axios.get(`${process.env.Backend_url}/api/faculty-allocations`),
        axios.get(`${process.env.Backend_url}/api/exam-schedules`),
        axios.get(`${process.env.Backend_url}/api/rooms`)
      ]);
      
      setFacultyAllocations(allocationsRes.data);
      setExams(examsRes.data);
      setRooms(roomsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Error fetching data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomsForDateTime = async () => {
    try {
      setLoading(true);
      
      const selectedExams = exams.filter(exam => {
        const examDate = new Date(exam.date).toDateString();
        const selectedDateObj = new Date(selectedDate).toDateString();
        return examDate === selectedDateObj && exam.time === selectedTime;
      });

      if (selectedExams.length === 0) {
        setAvailableRooms([]);
        setSeatAllocations([]);
        setLoading(false);
        return;
      }

      const examIds = selectedExams.map(exam => exam._id);
      const seatAllocationsPromises = examIds.map(examId => 
        axios.get(`${process.env.Backend_url}/api/allocations?examId=${examId}`)
      );
      
      const seatAllocationsResults = await Promise.all(seatAllocationsPromises);
      const allSeatAllocations = seatAllocationsResults.flatMap(result => result.data);
      setSeatAllocations(allSeatAllocations);

      const roomsWithStudents = [];
      const roomIds = new Set();
      
      allSeatAllocations.forEach(allocation => {
        if (!roomIds.has(allocation.room._id)) {
          roomIds.add(allocation.room._id);
          roomsWithStudents.push(allocation.room);
        }
      });

      setAvailableRooms(roomsWithStudents);
    } catch (error) {
      console.error('Error fetching rooms for date/time:', error);
      toast.error('Error fetching room data');
    } finally {
      setLoading(false);
    }
  };

  // Upload Excel and parse faculty data
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
        
        // Normalize designation
        const normalizedData = data.map(faculty => ({
          ...faculty,
          designation: faculty.designation ? faculty.designation.toLowerCase() : 'faculty'
        }));
        
        setFacultyList(normalizedData);
        setShowUploadModal(false);
        toast.success(`Faculty data uploaded successfully! ${data.length} records loaded.`);
      } catch (error) {
        console.error('Error uploading faculty:', error);
        toast.error('Error uploading faculty data');
      } finally {
        setUploading(false);
        if (e.target) e.target.value = '';
      }
    };
    
    reader.readAsBinaryString(file);
  };

  // Smart allocate faculty and lab technicians to rooms based on students count
 const smartAllocateFaculty = async () => {
  if (facultyList.length === 0) {
    toast.error('Please upload faculty list first');
    return;
  }

  if (!selectedDate || !selectedTime) {
    toast.error('Please select date and time first');
    return;
  }

  if (availableRooms.length === 0) {
    toast.error('No rooms with students found for selected date and time');
    return;
  }

  try {
    setAllocating(true);

    const facultyPool = facultyList.filter(f => {
      const designation = f.designation ? f.designation.toLowerCase() : '';
      return designation.includes('faculty') || designation === 'faculty';
    });

    const labTechPool = facultyList.filter(f => {
      const designation = f.designation ? f.designation.toLowerCase() : '';
      return designation.includes('lab') || designation.includes('technician');
    });

    if (facultyPool.length === 0) {
      toast.error('No faculty members found in uploaded data. Please check designation field.');
      setAllocating(false);
      return;
    }

    const selectedExams = exams.filter(exam => {
      const examDate = new Date(exam.date).toDateString();
      const selectedDateObj = new Date(selectedDate).toDateString();
      return examDate === selectedDateObj && exam.time === selectedTime;
    });

    if (selectedExams.length === 0) {
      toast.error('No exams found for selected date and time');
      setAllocating(false);
      return;
    }

    const examIds = selectedExams.map(exam => exam._id);
    await axios.post(`${process.env.Backend_url}/api/faculty-allocations/clear`, { examIds });

    const allocationsToCreate = [];
    const usedFacultyIds = new Set();

    const shuffledFaculty = [...facultyPool].sort(() => Math.random() - 0.5);
    const shuffledLabTech = [...labTechPool].sort(() => Math.random() - 0.5);

    for (const room of availableRooms) {
      const roomSeatAllocations = seatAllocations.filter(a => a.room._id === room._id);
      if (roomSeatAllocations.length === 0) continue;

      const examForRoom = roomSeatAllocations[0].exam;
      const studentsInRoom = roomSeatAllocations.length;

      let requiredFaculty = 0;
      let requiredLabTech = 0;

      if (studentsInRoom <= 24) {
        requiredFaculty = 1;
        requiredLabTech = 0;
      } else if (studentsInRoom <= 36) {
        requiredFaculty = 1;
        requiredLabTech = 1;
      } else {
        requiredFaculty = 1;
        requiredLabTech = 2;
      }

      // Allocate faculty
      for (let i = 0; i < requiredFaculty; i++) {
        const availableFaculty = shuffledFaculty.filter(f => !usedFacultyIds.has(f.facultyId));
        if (availableFaculty.length > 0) {
          const faculty = availableFaculty[0];
          if (
            faculty.facultyId &&
            faculty.facultyName &&
            examForRoom?._id &&
            room?._id
          ) {
            usedFacultyIds.add(faculty.facultyId);
            allocationsToCreate.push({
            facultyName: faculty.facultyName,
            facultyId: faculty.facultyId,
            email: faculty.email || '',
            designation: 'faculty',
            role: 'invigilator',
            exam: examForRoom._id,
            room: room._id
          });

          }
        }
      }

      // Allocate lab technicians
      for (let i = 0; i < requiredLabTech; i++) {
        const availableLabTech = shuffledLabTech.filter(f => !usedFacultyIds.has(f.facultyId));
        if (availableLabTech.length > 0) {
          const labTech = availableLabTech[0];
          if (
            labTech.facultyId &&
            labTech.facultyName &&
            examForRoom?._id &&
            room?._id
          ) {
            usedFacultyIds.add(labTech.facultyId);
            allocationsToCreate.push({
            facultyName: labTech.facultyName,
            facultyId: labTech.facultyId,
            email: labTech.email || '', 
            designation: 'lab technician',
            role: 'invigilator',
            exam: examForRoom._id,
            room: room._id
          });

          }
        }
      }
    }

    if (allocationsToCreate.length === 0) {
      toast.error('No allocations could be created. Check faculty availability.');
      return;
    }

    const response = await axios.post(`${process.env.Backend_url}/api/faculty-allocations/bulk`, allocationsToCreate);
    const { successCount, errorCount, errors } = response.data;

    if (errorCount > 0) {
      toast.error(`${errorCount} allocations failed. Check console for details.`);
      console.warn('Allocation errors:', errors);
    }

    if (successCount > 0) {
      toast.success(`Successfully allocated ${successCount} faculty members to ${availableRooms.length} rooms!`);
    }

    await fetchInitialData();

  } catch (error) {
    console.error('Error in smart allocation:', error);
    toast.error('Error in smart faculty allocation: ' + (error.response?.data?.message || error.message));
  } finally {
    setAllocating(false);
  }
};

  // Manual add/edit submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time first');
      return;
    }

    if (!formData.roomId) {
      toast.error('Please select a room');
      return;
    }

    try {
      const roomSeatAllocations = seatAllocations.filter(allocation => allocation.room._id === formData.roomId);
      
      if (roomSeatAllocations.length === 0) {
        toast.error('No students found in selected room for this date and time');
        return;
      }

      const examForRoom = roomSeatAllocations[0].exam;

      const allocationData = {
        exam: examForRoom._id,
        room: formData.roomId,
        facultyName: formData.facultyName,
        facultyId: formData.facultyId,
        email: formData.email,
        role: formData.role,
        designation: formData.designation
      };

      if (editingAllocation) {
        await axios.put(`${process.env.Backend_url}/api/faculty-allocations/${editingAllocation._id}`, allocationData);
        toast.success('Faculty allocation updated successfully!');
      } else {
        await axios.post(`${process.env.Backend_url}/api/faculty-allocations`, allocationData);
        toast.success('Faculty allocation created successfully!');
      }
      
      await fetchInitialData();
      resetForm();
    } catch (error) {
      console.error('Error saving faculty allocation:', error);
      toast.error('Error saving faculty allocation: ' + (error.response?.data?.message || error.message));
    }
  };

  // Edit existing allocation
  const handleEdit = (allocation) => {
    setEditingAllocation(allocation);
    setFormData({
      facultyName: allocation.facultyName,
      facultyId: allocation.facultyId,
      email: allocation.email || '',
      role: allocation.role,
      roomId: allocation.room._id,
      designation: allocation.designation || 'faculty'
    });
    setSelectedDate(allocation.exam.date.split('T')[0]);
    setSelectedTime(allocation.exam.time);
    setShowModal(true);
  };

  // Delete allocation
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this faculty allocation?')) {
      try {
        await axios.delete(`${process.env.Backend_url}/api/faculty-allocations/${id}`);
        await fetchInitialData();
        toast.success('Faculty allocation deleted successfully!');
      } catch (error) {
        console.error('Error deleting faculty allocation:', error);
        toast.error('Error deleting faculty allocation');
      }
    }
  };

  // Notify allocated faculties API call
  const notifyFaculties = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select exam date and time first');
      return;
    }

    try {
      setNotifying(true);

      const selectedExams = exams.filter(exam => {
        const examDate = new Date(exam.date).toDateString();
        const selectedDateObj = new Date(selectedDate).toDateString();
        return examDate === selectedDateObj && exam.time === selectedTime;
      });

      if (selectedExams.length === 0) {
        toast.error('No exams found for the selected date and time');
        setNotifying(false);
        return;
      }

      for (const exam of selectedExams) {
        await axios.post(`${process.env.Backend_url}/api/faculty-allocations/notify`, {
          examId: exam._id
        });
        toast.success(`Notification sent for exam: ${exam.subject || exam._id}`);
      }
    } catch (error) {
      console.error('Error notifying faculties:', error);
      toast.error('Failed to send notifications');
    } finally {
      setNotifying(false);
    }
  };

  const resetForm = () => {
    setFormData({
      facultyName: '',
      facultyId: '',
      role: 'invigilator',
      roomId: '',
      designation: 'faculty'
    });
    setEditingAllocation(null);
    setShowModal(false);
  };

  const downloadFacultyTemplate = () => {
    const template = [
      {
        facultyName: 'Dr. John Smith',
        facultyId: 'FAC001',
        email: 'john.smith@example.com',
        department: 'CS',
        designation: 'faculty'
      },
      {
        facultyName: 'Mr. Mike Johnson',
        facultyId: 'LAB001',
        email: 'mike.johnson@example.com',
        department: 'CS',
        designation: 'lab technician'
      },
      {
        facultyName: 'Prof. Jane Doe',
        facultyId: 'FAC002',
        department: 'ME',
        designation: 'faculty'
      },
      {
        facultyName: 'Ms. Sarah Wilson',
        facultyId: 'LAB002',
        department: 'ME',
        designation: 'lab technician'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'faculty_template.xlsx');
    toast.success('Faculty template downloaded successfully!');
  };

  const downloadAllocations = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time first');
      return;
    }

    const filteredAllocations = facultyAllocations.filter(allocation => {
      const allocationDate = new Date(allocation.exam.date).toDateString();
      const selectedDateObj = new Date(selectedDate).toDateString();
      return allocationDate === selectedDateObj && allocation.exam.time === selectedTime;
    });

    if (filteredAllocations.length === 0) {
      toast.error('No allocations found for selected date and time');
      return;
    }

    const exportData = filteredAllocations.map(allocation => ({
      'Faculty Name': allocation.facultyName,
      'Faculty ID': allocation.facultyId,
      'Email': allocation.email || '',
      'Designation': allocation.designation,
      'Role': allocation.role.replace('_', ' ').toUpperCase(),
      'Room': allocation.room.room_no,
      'Block': allocation.room.block,
      'Floor': allocation.room.floor_no,
      'Subject': allocation.exam.subject,
      'Subject Code': allocation.exam.subjectCode,
      'Department': allocation.exam.department,
      'Semester': allocation.exam.semester,
      'Date': new Date(allocation.exam.date).toLocaleDateString(),
      'Time': allocation.exam.time
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Allocations');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = `faculty_allocations_${selectedDate}_${selectedTime}.xlsx`;
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
    
    toast.success('Faculty allocations exported successfully!');
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'chief_invigilator':
        return 'bg-red-100 text-red-800';
      case 'supervisor':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getDesignationColor = (designation) => {
    if (designation && designation.toLowerCase().includes('lab')) {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-green-100 text-green-800';
  };

  // Filter allocations for display based on selected date and time
  const displayAllocations = facultyAllocations.filter(allocation => {
    if (!selectedDate || !selectedTime) return true;
    
    const allocationDate = new Date(allocation.exam.date).toDateString();
    const selectedDateObj = new Date(selectedDate).toDateString();
    return allocationDate === selectedDateObj && allocation.exam.time === selectedTime;
  });

  // Get faculty pools info
  const facultyPool = facultyList.filter(f => {
    const designation = f.designation ? f.designation.toLowerCase() : '';
    return designation.includes('faculty') || designation === 'faculty';
  });
  
  const labTechPool = facultyList.filter(f => {
    const designation = f.designation ? f.designation.toLowerCase() : '';
    return designation.includes('lab') || designation.includes('technician');
  });

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Faculty Allocation System</h1>
          <p className="text-gray-600">Smart assignment of invigilators to examination rooms</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={downloadFacultyTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Download className="h-5 w-5" />
            <span>Download Template</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-md"
          >
            <Upload className="h-5 w-5" />
            <span>Upload Faculty</span>
          </button>
          <button
            onClick={downloadAllocations}
            disabled={!selectedDate || !selectedTime || displayAllocations.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Download className="h-5 w-5" />
            <span>Export Allocations</span>
          </button>
      <button
  onClick={notifyFaculties}
  disabled={notifying}
  className={`flex items-center gap-2 px-5 py-3 rounded-xl  text-white font-medium
    ${notifying ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    transition duration-200 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300`}
>
  {notifying ? (
    <>
      <svg
        className="animate-spin h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        />
      </svg>
      Notifying...
    </>
  ) : (
    <>
      <Mail className="h-5 w-5" />
      Notify
    </>
  )}
</button>

        </div>
      </div>

      {/* Faculty Pool Information */}
      {facultyList.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Users className="h-6 w-6 mr-2 text-indigo-600" />
            Faculty Pool Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Faculty Members</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">{facultyPool.length}</p>
              <p className="text-sm text-green-700">Available for allocation</p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-800">Lab Technicians</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">{labTechPool.length}</p>
              <p className="text-sm text-orange-700">Available for allocation</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Allocation Rules</h3>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p>≤24 students: 1 faculty</p>
                <p>25-36 students: 1 faculty + 1 lab tech</p>
                <p>36 students: 1 faculty + 2 lab techs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date and Time Selection */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-indigo-600" />
          Select Exam Date & Time
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select Time</option>
              <option value="FN">Forenoon (FN)</option>
              <option value="AN">Afternoon (AN)</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={smartAllocateFaculty}
              disabled={!selectedDate || !selectedTime || allocating || facultyList.length === 0 || availableRooms.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {allocating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Shuffle className="h-5 w-5" />}
              <span>{allocating ? 'Allocating...' : 'Smart Allocate'}</span>
            </button>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchInitialData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        {selectedDate && selectedTime && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <p className="text-blue-800 font-medium">
                Selected: {new Date(selectedDate).toLocaleDateString()} - {selectedTime}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
              <div>
                <strong>Available Rooms:</strong> {availableRooms.length}
              </div>
              <div>
                <strong>Faculty Pool:</strong> {facultyPool.length}
              </div>
              <div>
                <strong>Lab Tech Pool:</strong> {labTechPool.length}
              </div>
              <div>
                <strong>Total Students:</strong> {seatAllocations.length}
              </div>
            </div>
            {loading && (
              <div className="flex items-center space-x-2 mt-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-blue-600">Loading room data...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Available Rooms with Capacity Info */}
      {availableRooms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-indigo-600" />
            Available Rooms for Selected Date & Time
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableRooms.map((room) => {
              const studentsInRoom = seatAllocations.filter(allocation => allocation.room._id === room._id).length;
              const facultyInRoom = displayAllocations.filter(allocation => allocation.room._id === room._id);
              
              let requiredFaculty = '';
              let bgColor = 'bg-gray-50';
              let borderColor = 'border-gray-300';
              
              if (studentsInRoom <= 24) {
                requiredFaculty = '1 Faculty';
                bgColor = 'bg-green-50';
                borderColor = 'border-green-300';
              } else if (studentsInRoom <= 36) {
                requiredFaculty = '1 Faculty + 1 Lab Tech';
                bgColor = 'bg-yellow-50';
                borderColor = 'border-yellow-300';
              } else {
                requiredFaculty = '1 Faculty + 2 Lab Techs';
                bgColor = 'bg-red-50';
                borderColor = 'border-red-300';
              }
              
              return (
                <div key={room._id} className={`${bgColor} rounded-lg p-4 border-l-4 ${borderColor} shadow-sm`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-gray-800">{room.room_no}</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Block {room.block} • Floor {room.floor_no}</p>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{studentsInRoom} students</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserCheck className="h-4 w-4" />
                      <span>{facultyInRoom.length} assigned</span>
                    </div>
                  </div>
                  <div className="mt-2 px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
                    Required: {requiredFaculty}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Total Allocations</h3>
              <p className="text-3xl font-bold text-blue-600">{displayAllocations.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Faculty Available</h3>
              <p className="text-3xl font-bold text-green-600">{facultyPool.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Lab Techs Available</h3>
              <p className="text-3xl font-bold text-orange-600">{labTechPool.length}</p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Available Rooms</h3>
              <p className="text-3xl font-bold text-purple-600">{availableRooms.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Faculty Allocations Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Faculty Allocations</h2>
          <button
            onClick={() => setShowModal(true)}
            disabled={!selectedDate || !selectedTime || availableRooms.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span>Add Manual Allocation</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Faculty</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Designation</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Room</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Exam Details</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayAllocations.map((allocation) => (
                <tr key={allocation._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{allocation.facultyName}</p>
                      <p className="text-sm text-gray-600">{allocation.facultyId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDesignationColor(allocation.designation)}`}>
                      {allocation.designation || 'faculty'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(allocation.role)}`}>
                      {allocation.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{allocation.room.room_no}</span>
                      <span className="text-gray-500">({allocation.room.block})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{allocation.exam.subject}</p>
                      <p className="text-sm text-gray-600">
                        {allocation.exam.subjectCode} - {allocation.exam.department} Sem {allocation.exam.semester}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{new Date(allocation.exam.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          allocation.exam.time === 'FN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {allocation.exam.time}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(allocation)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit allocation"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(allocation._id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete allocation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {displayAllocations.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {selectedDate && selectedTime 
                  ? 'No faculty allocations found for selected date and time' 
                  : 'Select date and time to view allocations'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Faculty Data</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  Upload Excel file with faculty information including <strong>facultyName</strong>, <strong>facultyId</strong>, <strong>department</strong>, and <strong>designation</strong>.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 text-sm">
                  <strong>Important:</strong> The designation field should contain either "faculty" or "lab technician" for proper allocation.
                </p>
              </div>
              
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={uploading}
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
                <div className="text-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-blue-600">Uploading faculty data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingAllocation ? 'Edit Faculty Allocation' : 'Manual Faculty Allocation'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Name</label>
                  <input
                    type="text"
                    value={formData.facultyName}
                    onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faculty ID</label>
                  <input
                    type="text"
                    value={formData.facultyId}
                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="faculty@example.com"
              />
            </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="faculty">Faculty</option>
                    <option value="lab technician">Lab Technician</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                  <select
                    value={formData.roomId || ''}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a room</option>
                    {availableRooms.map((room) => {
                      const studentsInRoom = seatAllocations.filter(allocation => allocation.room._id === room._id).length;
                      return (
                        <option key={room._id} value={room._id}>
                          {room.room_no} - Block {room.block} ({studentsInRoom} students)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                  {editingAllocation ? 'Update' : 'Allocate'} Faculty
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocateFaculty;