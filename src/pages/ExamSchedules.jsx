import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  Book, 
  GraduationCap,
  Download,
  Upload,
  Filter
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from './ToastProvider';
const ExamSchedules = () => {
  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: 'FN',
    subject: '',
    subjectCode: '',
    department: '',
    semester: '',
    type: 'regular'
  });
  const { showToast } = useToast();

  const departments = ['CS', 'CE', 'ME', 'EE', 'EC', 'IT', 'AI&DS'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const filters = [
    { key: 'all', label: 'All Exams' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'thisMonth', label: 'This Month' }
  ];

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [exams, activeFilter]);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-schedules`);
      setExams(response.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const applyFilter = () => {
  const today = new Date();
  const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
  const thisWeekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  let filtered = exams;

  switch (activeFilter) {
    case 'ongoing':
      filtered = exams.filter(exam => {
        const examDate = new Date(exam.date);
        return examDate.toDateString() === new Date().toDateString();
      });
      break;
    case 'thisWeek':
      filtered = exams.filter(exam => {
        const examDate = new Date(exam.date);
        return examDate >= thisWeekStart && examDate <= thisWeekEnd;
      });
      break;
    case 'upcoming':
      filtered = exams.filter(exam => new Date(exam.date) > new Date());
      break;
    case 'completed':
      filtered = exams.filter(exam => new Date(exam.date) < new Date());
      break;
    case 'thisMonth':
      filtered = exams.filter(exam => {
        const examDate = new Date(exam.date);
        return examDate >= thisMonthStart && examDate <= thisMonthEnd;
      });
      break;
    default:
      filtered = exams;
  }

  setFilteredExams(filtered);
};

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const parsedDate = new Date(formData.date);
    const adjustedDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);

    const dataToSubmit = {
      ...formData,
      date: adjustedDate.toISOString()
    };

    if (editingExam) {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/exam-schedules/${editingExam._id}`, dataToSubmit);
      showToast('Exam schedule updated successfully', 'success');
    } else {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/exam-schedules`, dataToSubmit);
      showToast('Exam schedule added successfully', 'success');
    }
    fetchExams();
    resetForm();
  } catch (error) {
    console.error('Error saving exam:', error);
    showToast('Error saving exam schedule', 'error');
  }
};

const handleEdit = (exam) => {
  setEditingExam(exam);
  setFormData({
    date: exam.date.split('T')[0],
    time: exam.time,
    subject: exam.subject,
    subjectCode: exam.subjectCode,
    department: exam.department,
    semester: exam.semester,
    type: exam.type
  });
  setShowModal(true);
};

const handleDelete = async (id) => {
  if (window.confirm('Are you sure you want to delete this exam?')) {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/exam-schedules/${id}`);
      showToast('Exam schedule deleted', 'success');
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      showToast('Failed to delete exam', 'error');
    }
  }
};

const resetForm = () => {
  setFormData({
    date: '',
    time: 'FN',
    subject: '',
    subjectCode: '',
    department: '',
    semester: '',
    type: 'regular'
  });
  setEditingExam(null);
  setShowModal(false);
};

const parseDate = (dateString) => {
  if (!dateString) return null;

  const formats = [
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'dd-MM-yy', 
    'MM/dd/yyyy', 
    'MM/dd/yy', 
    'yyyy/MM/dd', 
    'dd MMM yyyy',
    'MMM dd, yyyy' 
  ];
  
  for (const format of formats) {
    const parsed = XLSX.SSF.parse_date_code(dateString, { dateNF: format });
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
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
      let data = XLSX.utils.sheet_to_json(worksheet);

      // Process dates in the uploaded data
      data = data.map(item => {
        const parsedDate = parseDate(item.date);
        return {
          ...item,
          date: parsedDate ? parsedDate.toISOString() : null
        };
      }).filter(item => item.date !== null); // Filter out invalid dates

      await axios.post(`${import.meta.env.VITE_API_URL}/api/exam-schedules/bulk`, data);
      fetchExams();
      showToast(`Uploaded ${data.length} exam schedules successfully!`, 'success');
    } catch (error) {
      console.error('Error uploading exams:', error);
      showToast('Error uploading exam schedules: ' + error.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  reader.readAsBinaryString(file);
};

const downloadTemplate = () => {
  const template = [
    {
      date: '2025-02-15', // ISO format
      time: 'FN',
      subject: 'Data Structures',
      subjectCode: 'CS301',
      department: 'CS',
      semester: '3',
      type: 'regular'
    },
    {
      date: '15-02-2025', // European format
      time: 'AN',
      subject: 'Algorithms',
      subjectCode: 'CS302',
      department: 'CS',
      semester: '3',
      type: 'regular'
    },
    {
      date: '02/15/2025', // US format
      time: 'FN',
      subject: 'Database Systems',
      subjectCode: 'CS303',
      department: 'CS',
      semester: '3',
      type: 'supply'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ExamSchedules');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'exam_schedules_template.xlsx');
  showToast('Template downloaded with multiple date format examples', 'info');
};

const downloadExams = () => {
  const ws = XLSX.utils.json_to_sheet(filteredExams);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ExamSchedules');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'exam_schedules.xlsx');
  showToast('Exam schedule exported', 'info');
};

const getStatusColor = (date) => {
  const examDate = new Date(date);
  const today = new Date();

  if (examDate.toDateString() === today.toDateString()) {
    return 'bg-yellow-100 text-yellow-800';
  } else if (examDate > today) {
    return 'bg-blue-100 text-blue-800';
  } else {
    return 'bg-green-100 text-green-800';
  }
};

const getStatusText = (date) => {
  const examDate = new Date(date);
  const today = new Date();

  if (examDate.toDateString() === today.toDateString()) {
    return 'Ongoing';
  } else if (examDate > today) {
    return 'Upcoming';
  } else {
    return 'Completed';
  }
};


  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Exam Schedules</h1>
          <p className="text-gray-600">Manage examination schedules and timetables</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={downloadTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>Template</span>
          </button>
          <button
            onClick={downloadExams}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Exam</span>
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Exam Schedules from Excel</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="exam-upload"
            key={Date.now()} // Force re-render to reset input
          />
          <label
            htmlFor="exam-upload"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              uploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-700'
            } text-white`}
          >
            <Upload className="h-5 w-5" />
            <span>{uploading ? 'Uploading...' : 'Upload Excel'}</span>
          </label>
          <p className="text-gray-600">Upload Excel file with exam schedule data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-xl font-bold text-gray-800">Filter Exams</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeFilter === filter.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-gray-600">
          Showing {filteredExams.length} of {exams.length} exams
        </p>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Subject</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...filteredExams]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((exam) => (
                <tr key={exam._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{new Date(exam.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      exam.time === 'FN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {exam.time}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{exam.subject}</td>
                  <td className="px-6 py-4 text-gray-600">{exam.subjectCode}</td>
                  <td className="px-6 py-4">{exam.department}</td>
                  <td className="px-6 py-4">{exam.semester}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      exam.type === 'regular' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {exam.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.date)}`}>
                      {getStatusText(exam.date)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(exam)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exam._id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingExam ? 'Edit Exam Schedule' : 'Add New Exam Schedule'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="FN">Forenoon (FN)</option>
                    <option value="AN">Afternoon (AN)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code</label>
                <input
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="regular">Regular</option>
                  <option value="supply">Supply</option>
                </select>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingExam ? 'Update' : 'Add'} Exam
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

export default ExamSchedules;