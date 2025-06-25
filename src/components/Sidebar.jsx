import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Calendar, 
  Users, 
  UserCheck,
  GraduationCap,
  LogOut,
  UserPlus,
  Mail
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/dashboard/admin/', name: 'Home', icon: Home },
    { path: '/dashboard/admin/manage-rooms', name: 'Manage Rooms', icon: Building2 },
    { path: '/dashboard/admin/exam-schedules', name: 'Exam Schedules', icon: Calendar },
    { path: '/dashboard/admin/allocate-seats', name: 'Allocate Seats', icon: Users },
    { path: '/dashboard/admin/allocate-faculty', name: 'Allocate Faculty', icon: UserCheck },
    { path: '/dashboard/admin/add-user', name: 'Add User', icon: UserPlus },
  { path: '/dashboard/admin/send-mails', name: 'Send Mails', icon: Mail }

  ];

  const logout = () => {
    sessionStorage.removeItem('authSession');
    window.location.href = '/login';
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-2xl z-50 flex flex-col">
      <div className="p-6 border-b border-indigo-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white rounded-lg">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Exam Seat </h1>
            <p className="text-indigo-200 text-sm">Management System</p>
          </div>
        </div>
      </div>

      <nav className="mt-6 px-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-lg'
                      : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-indigo-700 flex justify-between items-center">
        <div className="text-indigo-200 text-xs">
          © 2025 Exam Seat Management
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-2 p-2 text-indigo-200 hover:text-white hover:bg-indigo-700 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;