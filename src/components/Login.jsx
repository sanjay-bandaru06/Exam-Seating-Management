import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';
import universityLogo from '../assets/aditya-university.webp';

import { FaUserGraduate, FaUserTie, FaUserCog, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useToast } from '../pages/ToastProvider';
import { PropagateLoader } from 'react-spinners';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [role, setRole] = useState('student');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId || !password) {
      showToast('Please enter both fields.', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        role,
        userId,
        password,
      });

      if (response.data.success) {
        const userData = {
          role,
          userId,
          name: response.data.user.name,
          token: response.data.token || null,
        };

        sessionStorage.setItem('authSession', JSON.stringify(userData));
        if (onLogin) onLogin(userData);

        showToast('Login successful! Redirecting...', 'success');

        switch (role) {
          case 'student':
            navigate('/dashboard/student');
            break;
          case 'invigilator':
            navigate('/dashboard/invigilator');
            break;
          case 'admin':
            navigate('/dashboard/admin');
            break;
          default:
            navigate('/');
        }
      } else {
        showToast(response.data.msg || 'Login failed', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.msg || 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const roles = ['student', 'invigilator', 'admin'];

  const icons = {
    student: <FaUserGraduate size={36} />,
    invigilator: <FaUserTie size={36} />,
    admin: <FaUserCog size={36} />,
  };

  const getTranslateValue = () => {
    const index = roles.indexOf(role);
    return `translateX(-${index * 33.3333}%)`;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-page-container">
      <div className="login-container">
        <div className="logo-container">
          <img src={universityLogo} alt="Aditya University Logo" className="university-logo" />
        </div>

        <div className="app-name">College Management System</div>

        <div className="role-buttons">
          {roles.map((r) => (
            <button
              key={r}
              id="button-tag"
              className={role === r ? 'active' : ''}
              onClick={() => {
                setRole(r);
                setUserId('');
                setPassword('');
              }}
              disabled={loading}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className="slider">
          <div className="slides" style={{ transform: getTranslateValue() }}>
            {roles.map((r) => (
              <div className="slide" key={r}>
                <div className="icon">{icons[r]}</div>
                <h3 className="heading-3">{r.charAt(0).toUpperCase() + r.slice(1)} Login</h3>
                <input
                  className="input-tag"
                  type="text"
                  placeholder="User ID"
                  value={role === r ? userId : ''}
                  onChange={(e) => role === r && setUserId(e.target.value)}
                  disabled={loading}
                />
                <div className="password-input-container">
                  <input
                    className="input-tag"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={role === r ? password : ''}
                    onChange={(e) => role === r && setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password button-tag"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {loading ? (
                  <div className="loader-container">
                    <PropagateLoader color="#3498db" size={15} />
                  </div>
                ) : (
                  <button className="login-button button-tag" onClick={handleLogin}>
                    Sign In
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <p onClick={() => !loading && navigate('/change-password')} className="change-password-link">
          Change Password
        </p>
      </div>
    </div>
  );
}

export default Login;
