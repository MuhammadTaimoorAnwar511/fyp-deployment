
// File: src/Components/Dashboard/TradeTable.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const TradeTable = ({ trades, tradeType, getCoinIcon, emptyMessage }) => {
  const [sortConfig, setSortConfig] = useState({
    key: tradeType === 'open' ? 'entry_time' : 'exit_time',
    direction: 'descending'
  });
  
  const sortedTrades = React.useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    const sortedItems = [...trades];
    sortedItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    return sortedItems;
  }, [trades, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getHeaderClass = (key) => {
    return `py-3 px-4 text-gray-300 font-medium cursor-pointer hover:bg-gray-700 transition ${
      sortConfig.key === key ? 'text-blue-400' : ''
    }`;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '↑' : '↓';
    }
    return null;
  };

  const columns = tradeType === 'open' 
    ? [
        { key: 'symbol', label: 'Symbol' },
        { key: 'direction', label: 'Direction' },
        { key: 'entry_time', label: 'Entry Time' },
        { key: 'entry_price', label: 'Entry Price' },
        { key: 'stop_loss', label: 'Stop Loss' },
        { key: 'take_profit', label: 'Take Profit' },
        { key: 'initial_margin', label: 'Initial Margin' }
      ]
    : [
        { key: 'symbol', label: 'Symbol' },
        { key: 'direction', label: 'Direction' },
        { key: 'entry_time', label: 'Entry Time' },
        { key: 'entry_price', label: 'Entry Price' },
        { key: 'exit_time', label: 'Exit Time' },
        { key: 'exit_price', label: 'Exit Price' },
        { key: 'status', label: 'Status' },
        { key: 'PNL', label: 'PNL' }
      ];

  // Function to format date and time for better readability
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Function to determine row status color
  const getStatusColor = (trade) => {
    if (tradeType === 'closed') {
      if (trade.status?.toLowerCase() === 'profit') return 'text-green-400';
      if (trade.status?.toLowerCase() === 'loss') return 'text-red-400';
    }
    return '';
  };

  return (
    <motion.div 
      className="bg-gray-800 rounded-lg p-4 shadow-lg max-h-96 overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-700 sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key} 
                className={getHeaderClass(column.key)}
                onClick={() => requestSort(column.key)}
              >
                <div className="flex items-center">
                  {column.label}
                  <span className="ml-1">{getSortIcon(column.key)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTrades.length > 0 ? (
            sortedTrades.map((trade) => (
              <motion.tr
                key={trade._id}
                className={`border-b border-gray-700 hover:bg-gray-700 transition ${getStatusColor(trade)}`}
                whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.7)' }}
              >
                <td className="py-3 px-4 text-white">
                  <div className="flex items-center">
                    <img
                      src={getCoinIcon(trade.symbol)}
                      alt={trade.symbol}
                      className="w-5 h-5 mr-2"
                      onError={(e) => {e.target.src="https://via.placeholder.com/24"}}
                    />
                    {trade.symbol}
                  </div>
                </td>
                <td className="py-3 px-4 text-white">
                  <span className={`px-2 py-1 rounded text-xs ${
                    trade.direction?.toLowerCase() === 'long' 
                      ? 'bg-green-900 text-green-200' 
                      : 'bg-red-900 text-red-200'
                  }`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="py-3 px-4 text-white">{formatDateTime(trade.entry_time)}</td>
                <td className="py-3 px-4 text-white">{trade.entry_price}</td>
                
                {tradeType === 'open' ? (
                  <>
                    <td className="py-3 px-4 text-white">{trade.stop_loss}</td>
                    <td className="py-3 px-4 text-white">{trade.take_profit}</td>
                    <td className="py-3 px-4 text-white">{trade.initial_margin}</td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 text-white">{formatDateTime(trade.exit_time)}</td>
                    <td className="py-3 px-4 text-white">{trade.exit_price}</td>
                    <td className="py-3 px-4 text-white">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.status?.toLowerCase() === 'profit' 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-red-900 text-red-200'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 ${
                      parseFloat(trade.PNL) > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {parseFloat(trade.PNL) > 0 ? '+' : ''}{trade.PNL}
                    </td>
                  </>
                )}
              </motion.tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-gray-400">
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                  </svg>
                  {emptyMessage}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
};

export default TradeTable;
