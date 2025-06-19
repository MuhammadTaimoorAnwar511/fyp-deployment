import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Scatter, ScatterChart, ZAxis
} from 'recharts';
import Navbar2 from "../Components/Footer&Navbar/Navbar2"
import { 
  RefreshCw, TrendingUp, Calendar, Clock, AlertCircle, Filter, ArrowUp, ArrowDown, 
  ChevronDown, Search, Info, BarChart2, PieChart as PieChartIcon, Activity,
  ThumbsUp, ThumbsDown, Zap, Settings, Download, Share, Menu, X, ChevronRight,
  Bell, Eye, Sun, Moon, ArrowUpRight, Bookmark, HelpCircle, Sliders, 
  Lock, Gift, Award, Star,Check, ChevronsRight, Database, BarChart as BarChartIcon,
  Layers, Hash, Cpu, FileText, Users, MessageCircle, SlidersHorizontal, Maximize
} from 'lucide-react';

const Tippy = ({ children, content }) => {
  return (
    <div className="group relative">
      {children}
      <div className="absolute z-50 hidden group-hover:flex bg-gray-800 text-white text-sm p-2 rounded shadow-lg -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap border border-gray-700">
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 border-r border-b border-gray-700 rotate-45"></div>
        {content}
      </div>
    </div>
  );
};

const TabBar = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="relative mb-6 border-b border-gray-700">
      <div className="relative flex -mb-px space-x-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center">
        <div className="w-12 h-full bg-gradient-to-r from-transparent to-gray-900 pointer-events-none"></div>
      </div>
    </div>
  );
};

const SentimentDashboard = () => {
  // Refs
  const fullscreenRef = useRef(null);
  
  // State variables
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allSentiment, setAllSentiment] = useState(null);
  const [dailySentiment, setDailySentiment] = useState({});
  const [weeklySentiment, setWeeklySentiment] = useState({});
  const [hourlySentiment, setHourlySentiment] = useState({});
  const [fiveMinSentiment, setFiveMinSentiment] = useState({});
  const [iterationsSentiment, setIterationsSentiment] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customDateRangeData, setCustomDateRangeData] = useState(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendDirection, setTrendDirection] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: 'Significant sentiment drop detected in the last hour', time: 'Just now' },
    { id: 2, type: 'info', message: 'System updated to version 2.1.0', time: '2 hours ago' },
    { id: 3, type: 'success', message: 'Reached 10,000 tweet analysis milestone', time: '1 day ago' }
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dataComparisonKey, setDataComparisonKey] = useState('sentiment');
  const [showInsights, setShowInsights] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState({
    minTweets: 0,
    minSentiment: 0,
    maxSentiment: 100,
    showNeutral: true,
    dateRange: 'all'
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [mockDataEndpoints, setMockDataEndpoints] = useState([]);

  // Theme color constants
  const COLORS = {
    primary: '#4f46e5', // Indigo-600
    secondary: '#6366f1', // Indigo-500
    accent: '#8b5cf6', // Violet-500
    accentSecondary: '#ec4899', // Pink-500
    background: {
      darkest: '#0f172a', // Slate-900
      darker: '#1e293b', // Slate-800
      dark: '#334155', // Slate-700
      medium: '#475569', // Slate-600
      light: '#64748b', // Slate-500
    },
    text: {
      primary: '#f8fafc', // Slate-50
      secondary: '#94a3b8', // Slate-400
      tertiary: '#cbd5e1', // Slate-300
    },
    success: {
      primary: '#22c55e', // Green-500
      light: '#4ade80', // Green-400
      dark: '#16a34a', // Green-600
      background: 'rgba(34, 197, 94, 0.1)',
    },
    error: {
      primary: '#ef4444', // Red-500
      light: '#f87171', // Red-400
      dark: '#dc2626', // Red-600
      background: 'rgba(239, 68, 68, 0.1)',
    },
    warning: {
      primary: '#f59e0b', // Amber-500
      light: '#fbbf24', // Amber-400
      dark: '#d97706', // Amber-600
      background: 'rgba(245, 158, 11, 0.1)',
    },
    info: {
      primary: '#3b82f6', // Blue-500
      light: '#60a5fa', // Blue-400
      dark: '#2563eb', // Blue-600
      background: 'rgba(59, 130, 246, 0.1)',
    },
    neutral: {
      primary: '#64748b', // Slate-500
      light: '#94a3b8', // Slate-400
      dark: '#475569', // Slate-600
      background: 'rgba(100, 116, 139, 0.1)',
    },
    chart: {
      positive: '#22c55e', // Green-500
      negative: '#ef4444', // Red-500
      neutral: '#64748b', // Slate-500
      blue: '#3b82f6', // Blue-500
      purple: '#8b5cf6', // Violet-500
      pink: '#ec4899', // Pink-500
      yellow: '#f59e0b', // Amber-500
      teal: '#14b8a6', // Teal-500
      gradient: ['#3b82f6', '#8b5cf6', '#6366f1']
    }
  };

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
    { id: 'detailed', label: 'Detailed Analysis', icon: <Layers className="h-4 w-4" /> },
    { id: 'realtime', label: 'Real-time Tracking', icon: <Activity className="h-4 w-4" /> },
    { id: 'custom', label: 'Custom Analysis', icon: <Sliders className="h-4 w-4" /> },
    { id: 'insights', label: 'AI Insights', icon: <Cpu className="h-4 w-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="h-4 w-4" /> },
    { id: 'audience', label: 'Audience', icon: <Users className="h-4 w-4" /> },
  ];

  // Mock data for fallback when APIs fail
  const getMockData = (apiName) => {
    const now = new Date();
    const generateTimeData = (intervals, intervalType) => {
      const data = {};
      for (let i = intervals - 1; i >= 0; i--) {
        let time;
        switch (intervalType) {
          case 'day':
            time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            break;
          case 'week':
            time = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            break;
          case 'hour':
            time = new Date(now.getTime() - i * 60 * 60 * 1000);
            break;
          case '5min':
            time = new Date(now.getTime() - i * 5 * 60 * 1000);
            break;
          case 'iteration':
            time = new Date(now.getTime() - i * 30 * 1000);
            break;
        }
        
        const sentiment = 45 + Math.random() * 20; // Random between 45-65
        const totalTweets = Math.floor(Math.random() * 1000) + 100;
        const positiveRatio = 0.3 + Math.random() * 0.4;
        const negativeRatio = 0.1 + Math.random() * 0.2;
        const neutralRatio = 1 - positiveRatio - negativeRatio;
        
        data[time.toISOString()] = {
          normalized_overall_weighted_sentiment_score: sentiment,
          overall_weighted_sentiment_score: (sentiment - 50) * 2,
          total_tweets: totalTweets,
          weighted_sentiment_counts: {
            positive: positiveRatio,
            neutral: neutralRatio,
            negative: negativeRatio
          }
        };
      }
      return data;
    };

    switch (apiName) {
      case 'all':
        return {
          normalized_overall_weighted_sentiment_score: 58.7,
          overall_weighted_sentiment_score: 17.4,
          total_tweets: 15420,
          weighted_sentiment_counts: {
            positive: 0.42,
            neutral: 0.38,
            negative: 0.20
          }
        };
      case 'daily':
        return generateTimeData(30, 'day');
      case 'weekly':
        return generateTimeData(12, 'week');
      case 'hourly':
        return generateTimeData(24, 'hour');
      case 'fiveMin':
        return generateTimeData(60, '5min');
      case 'iterations':
        return generateTimeData(100, 'iteration');
      default:
        return {};
    }
  };

  // Helper function to fetch with timeout and retry
  const fetchWithTimeout = async (url, timeout = 10000, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (err) {
        console.warn(`Attempt ${attempt + 1} failed for ${url}:`, err.message);
        if (attempt === maxRetries) {
          throw err;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null); // Clear any previous errors
    
    try {
      // Make all API calls in parallel with individual error handling
      const apiCalls = [
        { name: 'all', url: 'http://localhost:5001/get_weighted_sentiment_all' },
        { name: 'daily', url: 'http://localhost:5001/get_sentiment_by_day' },
        { name: 'weekly', url: 'http://localhost:5001/get_sentiment_by_week' },
        { name: 'hourly', url: 'http://localhost:5001/get_sentiment_by_hour' },
        { name: 'fiveMin', url: 'http://localhost:5001/get_sentiment_by_5min' },
        { name: 'iterations', url: `http://localhost:5001/get_sentiment_iterations?timestamp=${new Date().toISOString()}` }
      ];

      // Execute all calls in parallel
      const results = await Promise.allSettled(
        apiCalls.map(async (call) => {
          const data = await fetchWithTimeout(call.url);
          return { name: call.name, data };
        })
      );

            // Process results and handle partial failures with mock data fallback
      let successCount = 0;
      let mockDataUsed = [];
      const errors = [];

      results.forEach((result, index) => {
        const callName = apiCalls[index].name;
        let data;
        let isFromAPI = true;
        
        if (result.status === 'fulfilled') {
          successCount++;
          data = result.value.data;
        } else {
          // Use mock data as fallback
          data = getMockData(callName);
          mockDataUsed.push(callName);
          isFromAPI = false;
          errors.push(`${callName}: ${result.reason.message}`);
          console.warn(`Failed to fetch ${callName}, using mock data:`, result.reason);
        }
        
        // Process the data (either from API or mock)
        switch (callName) {
          case 'all':
            // Trend direction calculation
            if (allSentiment) {
              const prevScore = allSentiment.normalized_overall_weighted_sentiment_score;
              const newScore = data.normalized_overall_weighted_sentiment_score;
              setTrendDirection(newScore > prevScore ? 1 : newScore < prevScore ? -1 : 0);
              
              if (prevScore > 0) {
                const percentChange = ((newScore - prevScore) / prevScore) * 100;
                setTrendPercentage(percentChange);
              }
            }
            setAllSentiment(data);
            break;
          case 'daily':
            setDailySentiment(data);
            break;
          case 'weekly':
            setWeeklySentiment(data);
            break;
          case 'hourly':
            setHourlySentiment(data);
            break;
          case 'fiveMin':
            setFiveMinSentiment(data);
            break;
          case 'iterations':
            setIterationsSentiment(data);
            break;
        }
      });

      // Update state based on what happened
      setMockDataEndpoints(mockDataUsed);
      
      // Update state based on what happened (no toast notifications)
      if (mockDataUsed.length === apiCalls.length) {
        // All APIs failed, using all mock data
        setUsingMockData(true);
      } else if (mockDataUsed.length > 0) {
        // Some APIs failed, partial mock data - mixed real and mock
        setUsingMockData(false); // Not fully mock, so don't show "Demo Mode"
      } else if (successCount === apiCalls.length) {
        // All successful - clear any existing error state
        setUsingMockData(false);
        setMockDataEndpoints([]);
        setError(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Unexpected error in fetchData:', err);
      setError('An unexpected error occurred. Please try again later.');
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [allSentiment]);

  useEffect(() => {
    // Add a small delay to ensure backend is ready
    const initialLoad = setTimeout(() => {
      fetchData();
    }, 100);
    
    // Fallback to mock data if initial load takes too long (30 seconds)
    const fallbackTimeout = setTimeout(() => {
      if (loading && !allSentiment) {
        console.warn('Initial load taking too long, loading mock data for all endpoints...');
        // Manually set mock data for all endpoints as complete fallback
        setAllSentiment(getMockData('all'));
        setDailySentiment(getMockData('daily'));
        setWeeklySentiment(getMockData('weekly'));
        setHourlySentiment(getMockData('hourly'));
        setFiveMinSentiment(getMockData('fiveMin'));
        setIterationsSentiment(getMockData('iterations'));
        setUsingMockData(true); // All endpoints are mock in this case
        setMockDataEndpoints(['all', 'daily', 'weekly', 'hourly', 'fiveMin', 'iterations']);
        setLoading(false);
      }
    }, 30000);
    
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 300000);
    
    return () => {
      clearTimeout(initialLoad);
      clearTimeout(fallbackTimeout);
      clearInterval(refreshInterval);
    };
  }, [fetchData]);

  // Auto-dismiss toast messages
  useEffect(() => {
    if (toastMessage && toastMessage.duration) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, toastMessage.duration);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Chart data transformations
  const prepareTimeSeriesData = (data) => {
    if (!data) return [];
    return Object.entries(data).map(([time, sentiment]) => ({
      time,
      sentiment: sentiment.normalized_overall_weighted_sentiment_score || 50,
      positive: sentiment.weighted_sentiment_counts?.positive || 0,
      neutral: sentiment.weighted_sentiment_counts?.neutral || 0,
      negative: sentiment.weighted_sentiment_counts?.negative || 0,
      totalTweets: sentiment.total_tweets || 0,
      rawScore: sentiment.overall_weighted_sentiment_score || 0
    })).sort((a, b) => new Date(a.time) - new Date(b.time));
  };

  const dailyData = prepareTimeSeriesData(dailySentiment);
  const weeklyData = prepareTimeSeriesData(weeklySentiment);
  const hourlyData = prepareTimeSeriesData(hourlySentiment);
  const fiveMinData = prepareTimeSeriesData(fiveMinSentiment);

  const iterationsData = Object.entries(iterationsSentiment).map(([time, sentiment]) => ({
    time,
    sentiment: sentiment.normalized_overall_weighted_sentiment_score || 50,
    totalTweets: sentiment.total_tweets || 0,
    rawScore: sentiment.overall_weighted_sentiment_score || 0
  })).sort((a, b) => new Date(a.time) - new Date(b.time));

  // Pie data
  const preparePieData = (data) => {
    if (!data || data.length === 0) return [];
    const totals = data.reduce((acc, item) => {
      acc.positive += item.positive || 0;
      acc.neutral += item.neutral || 0;
      acc.negative += item.negative || 0;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });
    return [
      { name: 'Positive', value: totals.positive, color: COLORS.chart.positive },
      { name: 'Neutral', value: totals.neutral, color: COLORS.chart.neutral },
      { name: 'Negative', value: totals.negative, color: COLORS.chart.negative }
    ];
  };

  // Radar data
  const generateRadarData = (data) => {
    if (!data || data.length === 0) return [];
    const last5Points = data.slice(-5);
    return [
      {
        subject: "Sentiment",
        A: last5Points.reduce((acc, item) => acc + item.sentiment, 0) / last5Points.length / 100,
        fullMark: 1,
      },
      {
        subject: "Positive",
        A: last5Points.reduce((acc, item) => acc + item.positive, 0) / last5Points.length,
        fullMark: 1,
      },
      {
        subject: "Neutral",
        A: last5Points.reduce((acc, item) => acc + item.neutral, 0) / last5Points.length,
        fullMark: 1,
      },
      {
        subject: "Negative",
        A: last5Points.reduce((acc, item) => acc + item.negative, 0) / last5Points.length,
        fullMark: 1,
      },
      {
        subject: "Volume",
        A: Math.min(last5Points.reduce((acc, item) => acc + item.totalTweets, 0) / last5Points.length / 100, 1),
        fullMark: 1,
      },
    ];
  };

  const getSentimentColor = (score) => {
    if (score >= 70) return COLORS.success.primary;
    if (score >= 55) return COLORS.success.light;
    if (score >= 45) return COLORS.neutral.primary;
    if (score >= 30) return COLORS.error.light;
    return COLORS.error.primary;
  };

  const getSentimentText = (score) => {
    if (score >= 70) return 'Very Positive';
    if (score >= 55) return 'Positive';
    if (score >= 45) return 'Neutral';
    if (score >= 30) return 'Negative';
    return 'Very Negative';
  };

  const formatTime = (time) => {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (time) => {
    const date = new Date(time);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (time) => {
    const date = new Date(time);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleRefresh = () => {
    fetchData();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (fullscreenRef.current.requestFullscreen) {
        fullscreenRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleCustomDateRange = async () => {
    try {
      const rangeResponse = await fetch(`http://localhost:5001/get_sentiment_range?start=${selectedDate}&end=${new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0]}`);
      const rangeData = await rangeResponse.json();
      setCustomDateRangeData(rangeData);
    } catch (err) {
      setError('Failed to fetch custom date range data.');
    }
  };

  const handleCompareRanges = async () => {
    try {
      const startResponse = await fetch(`http://localhost:5001/get_sentiment_range?start=${startDate}&end=${endDate}`);
      const startData = await startResponse.json();
      setCustomDateRangeData(startData);
    } catch (err) {
      setError('Failed to fetch comparison data.');
    }
  };

  const getCurrentDataSet = () => {
    switch (timeRange) {
      case 'day': return dailyData;
      case 'week': return weeklyData;
      case 'month': return weeklyData;
      case 'hour': return hourlyData;
      case '5min': return fiveMinData;
      default: return dailyData;
    }
  };

  // Key metrics
  const keyMetrics = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return null;
    const last7Days = dailyData.slice(-7);
    const previousWeek = dailyData.slice(-14, -7);
    const avgSentiment = last7Days.reduce((acc, item) => acc + item.sentiment, 0) / last7Days.length;
    const prevAvgSentiment = previousWeek.length > 0 
      ? previousWeek.reduce((acc, item) => acc + item.sentiment, 0) / previousWeek.length 
      : 0;
    const sentimentChange = prevAvgSentiment > 0 
      ? ((avgSentiment - prevAvgSentiment) / prevAvgSentiment) * 100 
      : 0;
    const totalTweets = last7Days.reduce((acc, item) => acc + item.totalTweets, 0);
    const prevTotalTweets = previousWeek.reduce((acc, item) => acc + item.totalTweets, 0);
    const volumeChange = prevTotalTweets > 0 
      ? ((totalTweets - prevTotalTweets) / prevTotalTweets) * 100 
      : 0;
    const mostPositiveDay = [...last7Days].sort((a, b) => b.sentiment - a.sentiment)[0];
    const mostNegativeDay = [...last7Days].sort((a, b) => a.sentiment - b.sentiment)[0];
    const mean = avgSentiment;
    const squaredDiffs = last7Days.map(item => Math.pow(item.sentiment - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / squaredDiffs.length;
    const volatility = Math.sqrt(variance);

    return {
      avgSentiment,
      sentimentChange,
      totalTweets,
      volumeChange,
      mostPositiveDay,
      mostNegativeDay,
      volatility
    };
  }, [dailyData]);

  // AI insights
  const aiInsights = useMemo(() => {
    if (!keyMetrics) return [];
    const insights = [];
    if (Math.abs(keyMetrics.sentimentChange) > 5) {
      insights.push({
        id: 1,
        type: keyMetrics.sentimentChange > 0 ? 'positive' : 'negative',
        title: keyMetrics.sentimentChange > 0 
          ? 'Positive Sentiment Trend' 
          : 'Negative Sentiment Trend',
        description: keyMetrics.sentimentChange > 0
          ? `Sentiment has improved by ${keyMetrics.sentimentChange.toFixed(1)}% compared to the previous week.`
          : `Sentiment has declined by ${Math.abs(keyMetrics.sentimentChange).toFixed(1)}% compared to the previous week.`,
        icon: keyMetrics.sentimentChange > 0 ? <ArrowUpRight /> : <ArrowDown />
      });
    }
    if (Math.abs(keyMetrics.volumeChange) > 10) {
      insights.push({
        id: 2,
        type: 'info',
        title: keyMetrics.volumeChange > 0 
          ? 'Increased Twitter Activity' 
          : 'Decreased Twitter Activity',
        description: keyMetrics.volumeChange > 0
          ? `Tweet volume has increased by ${keyMetrics.volumeChange.toFixed(1)}% compared to the previous week.`
          : `Tweet volume has decreased by ${Math.abs(keyMetrics.volumeChange).toFixed(1)}% compared to the previous week.`,
        icon: <MessageCircle />
      });
    }
    if (keyMetrics.volatility > 15) {
      insights.push({
        id: 3,
        type: 'warning',
        title: 'High Sentiment Volatility',
        description: `Sentiment has been highly volatile with a standard deviation of ${keyMetrics.volatility.toFixed(1)} points.`,
        icon: <Activity />
      });
    }
    if (keyMetrics.mostPositiveDay && keyMetrics.mostNegativeDay) {
      insights.push({
        id: 4,
        type: 'info',
        title: 'Sentiment Peaks',
        description: `Peak positive sentiment was on ${formatDate(keyMetrics.mostPositiveDay.time)} (${Math.round(keyMetrics.mostPositiveDay.sentiment)}), while the lowest was on ${formatDate(keyMetrics.mostNegativeDay.time)} (${Math.round(keyMetrics.mostNegativeDay.sentiment)}).`,
        icon: <TrendingUp />
      });
    }
    return insights;
  }, [keyMetrics]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 border border-gray-700 rounded-md shadow-lg">
          <p className="text-gray-300 mb-1 font-medium">{formatFullDate(label)} {formatTime(label)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm flex items-center">
              <span className="w-3 h-3 inline-block mr-2" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const dismissAlert = (id) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const StatusBadge = ({ status, text }) => {
    let bgColor, textColor, icon;
    switch (status) {
      case 'success':
        bgColor = 'bg-green-900 bg-opacity-20';
        textColor = 'text-green-400';
        icon = <Check className="w-3 h-3 mr-1" />;
        break;
      case 'warning':
        bgColor = 'bg-yellow-900 bg-opacity-20';
        textColor = 'text-yellow-400';
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
      case 'error':
        bgColor = 'bg-red-900 bg-opacity-20';
        textColor = 'text-red-400';
        icon = <X className="w-3 h-3 mr-1" />;
        break;
      case 'info':
      default:
        bgColor = 'bg-blue-900 bg-opacity-20';
        textColor = 'text-blue-400';
        icon = <Info className="w-3 h-3 mr-1" />;
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {icon}
        {text}
      </span>
    );
  };

  if (loading && !isRefreshing && !allSentiment) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading sentiment data...</p>
          <p className="mt-2 text-sm text-gray-400">If this takes too long, demo data will be loaded automatically</p>
        </div>
      </div>
    );
  }



  return (
    <>
    <Navbar2/>
    <div ref={fullscreenRef} className="min-h-screen bg-gray-900 text-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out z-30 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-indigo-500" />
            <h1 className="text-xl font-bold text-white">SentiMeter</h1>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">Main Navigation</h3>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-indigo-900 bg-opacity-40 text-indigo-300'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">Quick Actions</h3>
            </div>
            <div className="space-y-1">
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700">
                <Download className="h-4 w-4 mr-3" />
                Export Data
              </button>
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700">
                <Share className="h-4 w-4 mr-3" />
                Share Dashboard
              </button>
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700">
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </button>
            </div>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">System Status</h3>
            </div>
            <div className="bg-gray-700 rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">API Status</span>
                <StatusBadge status="success" text="Online" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Last Update</span>
                <span className="text-sm text-gray-400">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Data Points</span>
                <span className="text-sm text-gray-400">{dailyData.length + hourlyData.length + fiveMinData.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
              {/* Toast Notification */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg border ${
            toastMessage.type === 'warning' ? 'bg-yellow-900 border-yellow-700' :
            toastMessage.type === 'error' ? 'bg-red-900 border-red-700' :
            toastMessage.type === 'success' ? 'bg-green-900 border-green-700' :
            'bg-blue-900 border-blue-700'
          }`}>
            <div className="flex items-start">
              <div className={`mr-3 ${
                toastMessage.type === 'warning' ? 'text-yellow-400' :
                toastMessage.type === 'error' ? 'text-red-400' :
                toastMessage.type === 'success' ? 'text-green-400' :
                'text-blue-400'
              }`}>
                {toastMessage.type === 'warning' ? <AlertCircle className="h-5 w-5" /> :
                 toastMessage.type === 'error' ? <X className="h-5 w-5" /> :
                 toastMessage.type === 'success' ? <Check className="h-5 w-5" /> :
                 <Info className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{toastMessage.message}</p>
              </div>
              <button 
                onClick={() => setToastMessage(null)}
                className="ml-3 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="md:pl-64">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 shadow-sm sticky top-0 z-10">
          <div className="max-w-full mx-auto px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <button 
                className="mr-4 md:hidden text-gray-300 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden sm:flex items-center">
                <span className="text-gray-400 text-sm mr-2">Active View:</span>
                <span className="font-medium text-white">{tabs.find(tab => tab.id === activeTab)?.label}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center mr-4">
                <span className="text-sm text-gray-400 mr-2">Updated:</span>
                <span className="text-sm font-medium text-gray-300">{new Date().toLocaleString()}</span>
                {usingMockData && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 bg-opacity-30 text-yellow-400 border border-yellow-700">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1.5 animate-pulse"></div>
                    All Data
                  </span>
                )}
                {!usingMockData && mockDataEndpoints.length > 0 && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 bg-opacity-30 text-blue-400 border border-blue-700">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-1.5"></div>
                    Mixed Data ({mockDataEndpoints.length} demo)
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Tippy content="Toggle alerts">
                  <button 
                    onClick={() => setShowAlerts(!showAlerts)}
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {alerts.length > 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>
                </Tippy>
                
                <Tippy content="Toggle theme">
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                </Tippy>
                
                <Tippy content="Fullscreen">
                  <button 
                    onClick={toggleFullscreen}
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </Tippy>
                
                <Tippy content={
                  usingMockData ? "Reconnect to server (all demo data)" : 
                  mockDataEndpoints.length > 0 ? `Refresh data (${mockDataEndpoints.length} endpoints using demo data)` :
                  "Refresh data"
                }>
                  <button 
                    onClick={handleRefresh}
                    className={`p-2 rounded-full hover:bg-gray-700 transition-colors relative ${
                      isRefreshing ? 'text-indigo-400' : 
                      usingMockData ? 'text-yellow-400 hover:text-yellow-300' : 
                      mockDataEndpoints.length > 0 ? 'text-blue-400 hover:text-blue-300' :
                      'text-gray-400 hover:text-white'
                    }`}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {usingMockData && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                    {!usingMockData && mockDataEndpoints.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full"></div>
                    )}
                  </button>
                </Tippy>
              </div>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {showAlerts && alerts.length > 0 && (
          <div className="bg-gray-800 border-b border-gray-700 p-3">
            <div className="max-w-full mx-auto px-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Alerts & Notifications</h3>
                <button 
                  className="text-xs text-gray-400 hover:text-white"
                  onClick={() => setAlerts([])}
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`flex items-start justify-between p-3 rounded-md border ${
                      alert.type === 'warning' ? 'border-yellow-700 bg-yellow-900 bg-opacity-20' :
                      alert.type === 'success' ? 'border-green-700 bg-green-900 bg-opacity-20' :
                      alert.type === 'error' ? 'border-red-700 bg-red-900 bg-opacity-20' :
                      'border-blue-700 bg-blue-900 bg-opacity-20'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span 
                          className={`mr-2 ${
                            alert.type === 'warning' ? 'text-yellow-400' :
                            alert.type === 'success' ? 'text-green-400' :
                            alert.type === 'error' ? 'text-red-400' :
                            'text-blue-400'
                          }`}
                        >
                          {alert.type === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                           alert.type === 'success' ? <Check className="h-4 w-4" /> :
                           alert.type === 'error' ? <X className="h-4 w-4" /> :
                           <Info className="h-4 w-4" />}
                        </span>
                        <p className="text-sm font-medium text-white">{alert.message}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-6">{alert.time}</p>
                    </div>
                    <button 
                      className="ml-4 text-gray-400 hover:text-white"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="max-w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Overall sentiment summary */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700 hover:shadow-lg transition-shadow md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium text-white">Overall Sentiment</h2>
                <div className="flex items-center">
                  {trendDirection !== 0 && (
                    <div className={`flex items-center mr-2 ${trendDirection > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trendDirection > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      <span className="text-sm ml-1">{Math.abs(trendPercentage).toFixed(1)}%</span>
                    </div>
                  )}
                  <TrendingUp className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="text-5xl font-bold text-white mb-3 sm:mb-0 sm:mr-6">
                  {allSentiment ? Math.round(allSentiment.normalized_overall_weighted_sentiment_score) : 'N/A'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <div 
                      className={`h-4 w-4 rounded-full mr-2`}
                      style={{ backgroundColor: getSentimentColor(allSentiment?.normalized_overall_weighted_sentiment_score) }}
                    ></div>
                    <span className={`font-medium text-lg`} style={{ color: getSentimentColor(allSentiment?.normalized_overall_weighted_sentiment_score) }}>
                      {getSentimentText(allSentiment?.normalized_overall_weighted_sentiment_score)}
                    </span>
                  </div>
                  <div className="text-gray-400 mt-1 mb-2">Based on {allSentiment?.total_tweets|| 0} tweets</div>
                  
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${allSentiment?.normalized_overall_weighted_sentiment_score || 50}%`,
                        backgroundColor: getSentimentColor(allSentiment?.normalized_overall_weighted_sentiment_score)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium text-white">Today's Sentiment</h2>
                <Calendar className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-4xl font-bold text-white">
                  {dailyData.length > 0 && dailyData[dailyData.length - 1]
                    ? Math.round(dailyData[dailyData.length - 1].sentiment)
                    : 'N/A'}
                </div>
                <div className="text-sm flex-1">
                  <div className={`font-medium`} style={{ color: dailyData.length > 0 ? getSentimentColor(dailyData[dailyData.length - 1]?.sentiment) : COLORS.chart.neutral }}>
                    {dailyData.length > 0 ? getSentimentText(dailyData[dailyData.length - 1]?.sentiment) : 'N/A'}
                  </div>
                  <div className="text-gray-400 mt-1">
                    {dailyData.length > 0 ? dailyData[dailyData.length - 1]?.totalTweets.toLocaleString() || 0 : 0} tweets
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium text-white">Last Hour</h2>
                <Clock className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-4xl font-bold text-white">
                  {hourlyData.length > 0 && hourlyData[hourlyData.length - 1]
                    ? Math.round(hourlyData[hourlyData.length - 1].sentiment)
                    : 'N/A'}
                </div>
                <div className="text-sm flex-1">
                  <div className={`font-medium`} style={{ color: hourlyData.length > 0 ? getSentimentColor(hourlyData[hourlyData.length - 1]?.sentiment) : COLORS.chart.neutral }}>
                    {hourlyData.length > 0 ? getSentimentText(hourlyData[hourlyData.length - 1]?.sentiment) : 'N/A'}
                  </div>
                  <div className="text-gray-400 mt-1">
                    {hourlyData.length > 0 ? hourlyData[hourlyData.length - 1]?.totalTweets.toLocaleString() || 0 : 0} tweets
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sentiment scoring legend */}
          <div className="mb-8 bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <Info className="h-5 w-5 mr-2 text-indigo-400" />
                <span className="text-gray-300 text-sm">Sentiment Score Scale:</span>
              </div>
              <div className="flex items-center space-x-4 text-sm flex-wrap justify-center">
                <div className="flex items-center mb-2 sm:mb-0">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                  <span className="text-gray-300">0-30: Very Negative</span>
                </div>
                <div className="flex items-center mb-2 sm:mb-0">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-300 mr-2"></span>
                  <span className="text-gray-300">30-45: Negative</span>
                </div>
                <div className="flex items-center mb-2 sm:mb-0">
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                  <span className="text-gray-300">45-55: Neutral</span>
                </div>
                <div className="flex items-center mb-2 sm:mb-0">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-300 mr-2"></span>
                  <span className="text-gray-300">55-70: Positive</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  <span className="text-gray-300">70-100: Very Positive</span>
                </div>
              </div>
            </div>
          </div>

          <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 mb-6 bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === 'day' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setTimeRange('day')}
                >
                  Day
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setTimeRange('week')}
                >
                  Week
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setTimeRange('month')}
                >
                  Month
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === 'hour' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setTimeRange('hour')}
                >
                  Hourly
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === '5min' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setTimeRange('5min')}
                >
                  5-Minute
                </button>
                <div className="ml-auto">
                  <button className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white">
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sentiment trend chart */}
                <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-white">Sentiment Trend</h2>
                    <div className="flex items-center text-gray-400 text-sm">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span>
                        {timeRange === 'day' ? 'Daily' : 
                         timeRange === 'week' ? 'Weekly' : 
                         timeRange === 'month' ? 'Monthly' : 
                         timeRange === 'hour' ? 'Hourly' : '5-Minute'} Trend
                      </span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getCurrentDataSet()}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="time" 
                          tickFormatter={
                            timeRange === 'day' || timeRange === 'week' || timeRange === 'month' 
                              ? formatDate 
                              : formatTime
                          } 
                          stroke="#94a3b8"
                        />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="sentiment"
                          stroke={COLORS.primary}
                          fillOpacity={1}
                          fill="url(#sentimentGradient)"
                          name="Sentiment Score"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sentiment" 
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 2, fill: "#1e293b" }}
                          activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
                          name="Sentiment Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie chart */}
                <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-white">Sentiment Distribution</h2>
                    <PieChartIcon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(getCurrentDataSet())}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={true}
                        >
                          {preparePieData(getCurrentDataSet()).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}`, 'Value']} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Tweet volume chart */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Tweet Volume</h2>
                  <BarChart2 className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getCurrentDataSet()}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="colorTweets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={
                          timeRange === 'day' || timeRange === 'week' || timeRange === 'month' 
                            ? formatDate 
                            : formatTime
                        }
                        stroke="#94a3b8"
                      />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="totalTweets" 
                        name="Tweet Count" 
                        radius={[4, 4, 0, 0]} 
                        fill="url(#colorTweets)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sentiment breakdown */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Sentiment Breakdown</h2>
                  <div className="flex space-x-3">
                    <div className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-green-500 mr-1"></span>
                      <span className="text-xs text-gray-400">Positive</span>
                    </div>
                    <div className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-gray-500 mr-1"></span>
                      <span className="text-xs text-gray-400">Neutral</span>
                    </div>
                    <div className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-red-500 mr-1"></span>
                      <span className="text-xs text-gray-400">Negative</span>
                    </div>
                  </div>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={getCurrentDataSet()}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      stackOffset="expand"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={
                          timeRange === 'day' || timeRange === 'week' || timeRange === 'month' 
                            ? formatDate 
                            : formatTime
                        }
                        stroke="#94a3b8"
                      />
                      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} stroke="#94a3b8" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="positive" 
                        stackId="1" 
                        stroke={COLORS.chart.positive} 
                        fill={COLORS.chart.positive} 
                        name="Positive" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="neutral" 
                        stackId="1" 
                        stroke={COLORS.chart.neutral} 
                        fill={COLORS.chart.neutral} 
                        name="Neutral" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="negative" 
                        stackId="1" 
                        stroke={COLORS.chart.negative} 
                        fill={COLORS.chart.negative} 
                        name="Negative" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar chart */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Multi-dimensional Analysis</h2>
                  <Activity className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} width={730} height={250} data={generateRadarData(getCurrentDataSet())}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: '#94a3b8' }} />
                      <Radar name="Current Period" dataKey="A" stroke={COLORS.chart.purple} fill={COLORS.chart.purple} fillOpacity={0.6} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Analysis Tab */}
          {activeTab === 'detailed' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly sentiment */}
                <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-white">Hourly Sentiment</h2>
                    <Clock className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={hourlyData.slice(-24)}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.chart.blue} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={COLORS.chart.blue} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" tickFormatter={formatTime} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="sentiment"
                          stroke={COLORS.chart.blue}
                          fillOpacity={1}
                          fill="url(#hourlyGradient)"
                          name="Sentiment Score"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sentiment" 
                          stroke={COLORS.chart.blue} 
                          strokeWidth={2}
                          name="Sentiment Score"
                          dot={{ r: 2, strokeWidth: 2, fill: "#1e293b" }}
                          activeDot={{ r: 6, stroke: COLORS.chart.blue, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily sentiment */}
                <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-white">Daily Sentiment</h2>
                    <Calendar className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dailyData.slice(-30)}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.chart.purple} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={COLORS.chart.purple} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" tickFormatter={formatDate} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="sentiment"
                          stroke={COLORS.chart.purple}
                          fillOpacity={1}
                          fill="url(#dailyGradient)"
                          name="Sentiment Score"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sentiment" 
                          stroke={COLORS.chart.purple} 
                          strokeWidth={2}
                          name="Sentiment Score"
                          dot={{ r: 2, strokeWidth: 2, fill: "#1e293b" }}
                          activeDot={{ r: 6, stroke: COLORS.chart.purple, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Positive/Negative Balance */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Positive vs. Negative Balance</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <ThumbsUp className="h-4 w-4 mr-1 text-green-500" />
                      <span className="text-sm text-gray-300">Positive</span>
                    </div>
                    <div className="flex items-center">
                      <ThumbsDown className="h-4 w-4 mr-1 text-red-500" />
                      <span className="text-sm text-gray-300">Negative</span>
                    </div>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dailyData.slice(-30)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" tickFormatter={formatDate} stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="positive" 
                        stackId="sentiments"
                        stroke={COLORS.chart.positive} 
                        fill={COLORS.chart.positive} 
                        name="Positive"
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="negative" 
                        stackId="sentiments"
                        stroke={COLORS.chart.negative} 
                        fill={COLORS.chart.negative} 
                        name="Negative"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Raw Score vs Normalized Score */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Raw Score vs Normalized Score</h2>
                  <Zap className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dailyData.slice(-14)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" tickFormatter={formatDate} stroke="#94a3b8" />
                      {/* Provide two Y axes for the lines referencing them */}
                      <YAxis yAxisId="left" stroke="#94a3b8" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke={COLORS.chart.purple} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="rawScore" 
                        stroke={COLORS.chart.blue} 
                        name="Raw Score"
                        dot={{ r: 2, strokeWidth: 2, fill: "#1e293b" }}
                        activeDot={{ r: 6, stroke: COLORS.chart.blue, strokeWidth: 2 }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="sentiment" 
                        stroke={COLORS.chart.purple} 
                        name="Normalized Score"
                        dot={{ r: 2, strokeWidth: 2, fill: "#1e293b" }}
                        activeDot={{ r: 6, stroke: COLORS.chart.purple, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Advanced Metrics Table */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Advanced Metrics</h2>
                  <Hash className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Metric</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last 7 Days</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Previous 7 Days</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Average Sentiment</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics ? keyMetrics.avgSentiment.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics && keyMetrics.prevAvgSentiment ? keyMetrics.prevAvgSentiment.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {keyMetrics && (
                            <span className={keyMetrics.sentimentChange > 0 ? 'text-green-500' : keyMetrics.sentimentChange < 0 ? 'text-red-500' : 'text-gray-400'}>
                              {keyMetrics.sentimentChange > 0 ? '+' : ''}{keyMetrics.sentimentChange.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Total Tweets</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics ? keyMetrics.totalTweets.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics && keyMetrics.prevTotalTweets ? keyMetrics.prevTotalTweets.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {keyMetrics && (
                            <span className={keyMetrics.volumeChange > 0 ? 'text-green-500' : keyMetrics.volumeChange < 0 ? 'text-red-500' : 'text-gray-400'}>
                              {keyMetrics.volumeChange > 0 ? '+' : ''}{keyMetrics.volumeChange.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Sentiment Volatility</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics ? keyMetrics.volatility.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">-</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">-</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Peak Positive Day</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics && keyMetrics.mostPositiveDay ? `${formatDate(keyMetrics.mostPositiveDay.time)} (${Math.round(keyMetrics.mostPositiveDay.sentiment)})` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">-</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">-</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Peak Negative Day</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {keyMetrics && keyMetrics.mostNegativeDay ? `${formatDate(keyMetrics.mostNegativeDay.time)} (${Math.round(keyMetrics.mostNegativeDay.sentiment)})` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">-</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Tracking Tab */}
          {activeTab === 'realtime' && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <h2 className="text-base font-medium text-white">Real-time Sentiment Tracking</h2>
                  <div className="mt-2 md:mt-0 flex items-center">
                    <span className="text-sm text-gray-400 mr-2">Auto-refresh:</span>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input 
                        type="checkbox" 
                        name="toggle" 
                        id="auto-refresh" 
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        defaultChecked
                      />
                      <label 
                        htmlFor="auto-refresh" 
                        className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-700 cursor-pointer"
                      ></label>
                    </div>
                    <button 
                      onClick={handleRefresh}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300 text-sm rounded-md flex items-center ml-2"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                    </button>
                  </div>
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={iterationsData.slice(-100)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="realtimeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.chart.blue} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={COLORS.chart.blue} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={formatTime}
                        minTickGap={60}
                        stroke="#94a3b8"
                      />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="sentiment"
                        stroke={COLORS.chart.blue}
                        fillOpacity={1}
                        fill="url(#realtimeGradient)"
                        name="Sentiment Score"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sentiment" 
                        stroke={COLORS.chart.blue} 
                        dot={false} 
                        name="Sentiment Score"
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg flex flex-col">
                    <div className="text-sm text-gray-400 mb-1">Latest Sentiment</div>
                    <div className="flex items-center">
                      <div 
                        className="text-2xl font-bold mr-2"
                        style={{ color: iterationsData.length > 0 ? getSentimentColor(iterationsData[iterationsData.length - 1]?.sentiment) : COLORS.chart.neutral }}
                      >
                        {iterationsData.length > 0 ? Math.round(iterationsData[iterationsData.length - 1]?.sentiment) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-300">
                        {iterationsData.length > 0 ? getSentimentText(iterationsData[iterationsData.length - 1]?.sentiment) : 'N/A'}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {iterationsData.length > 1 ? (
                        <div className="flex items-center">
                          {iterationsData[iterationsData.length - 1].sentiment > iterationsData[iterationsData.length - 2].sentiment ? (
                            <ArrowUp className="h-3 w-3 text-green-400 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-red-400 mr-1" />
                          )}
                          <span>
                            {Math.abs(iterationsData[iterationsData.length - 1].sentiment - iterationsData[iterationsData.length - 2].sentiment).toFixed(2)} points
                            {iterationsData[iterationsData.length - 1].sentiment > iterationsData[iterationsData.length - 2].sentiment ? ' increase' : ' decrease'}
                          </span>
                        </div>
                      ) : 'No change data available'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Total Tweets Analyzed</div>
                    <div className="text-2xl font-bold text-white">
                      {iterationsData.length > 0 ? iterationsData[iterationsData.length - 1]?.totalTweets.toLocaleString() : 'N/A'}
                    </div>
                    <div className="mt-2 w-full bg-gray-600 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400 flex justify-between">
                      <span>Daily goal: 65%</span>
                      <span>Target: 10,000</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Raw Sentiment Score</div>
                    <div className="text-2xl font-bold text-white">
                      {iterationsData.length > 0 ? iterationsData[iterationsData.length - 1]?.rawScore.toFixed(2) : 'N/A'}
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-400">
                      <div>Min: {iterationsData.length > 0 ? Math.min(...iterationsData.map(d => d.rawScore)).toFixed(2) : 'N/A'}</div>
                      <div>Max: {iterationsData.length > 0 ? Math.max(...iterationsData.map(d => d.rawScore)).toFixed(2) : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Minute Intervals */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">5-Minute Interval Analysis</h2>
                  <Clock className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={fiveMinData.slice(-60)} // Last 60 intervals
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" tickFormatter={formatTime} stroke="#94a3b8" />
                      {/* Provide two Y axes, because we have one line referencing yAxisId='right' */}
                      <YAxis stroke="#94a3b8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sentiment" 
                        stroke={COLORS.chart.purple} 
                        name="Sentiment Score"
                        strokeWidth={2}
                        dot={{ r: 1 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalTweets" 
                        yAxisId="right" 
                        stroke={COLORS.chart.teal} 
                        name="Tweet Count"
                        strokeWidth={1}
                        dot={{ r: 1 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tweet Volume Heatmap */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Recent Tweet Activity</h2>
                  <Activity className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-gray-300">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 bg-gray-700 text-left text-xs font-medium text-gray-400 uppercase tracking-wider rounded-tl-lg">Time</th>
                        <th className="px-4 py-3 bg-gray-700 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume</th>
                        <th className="px-4 py-3 bg-gray-700 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sentiment</th>
                        <th className="px-4 py-3 bg-gray-700 text-left text-xs font-medium text-gray-400 uppercase tracking-wider rounded-tr-lg">Distribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {fiveMinData.slice(-10).reverse().map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(item.time).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {item.totalTweets.toLocaleString()} tweets
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${getSentimentColor(item.sentiment)}30`,
                                color: getSentimentColor(item.sentiment) 
                              }}
                            >
                              {Math.round(item.sentiment)} - {getSentimentText(item.sentiment)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center space-x-1">
                              <div 
                                className="h-2 rounded-l-full" 
                                style={{ 
                                  width: `${item.positive * 100}%`, 
                                  backgroundColor: COLORS.chart.positive 
                                }}
                              ></div>
                              <div 
                                className="h-2" 
                                style={{ 
                                  width: `${item.neutral * 100}%`, 
                                  backgroundColor: COLORS.chart.neutral 
                                }}
                              ></div>
                              <div 
                                className="h-2 rounded-r-full" 
                                style={{ 
                                  width: `${item.negative * 100}%`, 
                                  backgroundColor: COLORS.chart.negative 
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Custom Analysis Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-base font-medium text-white mb-4">Custom Date Analysis</h2>
                <div className="mb-6">
                  <label htmlFor="date-selector" className="block text-sm font-medium text-gray-300 mb-2">
                    Select Specific Date
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="date"
                      id="date-selector"
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <button
                      onClick={handleCustomDateRange}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
                    >
                      <Filter className="h-4 w-4 mr-1" /> Analyze
                    </button>
                  </div>
                </div>
                <div id="custom-analysis-results" className="space-y-4">
                  {customDateRangeData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Overall Sentiment</div>
                        <div className="flex items-center">
                          <div 
                            className="text-2xl font-bold mr-2"
                            style={{ color: getSentimentColor(customDateRangeData.normalized_overall_weighted_sentiment_score) }}
                          >
                            {Math.round(customDateRangeData.normalized_overall_weighted_sentiment_score)}
                          </div>
                          <div className="text-sm text-gray-300">
                            {getSentimentText(customDateRangeData.normalized_overall_weighted_sentiment_score)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Total Tweets</div>
                        <div className="text-2xl font-bold text-white">
                          {customDateRangeData.total_tweets.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Raw Sentiment Score</div>
                        <div className="text-2xl font-bold text-white">
                          {customDateRangeData.overall_weighted_sentiment_score.toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-gray-700 p-4 rounded-lg col-span-3">
                        <div className="text-sm text-gray-400 mb-2">Sentiment Distribution</div>
                        <div className="w-full bg-gray-600 h-6 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ 
                              width: `${(customDateRangeData.weighted_sentiment_counts.positive * 100).toFixed(1)}%`,
                              backgroundColor: COLORS.chart.positive,
                            }}
                          >
                            {(customDateRangeData.weighted_sentiment_counts.positive * 100).toFixed(1)}%
                          </div>
                          <div 
                            className="h-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ 
                              width: `${(customDateRangeData.weighted_sentiment_counts.neutral * 100).toFixed(1)}%`,
                              backgroundColor: COLORS.chart.neutral,
                            }}
                          >
                            {(customDateRangeData.weighted_sentiment_counts.neutral * 100).toFixed(1)}%
                          </div>
                          <div 
                            className="h-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ 
                              width: `${(customDateRangeData.weighted_sentiment_counts.negative * 100).toFixed(1)}%`,
                              backgroundColor: COLORS.chart.negative,
                            }}
                          >
                            {(customDateRangeData.weighted_sentiment_counts.negative * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <div>Positive</div>
                          <div>Neutral</div>
                          <div>Negative</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-gray-700 rounded-md bg-gray-700">
                      <p className="text-sm text-gray-300">Select a date and click Analyze to view sentiment data for that specific date.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-base font-medium text-white mb-4">Custom Range Comparison</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="start-date"
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCompareRanges}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <BarChart2 className="h-4 w-4 mr-1" /> Compare Ranges
                </button>
              </div>

              {/* Advanced Filters */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Advanced Filters</h2>
                  <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Tweets</label>
                    <input
                      type="number"
                      min="0"
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={advancedFilters.minTweets}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, minTweets: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Sentiment</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={advancedFilters.minSentiment}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, minSentiment: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Sentiment</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={advancedFilters.maxSentiment}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, maxSentiment: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                    <select
                      className="shadow-sm bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md text-white"
                      value={advancedFilters.dateRange}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, dateRange: e.target.value})}
                    >
                      <option value="all">All Time</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="last90">Last 90 Days</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center mb-4">
                  <input
                    id="show-neutral"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={advancedFilters.showNeutral}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, showNeutral: e.target.checked})}
                  />
                  <label htmlFor="show-neutral" className="ml-2 block text-sm text-gray-300">
                    Include Neutral Sentiment
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700">
                    Reset Filters
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* AI Insights */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Cpu className="h-5 w-5 text-indigo-400 mr-2" />
                    <h2 className="text-base font-medium text-white">AI-Powered Insights</h2>
                  </div>
                  <div className="flex">
                    <button
                      onClick={() => setShowInsights(!showInsights)}
                      className="px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors flex items-center"
                    >
                      {showInsights ? 'Hide Insights' : 'Show Insights'}
                    </button>
                    <button className="px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors flex items-center">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Insights
                    </button>
                  </div>
                </div>

                {showInsights && (
                  <div className="space-y-4">
                    {aiInsights.map(insight => (
                      <div 
                        key={insight.id} 
                        className={`p-4 rounded-lg border ${
                          insight.type === 'positive' ? 'border-green-700 bg-green-900 bg-opacity-10' :
                          insight.type === 'negative' ? 'border-red-700 bg-red-900 bg-opacity-10' :
                          insight.type === 'warning' ? 'border-yellow-700 bg-yellow-900 bg-opacity-10' :
                          'border-blue-700 bg-blue-900 bg-opacity-10'
                        }`}
                      >
                        <div className="flex items-start">
                          <div 
                            className={`rounded-full p-2 mr-3 ${
                              insight.type === 'positive' ? 'bg-green-900 bg-opacity-30 text-green-400' :
                              insight.type === 'negative' ? 'bg-red-900 bg-opacity-30 text-red-400' :
                              insight.type === 'warning' ? 'bg-yellow-900 bg-opacity-30 text-yellow-400' :
                              'bg-blue-900 bg-opacity-30 text-blue-400'
                            }`}
                          >
                            {insight.icon}
                          </div>
                          <div>
                            <h3 className="text-base font-medium text-white">{insight.title}</h3>
                            <p className="text-sm text-gray-300 mt-1">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {aiInsights.length === 0 && (
                      <div className="text-center py-6">
                        <div className="bg-gray-700 rounded-full p-3 inline-flex items-center justify-center mb-3">
                          <Activity className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No significant insights detected</h3>
                        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                          We're continuously analyzing your sentiment data. Check back later for AI-generated insights and trends.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sentiment Correlation Analysis */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Sentiment Correlation Analysis</h2>
                  <div className="flex items-center text-gray-400 text-sm">
                    {/* <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                      AI Generated
                    </span> */}
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        type="number" 
                        dataKey="totalTweets" 
                        name="Tweet Count" 
                        stroke="#94a3b8"
                        label={{ value: 'Tweet Volume', position: 'bottom', fill: '#94a3b8' }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="sentiment" 
                        name="Sentiment" 
                        stroke="#94a3b8"
                        label={{ value: 'Sentiment Score', angle: -90, position: 'left', fill: '#94a3b8' }}
                      />
                      <ZAxis type="number" range={[50, 400]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Legend />
                      <Scatter 
                        name="Daily Sentiment" 
                        data={dailyData} 
                        fill={COLORS.chart.purple}
                        opacity={0.7}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-sm text-gray-400 mt-4">
                  <p>
                    <strong className="text-white">Analysis:</strong> There appears to be a 
                    <span className="text-indigo-400"> moderate correlation </span> 
                    between tweet volume and sentiment score. Days with higher tweet counts tend to show more extreme sentiment (both positive and negative).
                  </p>
                </div>
              </div>

              {/* Key Metrics Comparison */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-medium text-white">Key Metrics Comparison</h2>
                  <div className="flex items-center space-x-4">
                    <select 
                      className="bg-gray-700 text-gray-300 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={dataComparisonKey}
                      onChange={(e) => setDataComparisonKey(e.target.value)}
                    >
                      <option value="sentiment">Sentiment Score</option>
                      <option value="positive">Positive Ratio</option>
                      <option value="negative">Negative Ratio</option>
                      <option value="totalTweets">Tweet Volume</option>
                      <option value="rawScore">Raw Score</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-300">Current Period</h3>
                      <span className="text-xs text-gray-400">Last 7 days</span>
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dailyData.slice(-7)}
                          margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="time" tickFormatter={formatDate} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar 
                            dataKey={dataComparisonKey} 
                            name={
                              dataComparisonKey === 'sentiment' ? 'Sentiment Score' : 
                              dataComparisonKey === 'positive' ? 'Positive Ratio' :
                              dataComparisonKey === 'negative' ? 'Negative Ratio' :
                              dataComparisonKey === 'totalTweets' ? 'Tweet Volume' : 'Raw Score'
                            } 
                            fill={COLORS.chart.blue} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-300">Previous Period</h3>
                      <span className="text-xs text-gray-400">7-14 days ago</span>
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dailyData.slice(-14, -7)}
                          margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="time" tickFormatter={formatDate} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar 
                            dataKey={dataComparisonKey} 
                            name={
                              dataComparisonKey === 'sentiment' ? 'Sentiment Score' : 
                              dataComparisonKey === 'positive' ? 'Positive Ratio' :
                              dataComparisonKey === 'negative' ? 'Negative Ratio' :
                              dataComparisonKey === 'totalTweets' ? 'Tweet Volume' : 'Raw Score'
                            } 
                            fill={COLORS.chart.purple} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-medium text-white">Saved Reports</h2>
                  <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors flex items-center">
                    <span className="mr-1">+</span> New Report
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg hover:bg-gray-650 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <FileText className="h-5 w-5 text-indigo-400 mt-0.5 mr-3" />
                        <div>
                          <h3 className="text-white font-medium">Weekly Sentiment Summary</h3>
                          <p className="text-sm text-gray-400 mt-1">Complete overview of sentiment metrics for the past week</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-3">Last run: 2 days ago</span>
                        <button className="p-1.5 text-gray-400 hover:text-white">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg hover:bg-gray-650 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <FileText className="h-5 w-5 text-indigo-400 mt-0.5 mr-3" />
                        <div>
                          <h3 className="text-white font-medium">Monthly Executive Dashboard</h3>
                          <p className="text-sm text-gray-400 mt-1">Key metrics and insights for executive review</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-3">Last run: 15 days ago</span>
                        <button className="p-1.5 text-gray-400 hover:text-white">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg hover:bg-gray-650 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <FileText className="h-5 w-5 text-indigo-400 mt-0.5 mr-3" />
                        <div>
                          <h3 className="text-white font-medium">Sentiment Volatility Analysis</h3>
                          <p className="text-sm text-gray-400 mt-1">Detailed analysis of sentiment fluctuations and potential causes</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-3">Last run: 7 days ago</span>
                        <button className="p-1.5 text-gray-400 hover:text-white">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <button className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center mx-auto">
                    <span>View All Reports</span>
                    <ChevronsRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-medium text-white">Schedule Reports</h2>
                  <div className="text-xs bg-gray-700 px-2.5 py-1 rounded-full text-gray-300">
                    <Award className="h-3.5 w-3.5 inline-block mr-1" /> Pro Feature
                  </div>
                </div>
                
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-indigo-900 bg-opacity-30 rounded-full mb-3">
                    <Calendar className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white">Automated Report Delivery</h3>
                  <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto mb-4">
                    Set up scheduled reports to be delivered automatically to your team via email.
                  </p>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audience Tab */}
          {activeTab === 'audience' && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-medium text-white">Audience Demographics</h2>
                  <div className="text-xs bg-gray-700 px-2.5 py-1 rounded-full text-gray-300">
                    <Award className="h-3.5 w-3.5 inline-block mr-1" /> Pro Feature
                  </div>
                </div>
                
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-indigo-900 bg-opacity-30 rounded-full mb-3">
                    <Users className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white">Advanced Audience Insights</h3>
                  <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto mb-4">
                    Unlock detailed audience demographics and segmentation to better understand sentiment patterns.
                  </p>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                    Upgrade to Pro
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Top Contributors</h2>
                  <Database className="h-5 w-5 text-indigo-400" />
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tweet Count</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Avg. Sentiment</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                                <Users className="h-4 w-4" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-white">@user{i}</div>
                                <div className="text-xs text-gray-400">User {i}</div>
                              </div></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{(Math.random() * 100).toFixed(0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div 
                              className="text-sm font-medium"
                              style={{ color: getSentimentColor(40 + Math.random() * 30) }}
                            >
                              {(40 + Math.random() * 30).toFixed(1)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(Date.now() - Math.random() * 86400000 * 7).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="bg-gray-800 border-t border-gray-700 mt-8">
          <div className="max-w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-sm text-gray-400">
                  Sentiment Analysis Dashboard | <span className="font-medium text-gray-300">API Version: 1.0.0</span>
                </p>
              </div>
              <div className="flex space-x-6">
                <button className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Documentation</button>
                <button className="text-sm text-gray-400 hover:text-gray-300 transition-colors">API Reference</button>
                <button className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Settings</button>
              </div>
            </div>
          </div>
        </footer>

        <style jsx>{`
          .toggle-checkbox:checked {
            right: 0;
            border-color: #4f46e5;
          }
          .toggle-checkbox:checked + .toggle-label {
            background-color: #4f46e5;
          }
          .toggle-checkbox {
            right: 0;
            z-index: 1;
            border-color: #e2e8f0;
            transition: all 0.25s;
          }
          .toggle-label {
            transition: all 0.25s;
          }
          /* Hide scrollbar for Chrome, Safari and Opera */
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .no-scrollbar {
            -ms-overflow-style: none;  
            scrollbar-width: none;  
          }
        `}</style>
      </div>
    </div>
    </>
  );
};

export default SentimentDashboard;
