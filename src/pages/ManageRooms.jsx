import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2, Users, MapPin, Download, Upload } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from './ToastProvider';

const ManageRooms = () => {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    room_no: '',
    floor_no: '',
    block: '',
    capacity: '',
    room_type: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      const sortedRooms = response.data.sort((a, b) => {
        if (a.floor_no !== b.floor_no) return a.floor_no - b.floor_no;
        return a.room_no.localeCompare(b.room_no);
      });
      setRooms(sortedRooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      showToast('Failed to fetch rooms. Please try again.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericData = {
      ...formData,
      capacity: Number(formData.capacity),
      floor_no: Number(formData.floor_no),
    };
    try {
      if (editingRoom) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/rooms/${editingRoom._id}`, numericData);
        showToast('Room updated successfully!', 'success');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/rooms`, numericData);
        showToast('Room added successfully!', 'success');
      }
      fetchRooms();
      resetForm();
    } catch (error) {
      console.error('Error saving room:', error);
      showToast('Failed to save room. Please try again.', 'error');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      room_no: room.room_no,
      floor_no: room.floor_no,
      block: room.block,
      capacity: room.capacity,
      room_type: room.room_type
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`);
        showToast('Room deleted successfully!', 'success');
        fetchRooms();
      } catch (error) {
        console.error('Error deleting room:', error);
        showToast('Failed to delete room. Please try again.', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      room_no: '',
      floor_no: '',
      block: '',
      capacity: '',
      room_type: '',
    });
    setEditingRoom(null);
    setShowModal(false);
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

        if (!data.length) {
          showToast('Uploaded file is empty.', 'error');
          setUploading(false);
          e.target.value = '';
          return;
        }

        // Validation
        for (const row of data) {
          if (!row.room_no || !row.floor_no || !row.block || !row.capacity || !row.room_type) {
            showToast('Invalid row in Excel. Missing fields.', 'error');
            setUploading(false);
            e.target.value = '';
            return;
          }
        }

        await axios.post(`${import.meta.env.VITE_API_URL}/api/rooms/bulk`, data);
        showToast('Rooms uploaded successfully!', 'success');
        fetchRooms();
      } catch (error) {
        console.error('Error uploading rooms:', error);
        showToast('Error uploading rooms. Please try again.', 'error');
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
        room_no: 'A101',
        floor_no: 1,
        block: 'Alpha',
        capacity: 30,
        room_type: 'Classroom',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rooms');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'rooms_template.xlsx');
  };

  const downloadRooms = () => {
    if (rooms.length === 0) {
      showToast('No rooms available to download.', 'warning');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rooms);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rooms');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'rooms_data.xlsx');
    showToast('Rooms data downloaded successfully!', 'success');
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Manage Rooms</h1>
          <p className="text-gray-600">Add, edit, and manage examination rooms</p>
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
            onClick={downloadRooms}
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
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Rooms from Excel</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="room-upload"
            key={Date.now()}
          />
          <label
            htmlFor="room-upload"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
            } text-white`}
          >
            <Upload className="h-5 w-5" />
            <span>{uploading ? 'Uploading...' : 'Upload Excel'}</span>
          </label>
          <p className="text-gray-600">Upload Excel file with room data</p>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room._id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{room.room_no}</h3>
                  <p className="text-gray-600">Block {room.block}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(room)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(room._id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-gray-700">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>Floor {room.floor_no}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>Capacity: {room.capacity}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Building2 className="h-4 w-4 text-gray-500" /> {/* Changed from Users to Building2 icon */}
                <span>Room Type: {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}</span>
              </div>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="text-center text-gray-500 italic col-span-full mt-8">
            No rooms found. Add or upload rooms to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                <input
                  type="text"
                  value={formData.room_no}
                  onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                <select
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Select room type</option>
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab</option>
                  <option value="drawinghall">Drawing Hall</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Floor Number</label>
                <input
                  type="number"
                  value={formData.floor_no}
                  onChange={(e) => setFormData({ ...formData, floor_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Block</label>
                <input
                  type="text"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingRoom ? 'Update' : 'Add'} Room
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

export default ManageRooms;
