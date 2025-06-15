import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Footer Component
 * 
 * A sophisticated, interactive footer with premium design elements
 * and comprehensive functionality for cryptocurrency trading platforms.
 * 
 * Features:
 * - Interactive animations and hover effects
 * - Newsletter subscription with validation
 * - Live cryptocurrency price ticker
 * - Language selector
 * - Dynamic theme transitions
 * - Accessibility compliance
 * - Responsive across all device sizes
 */

// SVG Icon Components
const Icons = {
  Facebook: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  ),
  Twitter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
    </svg>
  ),
  Instagram: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 011.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772 4.915 4.915 0 01-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428.254-.66.599-1.216 1.153-1.772.536-.554 1.113-.9 1.772-1.153.637-.247 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.986-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.097 3.097 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.136 5.136 0 110 10.27 5.136 5.136 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.469a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
    </svg>
  ),
  LinkedIn: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 110-4.123 2.062 2.062 0 010 4.123zm1.773 13.019H3.555V9h3.555v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  Discord: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  Telegram: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
  Email: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4.7l-8 5.334L4 8.7V6.297l8 5.333 8-5.333V8.7z" />
    </svg>
  ),
  Phone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 00-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" />
    </svg>
  ),
  Location: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  ArrowUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z" />
    </svg>
  ),
  Trends: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
    </svg>
  ),
  Bot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6v-4h12v4zm0-8H6V7h12v4z" />
    </svg>
  ),
  Security: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  ),
  Bitcoin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.06 11.57c.59-.69.94-1.59.94-2.57 0-1.86-1.27-3.43-3-3.87V3h-2v2h-2V3H9v2H6v2h2v10H6v2h3v2h2v-2h2v2h2v-2c2.21 0 4-1.79 4-4 0-1.45-.78-2.73-1.94-3.43zM10 7h4c1.1 0 2 .9 2 2s-.9 2-2 2h-4V7zm5 10h-5v-4h5c1.1 0 2 .9 2 2s-.9 2-2 2z" />
    </svg>
  ),
  Ethereum: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 1.75l-6.25 10.5L12 16l6.25-3.75L12 1.75M5.75 13.5L12 22.25l6.25-8.75L12 17.25 5.75 13.5z" />
    </svg>
  )
};

// Mock cryptocurrency data
const cryptoPrices = [
  { id: 'BTC', name: 'Bitcoin', icon: <Icons.Bitcoin />, price: 69420, change: 2.35 },
  { id: 'ETH', name: 'Ethereum', icon: <Icons.Ethereum />, price: 3840, change: 1.27 },
  { id: 'SOL', name: 'Solana', icon: null, price: 167, change: 3.45 },
  { id: 'BNB', name: 'Binance Coin', icon: null, price: 590, change: -0.73 }
];

// Available languages
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'jp', name: '日本語' },
  { code: 'ru', name: 'Русский' }
];

const Footer = () => {
  // State hooks
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [cryptoData, setCryptoData] = useState(cryptoPrices);
  const languageRef = useRef(null);
  
  // Navigation links organized by sections
  const navSections = [
    {
      title: "Platform",
      links: [
        { name: 'Dashboard', url: '/dashboard' },
        { name: 'Market Analysis', url: '/market-analysis' },
        { name: 'Trading Bots', url: '/trading-bots' },
        { name: 'API Documentation', url: '/api-docs' },
        { name: 'Pricing Plans', url: '/pricing' }
      ]
    },
    {
      title: "Company",
      links: [
        { name: 'About Us', url: '/about' },
        { name: 'Our Team', url: '/team' },
        { name: 'Careers', url: '/careers' },
        { name: 'Blog', url: '/blog' },
        { name: 'Press Kit', url: '/press' }
      ]
    },
    {
      title: "Resources",
      links: [
        { name: 'Help Center', url: '/help' },
        { name: 'Community', url: '/community' },
        { name: 'Tutorials', url: '/tutorials' },
        { name: 'Market Insights', url: '/insights' },
        { name: 'Status Page', url: '/status' }
      ]
    }
  ];

  // Social media links with icons
  const socialLinks = [
    { name: 'Twitter', icon: <Icons.Twitter />, url: 'https://twitter.com', color: 'bg-blue-400 hover:bg-blue-500' },
    { name: 'Discord', icon: <Icons.Discord />, url: 'https://discord.com', color: 'bg-indigo-500 hover:bg-indigo-600' },
    { name: 'Telegram', icon: <Icons.Telegram />, url: 'https://telegram.org', color: 'bg-blue-500 hover:bg-blue-600' },
    { name: 'LinkedIn', icon: <Icons.LinkedIn />, url: 'https://linkedin.com', color: 'bg-blue-700 hover:bg-blue-800' },
    { name: 'Instagram', icon: <Icons.Instagram />, url: 'https://instagram.com', color: 'bg-pink-600 hover:bg-pink-700' },
    { name: 'Facebook', icon: <Icons.Facebook />, url: 'https://facebook.com', color: 'bg-blue-600 hover:bg-blue-700' }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12
      }
    }
  };

  const linkVariants = {
    hidden: { x: -5, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 100, 
        damping: 12 
      }
    },
    hover: { 
      x: 8, 
      color: '#60A5FA',
      transition: { 
        type: 'spring', 
        stiffness: 400, 
        damping: 10 
      } 
    }
  };

  // Check scroll position for showing the scroll top button
  useEffect(() => {
    const checkScrollPosition = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    
    window.addEventListener('scroll', checkScrollPosition);
    return () => window.removeEventListener('scroll', checkScrollPosition);
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulate real-time crypto price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCryptoData(prevData => prevData.map(crypto => ({
        ...crypto,
        price: crypto.price * (1 + (Math.random() * 0.01 - 0.005)),
        change: crypto.change + (Math.random() * 0.4 - 0.2)
      })));
    }, 7000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle newsletter subscription
  const handleSubscribe = (e) => {
    e.preventDefault();
    
    // Basic email validation
    if (!email.trim()) {
      setValidationError('Please enter your email address');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }
    
    // Clear any previous errors
    setValidationError('');
    
    // Simulate subscription success
    setSubscribed(true);
    setEmail('');
    
    // Reset subscription status after 5 seconds
    setTimeout(() => {
      setSubscribed(false);
    }, 5000);
  };

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="relative bg-gray-900 text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      
      {/* Live Crypto Ticker */}
      <div className="bg-black border-b border-gray-800">
        <div className="container mx-auto overflow-hidden">
          <div className="flex py-2 animate-marquee">
            {[...cryptoData, ...cryptoData].map((crypto, index) => (
              <div key={index} className="flex items-center mx-6 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="mr-2">{crypto.icon || crypto.id}</span>
                  <span className="font-medium">{crypto.name}</span>
                </div>
                <div className="ml-3 flex items-center">
                  <span className="font-bold">${crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className={`ml-2 text-xs ${crypto.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {crypto.change > 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Animated wave separator */}
      <div className="relative h-16 overflow-hidden">
        <div className="absolute w-full bottom-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
            className="absolute bottom-0"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            <path
              fill="#111827"
              fillOpacity="1"
              d="M0,128L48,144C96,160,192,192,288,186.7C384,181,480,139,576,128C672,117,768,139,864,170.7C960,203,1056,245,1152,234.7C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>
      </div>
      
      {/* Main footer content */}
      <div className="bg-gray-900 relative" 
           style={{
             backgroundImage: "radial-gradient(circle at 10% 20%, rgba(26, 32, 44, 1) 0%, rgba(17, 24, 39, 1) 81.3%), linear-gradient(90deg, rgba(50, 108, 229, 0.05) 0%, rgba(0, 0, 0, 0) 100%)",
             backgroundBlendMode: "normal",
           }}>
        <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="xl:grid xl:grid-cols-5 xl:gap-8">
            {/* Brand and company info */}
            <div className="space-y-8 xl:col-span-2">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={containerVariants}
              >
                <motion.div variants={itemVariants} className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">CT</span>
                  </div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                    Crypto TradeBot
                  </h3>
                </motion.div>
                
                <motion.p variants={itemVariants} className="mt-6 text-gray-300 max-w-md">
                  Your premier destination for intelligent cryptocurrency trading. Our advanced platform combines AI-powered insights with real-time market data to help you make smarter trading decisions.
                </motion.p>
                
                <motion.div variants={itemVariants} className="mt-8">
                  <p className="text-lg font-semibold text-white">Follow us</p>
                  <div className="mt-4 flex space-x-3">
                    {socialLinks.map((social, index) => (
                      <motion.a
                        key={index}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${social.color} w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`Follow us on ${social.name}`}
                      >
                        {social.icon}
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="mt-8">
                  <div className="flex items-center">
                    <span className="text-blue-400 mr-3"><Icons.Location /></span>
                    <p className="text-gray-300">123 Trading Avenue, San Francisco, CA 94158</p>
                  </div>
                  <div className="flex items-center mt-3">
                    <span className="text-blue-400 mr-3"><Icons.Phone /></span>
                    <p className="text-gray-300">+1 (888) 123-4567</p>
                  </div>
                  <div className="flex items-center mt-3">
                    <span className="text-blue-400 mr-3"><Icons.Email /></span>
                    <p className="text-gray-300">contact@cryptotradebot.com</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            
            {/* Navigation links sections */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 xl:col-span-3 xl:mt-0">
              {navSections.map((section, sectionIndex) => (
                <motion.div
                  key={sectionIndex}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={containerVariants}
                  className="flex flex-col"
                >
                  <motion.h3 
                    variants={itemVariants}
                    className="text-lg font-semibold text-white border-b border-blue-500 pb-2 inline-block"
                  >
                    {section.title}
                  </motion.h3>
                  <ul className="mt-4 space-y-3">
                    {section.links.map((link, linkIndex) => (
                      <motion.li key={linkIndex} variants={linkVariants}>
                        <motion.a
                          href={link.url}
                          className="flex items-center text-gray-300 hover:text-blue-400 transition-colors duration-300"
                          whileHover="hover"
                        >
                          <span className="text-blue-500 mr-2"><Icons.ChevronRight /></span>
                          {link.name}
                        </motion.a>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Newsletter and Features */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="mt-12 border-t border-gray-800 pt-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Newsletter Subscription */}
              <motion.div variants={itemVariants} className="bg-gray-800 bg-opacity-50 rounded-lg p-6 shadow-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Stay Updated</h3>
                <p className="text-gray-300 mb-6">
                  Subscribe to our newsletter for the latest market insights, trading strategies, and platform updates.
                </p>
                
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <label htmlFor="email-input" className="sr-only">Email address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icons.Email className="text-gray-400" />
                      </div>
                      <input
                        id="email-input"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-md bg-gray-700 bg-opacity-50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-800"
                        placeholder="Your email address"
                        aria-describedby="email-validation"
                        required
                      />
                    </div>
                    {validationError && (
                      <p id="email-validation" className="mt-2 text-sm text-red-400">
                        {validationError}
                      </p>
                    )}
                  </div>
                  
                  <motion.button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-md shadow-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Subscribe Now
                  </motion.button>
                  
                  <AnimatePresence>
                    {subscribed && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-green-800 bg-opacity-40 text-green-300 p-3 rounded-md flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Thank you for subscribing!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
                
                <p className="mt-4 text-sm text-gray-400">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </motion.div>
              
              {/* Features Highlight */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gray-800 bg-opacity-50 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
                  <div className="mb-4 h-12 w-12 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <Icons.Trends className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Real-time Analytics</h3>
                  <p className="text-gray-300">Access comprehensive market data and trends with our advanced analytics dashboard.</p>
                </div>
                
                <div className="bg-gray-800 bg-opacity-50 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
                  <div className="mb-4 h-12 w-12 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center">
                    <Icons.Bot className="text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Trading</h3>
                  <p className="text-gray-300">Our intelligent algorithms analyze market patterns to optimize your trading strategies.</p>
                </div>
                
                <div className="bg-gray-800 bg-opacity-50 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300 sm:col-span-2">
                  <div className="mb-4 h-12 w-12 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center">
                    <Icons.Security className="text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Enhanced Security</h3>
                  <p className="text-gray-300">Your assets are protected with military-grade encryption and multi-factor authentication.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Language selector and bottom content */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8 mb-6 md:mb-0">
                {/* Language selector */}
                <div ref={languageRef} className="relative">
                  <button
                    type="button"
                    className="flex items-center space-x-2 text-gray-300 hover:text-white focus:outline-none"
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    aria-expanded={showLanguageDropdown}
                    aria-haspopup="true"
                  >
                    <Icons.Globe />
                    <span>{languages.find(lang => lang.code === currentLanguage)?.name || 'English'}</span>
                    <svg className={`h-5 w-5 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {showLanguageDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute mt-2 z-10 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5"
                      >
                        <div className="py-1" role="menu" aria-orientation="vertical">
                          {languages.map((language) => (
                            <button
                              key={language.code}
                              onClick={() => {
                                setCurrentLanguage(language.code);
                                setShowLanguageDropdown(false);
                              }}
                              className={`${
                                currentLanguage === language.code ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                              } block px-4 py-2 text-sm w-full text-left transition-colors duration-150`}
                              role="menuitem"
                            >
                              {language.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Legal links */}
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                  <a href="/privacy-policy" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">
                    Privacy Policy
                  </a>
                  <a href="/terms-of-service" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">
                    Terms of Service
                  </a>
                  <a href="/cookies" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">
                    Cookie Policy
                  </a>
                  <a href="/sitemap" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">
                    Sitemap
                  </a>
                </div>
              </div>
              
              {/* Copyright text */}
              <div className="text-center md:text-right">
                <p className="text-gray-400 text-sm">
                  © {new Date().getFullYear()} Crypto TradeBot. All rights reserved.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Trading cryptocurrencies involves risk. Please invest responsibly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Back to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-blue-600 shadow-lg flex items-center justify-center text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Scroll to top"
          >
            <Icons.ArrowUp />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Custom animations */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-marquee {
          display: flex;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </footer>
  );
};

export default Footer;