import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';
import universityLogo from '../assets/aditya-university.webp';
import { FaUserGraduate, FaUserTie, FaUserCog, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useToast } from '../pages/ToastProvider'; // <-- Make sure this path matches your project

function ChangePassword() {
  const [role, setRole] = useState('student');
  const [userId, setUserId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const roles = ['student', 'invigilator', 'admin'];

  const icons = {
    student: <FaUserGraduate size={36} />,
    invigilator: <FaUserTie size={36} />,
    admin: <FaUserCog size={36} />,
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!role || !userId || !currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword === currentPassword) {
      showToast('New password must be different', 'error');
      return;
    }

    try {
      const response = await axios.post(`${process.env.Backend_url}/api/auth/change-password`, {
        role,
        userId,
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        showToast('Password changed successfully! Redirecting...', 'success');
        setTimeout(() => navigate('/'), 2000);
      } else {
        showToast(response.data.msg || 'Failed to change password', 'error');
      }
    } catch (error) {
      showToast(
        error.response?.data?.msg || 'Failed to change password. Please try again.',
        'error'
      );
    }
  };

  const togglePasswordVisibility = (field) => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
        break;
      default:
        break;
    }
  };

  return (
    <div className="auth-page-container">
      <div className="login-container">
        <div className="logo-container">
          <img src={universityLogo} alt="Aditya University Logo" className="university-logo" />
        </div>

        <div className="app-name">Password Management</div>

        <div className="role-buttons">
          {roles.map((r) => (
            <button
              key={r}
              className={role === r ? 'active' : ''}
              id="button-tag"
              onClick={() => {
                setRole(r);
                setUserId('');
                // Removed setMessage call here
              }}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className="password-form-container">
          <div className="icon">{icons[role]}</div>
          <h3 className="heading-3">{role.charAt(0).toUpperCase() + role.slice(1)} Password Change</h3>

          <form onSubmit={handleChangePassword}>
            <input
              className="input-tag"
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />

            <div className="password-input-container">
              <input
                className="input-tag"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password button-tag"
                onClick={() => togglePasswordVisibility('current')}
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="password-input-container">
              <input
                className="input-tag"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password button-tag"
                onClick={() => togglePasswordVisibility('new')}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="password-input-container">
              <input
                className="input-tag"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password button-tag"
                onClick={() => togglePasswordVisibility('confirm')}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button type="submit" className="login-button button-tag">
              Update Password
            </button>
          </form>

          <button onClick={() => navigate('/')} className="back-link button-tag">
            <FaArrowLeft style={{ marginRight: '8px' }} />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
