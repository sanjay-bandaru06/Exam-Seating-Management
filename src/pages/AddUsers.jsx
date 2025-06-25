import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

import { FiUpload, FiDownload, FiUser, FiLock, FiUserPlus } from 'react-icons/fi';
import { MdOutlineDownloadForOffline, MdOutlineAdminPanelSettings, MdOutlineSchool } from 'react-icons/md';
import { AiOutlinePlus, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { RiShieldUserLine } from 'react-icons/ri';
import { useToast } from './ToastProvider';

const AddUser = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    password: '',
    role: 'student',
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportRole, setExportRole] = useState('all');
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${process.env.Backend_url}/api/auth/add`, formData);
      showToast('User added successfully!', 'success');
      setFormData({ userId: '', name: '', password: '', role: 'student' });
    } catch (err) {
      if (
        err.response &&
        err.response.status === 400 &&
        err.response.data.msg?.toLowerCase().includes('already exists')
      ) {
        showToast(`User ID "${formData.userId}" already exists!`, 'error');
      } else {
        showToast('Failed to add user. Please try again.', 'error');
      }
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawUsers = XLSX.utils.sheet_to_json(sheet);

      const users = rawUsers.map((user) => ({
        userId: String(user.userId),
        name: String(user.name),
        password: String(user.password),
        role: user.role?.toLowerCase() || 'student',
      }));


      if (!users.length) {
        showToast('Uploaded file is empty.', 'error');
        setUploading(false);
        e.target.value = null;
        return;
      }

      const res = await axios.post(`${process.env.Backend_url}/api/auth/add-multiple`, { users });

      const { results } = res.data;
      const skipped = results.filter(r => r.status === 'Skipped');
      const success = results.filter(r => r.status === 'Success');

      if (success.length > 0) {
        showToast(`${success.length} user(s) added successfully.`, 'success');
      }

      if (skipped.length > 0) {
        showToast(`${skipped.length} user(s) skipped (already exist).`, 'warning');
      }

    } catch (err) {
      showToast('Failed to upload users. Please try again.', 'error');
    }

    setUploading(false);
    e.target.value = null;
  };

  const downloadTemplate = () => {
    const templateData = [
      { userId: 'U001', name: 'John Doe', password: '123456', role: 'student' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'UserTemplate.xlsx');
    showToast('Template downloaded successfully!', 'success');
  };

  const exportUsers = async () => {
    try {
      const url =
        exportRole === 'all'
          ? `${process.env.Backend_url}/api/auth/export-users`
          : `${process.env.Backend_url}/api/auth/export-users?role=${exportRole}`;

      const res = await axios.get(url);
      if (!res.data.users || res.data.users.length === 0) {
        showToast('No users found to export.', 'error');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(res.data.users);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');

      const fileName = exportRole === 'all' ? 'AllUsers.xlsx' : `${exportRole}Users.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('Users exported successfully!', 'success');
    } catch (err) {
      showToast('Failed to export users. Please try again.', 'error');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <MdOutlineAdminPanelSettings className="w-5 h-5" />;
      case 'invigilator':
        return <RiShieldUserLine className="w-5 h-5" />;
      case 'student':
        return <MdOutlineSchool className="w-5 h-5" />;
      default:
        return <FiUser className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              User Management Portal
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Easily manage user accounts and permissions
            </p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                uploading
                  ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {uploading ? (
                <AiOutlineLoading3Quarters className="animate-spin w-5 h-5" />
              ) : (
                <FiUpload className="w-5 h-5" />
              )}
              <span className="text-sm sm:text-base">{uploading ? 'Uploading...' : 'Bulk Upload'}</span>
            </button>

            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 hover:border-blue-500 text-gray-700 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
            >
              <FiDownload className="w-5 h-5 text-blue-600" />
              <span className="text-sm sm:text-base">Template</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form Section */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUserPlus className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Add New User</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                      placeholder="e.g. U001"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {['student', 'invigilator', 'admin'].map((role) => (
                    <label
                      key={role}
                      className={`flex items-center space-x-2 p-2 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.role === role
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={formData.role === role}
                        onChange={handleChange}
                        className="hidden"
                      />
                      <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full border flex items-center justify-center ${
                        formData.role === role ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                      }`}>
                        {formData.role === role && (
                          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(role)}
                        <span className="capitalize text-sm sm:text-base">{role}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-4 sm:mt-6 py-2 sm:py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center space-x-2 transition-all ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin w-4 sm:w-5 h-4 sm:h-5" />
                    <span className="text-sm sm:text-base">Adding User...</span>
                  </>
                ) : (
                  <>
                    <AiOutlinePlus className="w-4 sm:w-5 h-4 sm:h-5" />
                    <span className="text-sm sm:text-base">Add User</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <MdOutlineDownloadForOffline className="w-5 sm:w-6 h-5 sm:h-6 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Export Users</h2>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <label className="block text-sm font-medium text-gray-700">Filter by Role</label>
                <select
                  value={exportRole}
                  onChange={(e) => setExportRole(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                >
                  <option value="all">All Users</option>
                  <option value="student">Students Only</option>
                  <option value="invigilator">Invigilators Only</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>

              <button
                onClick={exportUsers}
                className="w-full mt-3 sm:mt-4 py-2 sm:py-3 px-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-medium flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
              >
                <FiDownload className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="text-sm sm:text-base">Export to Excel</span>
              </button>

              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100 mt-4 sm:mt-6">
                <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-1 sm:mb-2">Export Tips</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Select a role to filter exported users</li>
                  <li>• Data includes ID, name, role and creation date</li>
                  <li>• Files are downloaded in Excel format</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default AddUser;