import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Custom SVG icons for better visual integration with the design
const Icons = {
  ChartIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
    </svg>
  ),
  JournalIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  ),
  MarketIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
    </svg>
  ),
  ProfileIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
  ),
  LogoutIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
    </svg>
  ),
  SearchIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  ),
  NotificationIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  ),
  ThemeIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
    </svg>
  ),
  MenuIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  ),
  CloseIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
  Logo: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-8 h-8">
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#logo-gradient)"
        d="M24 4L9 12v12.131C9 32.145 15.57 40.151 24 44c8.43-3.849 15-11.855 15-19.869V12L24 4zm5 27h-2v-2h-6v2h-2v-8h10v8zm-1-11h-8c-.552 0-1-.448-1-1s.448-1 1-1h8c.552 0 1 .448 1 1s-.448 1-1 1z"
      />
    </svg>
  )
};

/**
 * Enhanced Professional Navbar Component
 * 
 * Features:
 * - Active link highlighting
 * - Smooth animations
 * - Responsive design with mobile menu
 * - Search functionality
 * - Notification system
 * - Theme toggle
 * - User profile dropdown with additional options
 * - Visual indicators for current page
 */
const Navbar2 = ({ theme = "dark", setTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Define navigation items with icons and active state detection
  const navItems = [
    {
      label: "Market Overview",
      path: "/MarketOverview",
      icon: <Icons.MarketIcon />,
      description: "Real-time market data and analysis"
    },
    {
      label: "Chart",
      path: "/Chart",
      icon: <Icons.ChartIcon />,
      description: "Interactive price charts and indicators"
    },
    {
      label: "Journal",
      path: "/Journal",
      icon: <Icons.JournalIcon />,
      description: "Track your trades and insights"
    },
    {
      label: "Profile",
      path: "/Profile",
      icon: <Icons.ProfileIcon />,
      description: "Manage your account settings"
    },
    {
      label: "Sentiment",
      path: "/Sentiment",
      icon: <Icons.LogoutIcon />,
      divider: true
    }
  ];

  // Define user menu items with icons
  const userMenuItems = [
    {
      label: "My Account",
      path: "/account",
      icon: <Icons.ProfileIcon />
    },
    {
      label: "Settings",
      path: "/settings",
      icon: <Icons.ThemeIcon />
    },
    {
      label: "Help Center",
      path: "/help",
      icon: <Icons.SearchIcon />
    },
    {
      label: "Log Out",
      path: "/",
      icon: <Icons.LogoutIcon />,
      divider: true
    }
  ];

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: "Price Alert",
      message: "BTC has increased by 5% in the last hour",
      time: "10 min ago",
      read: false
    },
    {
      id: 2,
      title: "System Update",
      message: "New trading features have been added",
      time: "1 hour ago",
      read: false
    },
    {
      id: 3,
      title: "Account Security",
      message: "We've detected a new login to your account",
      time: "3 hours ago",
      read: false
    }
  ];

  // Toggle theme function
  const toggleTheme = () => {
    if (setTheme) {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Animation variants
  const navbarVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const mobileMenuVariants = {
    closed: { 
      opacity: 0,
      x: "-100%",
      transition: { 
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    open: { 
      opacity: 1,
      x: 0,
      transition: { 
        duration: 0.3,
        ease: "easeInOut",
        staggerChildren: 0.07,
        delayChildren: 0.1
      }
    }
  };

  const menuItemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 }
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      y: 10, 
      scale: 0.95,
      transition: { 
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={navbarVariants}
      className={`sticky top-0 z-50 w-full shadow-lg ${
        theme === "dark" 
          ? "bg-gray-900 text-white" 
          : "bg-white text-gray-800 border-b border-gray-200"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand name */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center"
              aria-label="Crypto TradeBot Home"
            >
              <Icons.Logo />
              <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
                Crypto TradeBot
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
{navItems.map((item) => {
  const isActive = location.pathname === item.path;
  return (
    <Link
      key={item.label}
      to={item.path}
      className={`relative px-4 py-2 rounded-md flex items-center space-x-2 transition-all duration-200 group ${
        isActive
          ? "bg-blue-600 text-white"
          : theme === "dark"
          ? "text-gray-300 hover:text-white hover:bg-gray-800"
          : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
      }`}
    >
      <span className={`${isActive ? "text-white" : "text-blue-500 group-hover:text-blue-400"}`}>
        {item.icon}
      </span>
      <span>{item.label}</span>
      
      {/* Tooltip - Now positioned below the navigation item */}
      <div className="absolute hidden group-hover:block top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg z-10 whitespace-nowrap">
        {item.description}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
      </div>
    </Link>
  );
})}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Search Button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-full transition-colors duration-200 ${
                theme === "dark"
                  ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700 hover:text-blue-600"
              }`}
              aria-label="Search"
            >
              <Icons.SearchIcon />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  theme === "dark"
                    ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                    : "hover:bg-gray-100 text-gray-700 hover:text-blue-600"
                }`}
                aria-label="Notifications"
              >
                <Icons.NotificationIcon />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={dropdownVariants}
                    className={`absolute right-0 mt-2 w-80 rounded-md shadow-lg overflow-hidden ${
                      theme === "dark" ? "bg-gray-800" : "bg-white border border-gray-200"
                    }`}
                  >
                    <div className={`p-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Notifications</h3>
                        <button
                          onClick={() => {
                            setNotificationCount(0);
                            setShowNotifications(false);
                          }}
                          className="text-xs text-blue-500 hover:text-blue-600"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b ${
                              theme === "dark" ? "border-gray-700" : "border-gray-200"
                            } ${notification.read ? "" : theme === "dark" ? "bg-gray-700/50" : "bg-blue-50"}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                  {notification.title}
                                </h4>
                                <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                  {notification.message}
                                </p>
                              </div>
                              <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                {notification.time}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No notifications
                        </div>
                      )}
                    </div>
                    <div className={`p-2 text-center border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                      <Link
                        to="/notifications"
                        className="text-xs text-blue-500 hover:text-blue-600"
                        onClick={() => setShowNotifications(false)}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            {setTheme && (
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  theme === "dark"
                    ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                    : "hover:bg-gray-100 text-gray-700 hover:text-blue-600"
                }`}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                <Icons.ThemeIcon />
              </button>
            )}

            {/* User Menu (Desktop) */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center justify-center h-8 w-8 rounded-full overflow-hidden border-2 ${
                  theme === "dark"
                    ? "border-gray-700 hover:border-blue-500"
                    : "border-gray-200 hover:border-blue-500"
                } transition-colors duration-200`}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <img
                  src="https://i.pravatar.cc/100?img=12"
                  alt="User avatar"
                  className="h-full w-full object-cover"
                />
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={dropdownVariants}
                    className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 ${
                      theme === "dark" ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                      <p className="text-sm font-medium truncate">Alex Johnson</p>
                      <p className={`text-xs truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        alex@example.com
                      </p>
                    </div>
                    
                    {userMenuItems.map((item, index) => (
                      <div key={item.label}>
                        {item.divider && (
                          <div className={`my-1 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></div>
                        )}
                        <Link
                          to={item.path}
                          className={`flex items-center px-4 py-2 text-sm ${
                            theme === "dark"
                              ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                              : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                          }`}
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className={`mr-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">
                {mobileMenuOpen ? "Close menu" : "Open menu"}
              </span>
              {mobileMenuOpen ? <Icons.CloseIcon /> : <Icons.MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute w-full left-0 right-0 top-16 p-4 shadow-lg z-20 ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
          >
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for cryptocurrencies, news, or charts..."
                className={`flex-grow p-2 text-sm rounded-l-md focus:outline-none ${
                  theme === "dark"
                    ? "bg-gray-700 text-white placeholder-gray-400 border-gray-600"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-200"
                } border`}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-r-md transition duration-150 ease-in-out"
              >
                <Icons.SearchIcon />
              </button>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className={`ml-2 p-2 rounded-md ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                } transition duration-150 ease-in-out`}
              >
                <Icons.CloseIcon />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
            className={`md:hidden fixed inset-0 z-40 pt-16 ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}
          >
            <div className={`px-4 pt-2 pb-3 space-y-1 sm:px-3 ${theme === "dark" ? "border-gray-800" : "border-gray-200"} border-t`}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <motion.div key={item.label} variants={menuItemVariants}>
                    <Link
                      to={item.path}
                      className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : theme === "dark"
                          ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                          : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={`mr-3 ${isActive ? "text-white" : "text-blue-500"}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
              
              <div className={`pt-4 pb-3 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                <div className="flex items-center px-5">
                  <div className="flex-shrink-0">
                    <img
                      className="h-10 w-10 rounded-full"
                      src="https://i.pravatar.cc/100?img=12"
                      alt="User avatar"
                    />
                  </div>
                  <div className="ml-3">
                  <div className={theme === "dark" ? "text-white" : "text-gray-800"}>
                      Alex Johnson
                    </div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                      alex@example.com
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 px-2 space-y-1">
                  {userMenuItems.map((item) => (
                    <motion.div key={item.label} variants={menuItemVariants}>
                      <Link
                        to={item.path}
                        className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                          theme === "dark"
                            ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className={`mr-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom styles for navbar animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </motion.header>
  );
};

export default Navbar2;