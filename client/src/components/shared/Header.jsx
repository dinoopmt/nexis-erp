import React, { useState, useEffect } from "react";
import { FaUserCircle, FaBell } from "react-icons/fa";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";


export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // update every 1 second

    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    return () => clearInterval(timer); // cleanup on unmount
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-gray-800 text-white gap-4">
      {/* Logo and Title */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        
        <h1 className="text-lg lg:text-xl font-bold">Nexis ERP</h1>
      </div>

      {/* Live Date and Time */}
      <div className="text-xs lg:text-sm text-gray-300 hidden lg:block">
        {currentTime.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Logged-in user details */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <FaBell className="text-white text-lg lg:text-xl cursor-pointer hover:text-gray-300" />
        
        {/* User info and logout */}
        <div className="flex items-center gap-2 lg:gap-3">
          <FaUserCircle className="text-white text-3xl lg:text-4xl flex-shrink-0" />
          <div className="hidden lg:flex flex-col items-start">
            <h1 className="text-sm lg:text-base text-[#f5f5f5] font-semibold">
              {user?.username || "User"}
            </h1>
            <p className="text-xs text-[#ababab]">{user?.role?.name || "User"}</p>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="ml-4 p-2 rounded-lg hover:bg-gray-700 transition-colors"
            title="Logout"
          >
            <LogOut size={18} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}


