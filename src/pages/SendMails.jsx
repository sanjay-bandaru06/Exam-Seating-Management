import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiSend } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { Calendar, Clock, BellRing, Users, AlertTriangle } from 'lucide-react';
import { useToast } from './ToastProvider';

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const SendNotifications = () => {
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('FN');
  const [loadingType, setLoadingType] = useState(null);
  const [counts, setCounts] = useState({ absentees: 0, malpractice: 0 });
  const [absenteeList, setAbsenteeList] = useState([]);
  const [malpracticeList, setMalpracticeList] = useState([]);
  const { showToast } = useToast();

  const fetchCounts = useCallback(
    debounce(async (date, time) => {
      if (!date || !time) return;
      try {
        setLoadingType('fetching');
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/send-mails/counts`, {
          examDate: date,
          examTime: time,
        });
        setCounts({
          absentees: res.data.absentees,
          malpractice: res.data.malpractice,
        });
        setAbsenteeList(res.data.absenteeList || []);
        setMalpracticeList(res.data.malpracticeList || []);
      } catch (err) {
        showToast(err?.response?.data?.message || 'Error fetching student data', 'error');
      } finally {
        setLoadingType(null);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchCounts(examDate, examTime);
  }, [examDate, examTime, fetchCounts]);

  const handleSend = async (type) => {
    if (!examDate || !examTime) {
      showToast('Please select both exam date and time.', 'warning');
      return;
    }

    try {
      setLoadingType(type);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/send-mails/${type}`, {
        examDate,
        examTime,
      });
      showToast(res.data.message, 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Error sending emails', 'error');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-start justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-indigo-100 rounded-full">
            <BellRing className="text-indigo-600 w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Exam Notifications</h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-md">
            Send notifications to students about absentees or malpractice cases
          </p>
        </div>

        {/* Date/Time Selection */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Exam Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="examDate" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Exam Date
                </span>
              </label>
              <input
                id="examDate"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
              />
            </div>

            <div>
              <label htmlFor="examTime" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Exam Time
                </span>
              </label>
              <select
                id="examTime"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
              >
                <option value="FN">Forenoon (FN)</option>
                <option value="AN">Afternoon (AN)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {examDate && examTime && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <Users className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Absent Students</p>
                <p className="text-2xl font-bold text-blue-600">{counts.absentees}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center">
              <div className="p-3 bg-amber-100 rounded-lg mr-4">
                <AlertTriangle className="text-amber-600 w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Malpractice Cases</p>
                <p className="text-2xl font-bold text-amber-600">{counts.malpractice}</p>
              </div>
            </div>
          </div>
        )}

        {/* Student Lists */}
        {(absenteeList.length > 0 || malpracticeList.length > 0) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {absenteeList.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-blue-600 px-4 py-3">
                  <h2 className="text-white font-medium flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Absent Students ({counts.absentees})
                  </h2>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-gray-100">
                    {absenteeList.map((s, i) => (
                      <li key={i} className="px-4 py-3 hover:bg-blue-50 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-800">{s.name}</p>
                            <p className="text-sm text-gray-500">{s.regNo}</p>
                          </div>
                          <span className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[180px]">
                            {s.email}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {malpracticeList.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-amber-600 px-4 py-3">
                  <h2 className="text-white font-medium flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Malpractice Cases ({counts.malpractice})
                  </h2>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-gray-100">
                    {malpracticeList.map((s, i) => (
                      <li key={i} className="px-4 py-3 hover:bg-amber-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="font-medium text-gray-800">{s.name}</p>
                            <p className="text-sm text-gray-500">{s.regNo}</p>
                          </div>
                          <span className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[180px]">
                            {s.email}
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                          <span className="font-medium">Reason:</span> {s.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <BellRing className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No student data</h3>
              <p className="text-sm text-gray-500">
                Select an exam date and time to view student records
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => counts.absentees === 0 ? 
              showToast('No absent students to notify', 'warning') : 
              handleSend('absentees')}
            disabled={loadingType === 'absentees'}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              loadingType === 'absentees'
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
            }`}
          >
            {loadingType === 'absentees' ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FiSend />
                Notify Absentees
              </>
            )}
          </button>

          <button
            onClick={() => counts.malpractice === 0 ? 
              showToast('No malpractice cases to notify', 'warning') : 
              handleSend('malpractice')}
            disabled={loadingType === 'malpractice'}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              loadingType === 'malpractice'
                ? 'bg-amber-300 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md'
            }`}
          >
            {loadingType === 'malpractice' ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FiSend />
                Notify Malpractice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendNotifications;