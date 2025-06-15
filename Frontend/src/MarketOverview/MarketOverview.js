import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Core components
import Navbar from '../Components/Footer&Navbar/Navbar2';
import Footer from '../Components/Footer&Navbar/Footer';
import CoinPriceMarquee from '../Components/MarketOverview/CoinPriceMarquee';
import LoadingSpinner from '../Components/Common/LoadingSpinner';

// Lazy-loaded tab components
const CoinHeatmap = lazy(() => import('../Components/MarketOverview/CoinHeatmap'));
const CoinTicker = lazy(() => import('../Components/MarketOverview/CoinTicker'));
const CoinList = lazy(() => import('../Components/MarketOverview/CoinList'));
const Screener = lazy(() => import('../Components/MarketOverview/Screener'));
const FearGreed = lazy(() => import('../Components/MarketOverview/FearGreed'));
const TechnicalAnalysis = lazy(() => import('../Components/MarketOverview/TechnicalAnalysis'));
const TopStories = lazy(() => import('../Components/MarketOverview/top-stories'));
const LatestNews = lazy(() => import('../Components/MarketOverview/LatestNews'));
const TrendingNews = lazy(() => import('../Components/MarketOverview/TredingNews')); // Fixed typo in import
const CurrencyConverters = lazy(() => import('../Components/MarketOverview/CurrencyConverters'));

/**
 * MarketOverview - A comprehensive dashboard for cryptocurrency market data
 * 
 * Features:
 * - Responsive design with mobile and desktop layouts
 * - Tab-based navigation
 * - Code splitting with lazy loading for performance
 * - Animated transitions between tabs
 * - Persistent tab selection via localStorage
 */
const MarketOverview = () => {
    // Define tabs configuration
    const tabs = [
        { 
            id: 'heatmap', 
            label: 'Coin Heatmap', 
            icon: '🔥', 
            gradient: 'from-cyan-500 to-teal-600',
            description: 'Visual representation of market performance'
        },
        { 
            id: 'ticker', 
            label: 'Coin Ticker', 
            icon: '📊', 
            gradient: 'from-emerald-500 to-green-600',
            description: 'Real-time price updates for major cryptocurrencies'
        },
        { 
            id: 'list', 
            label: 'Coin List', 
            icon: '📋', 
            gradient: 'from-purple-500 to-violet-600',
            description: 'Detailed list of cryptocurrencies with key metrics'
        },
        { 
            id: 'screener', 
            label: 'Screener', 
            icon: '🔍', 
            gradient: 'from-rose-500 to-red-600',
            description: 'Advanced filtering and screening tools'
        },
        { 
            id: 'sentiment', 
            label: 'Market Sentiment', 
            icon: '😮', 
            gradient: 'from-red-500 to-rose-600',
            description: 'Fear & Greed index and social sentiment analysis'
        },
        { 
            id: 'technical', 
            label: 'Technical Analysis', 
            icon: '📈', 
            gradient: 'from-blue-500 to-sky-600',
            description: 'Advanced charting and technical indicators'
        },
        { 
            id: 'converters', 
            label: 'Currency Converters', 
            icon: '💱', 
            gradient: 'from-orange-500 to-yellow-600',
            description: 'Convert between cryptocurrencies and fiat currencies'
        },
        { 
            id: 'stories', 
            label: 'Top Stories', 
            icon: '📰', 
            gradient: 'from-pink-500 to-fuchsia-600',
            description: 'Featured articles and market insights'
        },
        { 
            id: 'news', 
            label: 'Crypto News', 
            icon: '📣', 
            gradient: 'from-indigo-500 to-blue-600',
            description: 'Latest updates and trending news in crypto'
        },
    ];

    // Initialize state with stored tab preference or default to first tab
    const [activeTab, setActiveTab] = useState(() => {
        const storedTab = localStorage.getItem('marketOverviewActiveTab');
        return storedTab && tabs.some(tab => tab.id === storedTab) ? storedTab : tabs[0].id;
    });
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check screen size and set up theme preference
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        
        // Initial checks
        checkScreenSize();
        
        // Set up event listeners
        window.addEventListener('resize', checkScreenSize);
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    // Save active tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('marketOverviewActiveTab', activeTab);
    }, [activeTab]);

    // Simulate loading delay for initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        
        return () => clearTimeout(timer);
    }, []);

    // Handle tab selection
    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    // Animation variants for tab content
    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.3 }
        },
        exit: { 
            opacity: 0, 
            y: -20,
            transition: { duration: 0.2 }
        }
    };

    // Render content for each tab
    const renderTabContent = () => {
        // Common wrapper for consistent styling
        const TabWrapper = ({ children, title, gradient }) => (
            <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
                className="bg-gray-900 text-white p-6 rounded-lg border border-gray-700 h-full shadow-lg"
            >
                <h2 className={`text-center text-2xl font-bold mb-6 bg-gradient-to-r ${gradient} text-white py-3 rounded-lg shadow-md`}>
                    {title}
                </h2>
                <div className="w-full">
                    <Suspense fallback={<div className="flex justify-center py-12"><LoadingSpinner size="large" /></div>}>
                        {children}
                    </Suspense>
                </div>
            </motion.div>
        );

        // Return appropriate content based on active tab
        switch (activeTab) {
            case 'heatmap':
                return (
                    <TabWrapper title="Coin Heatmap" gradient={tabs.find(t => t.id === 'heatmap').gradient}>
                        <CoinHeatmap />
                    </TabWrapper>
                );
            case 'ticker':
                return (
                    <TabWrapper title="Coin Ticker" gradient={tabs.find(t => t.id === 'ticker').gradient}>
                        <CoinTicker />
                    </TabWrapper>
                );
            case 'list':
                return (
                    <TabWrapper title="Coin List" gradient={tabs.find(t => t.id === 'list').gradient}>
                        <CoinList />
                    </TabWrapper>
                );
            case 'screener':
                return (
                    <TabWrapper title="Screener" gradient={tabs.find(t => t.id === 'screener').gradient}>
                        <Screener />
                    </TabWrapper>
                );
            case 'sentiment':
                return (
                    <TabWrapper title="Market Sentiment" gradient={tabs.find(t => t.id === 'sentiment').gradient}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">
                                    Crypto Fear & Greed Index
                                </h3>
                                <div className="flex items-center justify-center">
                                    <FearGreed type="crypto" />
                                </div>
                            </div>

                            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">
                                    Social Media Sentiment
                                </h3>
                                <div className="flex items-center justify-center">
                                    <FearGreed type="social" />
                                </div>
                            </div>
                        </div>
                    </TabWrapper>
                );
            case 'technical':
                return (
                    <TabWrapper title="Technical Analysis" gradient={tabs.find(t => t.id === 'technical').gradient}>
                        <TechnicalAnalysis 
                            symbol="BINANCE:BTCUSD" 
                            interval="1h" 
                            height={600}
                            theme="dark" 
                        />
                    </TabWrapper>
                );
            case 'converters':
                return (
                    <TabWrapper title="Currency Converters" gradient={tabs.find(t => t.id === 'converters').gradient}>
                        <CurrencyConverters />
                    </TabWrapper>
                );
            case 'stories':
                return (
                    <TabWrapper title="Market Top Stories" gradient={tabs.find(t => t.id === 'stories').gradient}>
                        <TopStories />
                    </TabWrapper>
                );
            case 'news':
                return (
                    <TabWrapper title="Crypto News" gradient={tabs.find(t => t.id === 'news').gradient}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">
                                    Latest Updates
                                </h3>
                                <LatestNews />
                            </div>
                            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">
                                    Trending News
                                </h3>
                                <TrendingNews />
                            </div>
                        </div>
                    </TabWrapper>
                );
            default:
                return null;
        }
    };

    // Mobile sidebar toggle button component
    const MobileSidebarToggle = () => (
        <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg flex items-center justify-center text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle navigation"
        >
            <motion.div
                animate={{ rotate: sidebarOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
            >
                {sidebarOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )}
            </motion.div>
        </motion.button>
    );

    // Desktop Tab Button Component
    const DesktopTabButton = ({ tab, isActive, onClick }) => (
        <motion.button
            onClick={onClick}
            className={`flex items-center space-x-2 mx-1 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md`
                    : 'text-gray-300 hover:bg-gray-800'
            }`}
            whileHover={{ scale: isActive ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <span>{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
        </motion.button>
    );

    // Mobile Tab Button Component
    const MobileTabButton = ({ tab, isActive, onClick }) => (
        <motion.button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white`
                    : 'text-gray-300 hover:bg-gray-800'
            }`}
            whileHover={{ scale: isActive ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex items-center space-x-3">
                <span className="text-xl">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
            </div>
            {isActive && (
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-white"
                />
            )}
        </motion.button>
    );

    // Show loading screen while initializing
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="text-center">
                    <div className="mb-4">
                        <LoadingSpinner size="large" />
                    </div>
                    <h2 className="text-xl text-white font-medium">Loading Market Overview...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen flex flex-col">
            {/* Fixed Header Elements */}
            <div className="sticky top-0 z-40">
                <Navbar />
                <CoinPriceMarquee />
                
                {/* Horizontal Tabs - Only visible on desktop */}
                <div className="hidden lg:block bg-gray-900 shadow-md">
                    <div className="container mx-auto px-4">
                        <div className="flex overflow-x-auto hide-scrollbar py-2">
                            {tabs.map((tab) => (
                                <DesktopTabButton
                                    key={tab.id}
                                    tab={tab}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col lg:flex-row relative">
                {/* Mobile sidebar toggle button */}
                <MobileSidebarToggle />
                
                {/* Vertical Tabs Sidebar - Only visible on mobile */}
                <motion.div 
                    className="lg:hidden fixed inset-y-0 left-0 z-30 w-72 bg-gray-900 shadow-xl pt-20 pb-6 overflow-y-auto"
                    initial={{ x: "-100%" }}
                    animate={{ x: sidebarOpen ? 0 : "-100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <nav className="px-4 space-y-2">
                        {tabs.map((tab) => (
                            <MobileTabButton
                                key={tab.id}
                                tab={tab}
                                isActive={activeTab === tab.id}
                                onClick={() => handleTabClick(tab.id)}
                            />
                        ))}
                    </nav>
                    
                    {/* Mobile sidebar footer */}
                    <div className="mt-8 px-6 py-4 border-t border-gray-800">
                        <p className="text-gray-400 text-sm">
                            Selected: <span className="text-white font-medium">{tabs.find(t => t.id === activeTab).label}</span>
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                            {tabs.find(t => t.id === activeTab).description}
                        </p>
                    </div>
                </motion.div>

                {/* Overlay to close sidebar when clicking outside */}
                {sidebarOpen && (
                    <motion.div 
                        className="lg:hidden fixed inset-0 bg-black z-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Tab Content */}
                <div className="flex-grow p-4 lg:p-8 pt-4 lg:pt-8">
                    <div className="max-w-6xl mx-auto">
                        <AnimatePresence mode="wait">
                            {renderTabContent()}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />
            
            {/* Global Styles */}
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }
                
                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default MarketOverview;