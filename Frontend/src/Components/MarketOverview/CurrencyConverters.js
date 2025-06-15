import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * CurrencyConverters - A unified component for cryptocurrency conversions
 * 
 * Features:
 * - Quick reference cards for popular cryptocurrencies
 * - Advanced bidirectional converter between crypto and fiat
 * - Real-time price simulations with random fluctuations
 * - Responsive grid layout
 */
const CurrencyConverters = () => {
    // Available cryptocurrencies with their data
    const cryptocurrencies = [
        { 
            id: 'BTC', 
            name: 'Bitcoin', 
            symbol: '₿', 
            logo: '/assets/crypto-icons/btc.svg',
            color: 'from-orange-500 to-amber-600'
        },
        { 
            id: 'ETH', 
            name: 'Ethereum', 
            symbol: 'Ξ', 
            logo: '/assets/crypto-icons/eth.svg',
            color: 'from-indigo-500 to-blue-600'
        },
        { 
            id: 'BNB', 
            name: 'Binance Coin', 
            symbol: 'BNB', 
            logo: '/assets/crypto-icons/bnb.svg',
            color: 'from-yellow-500 to-amber-600'
        },
        { 
            id: 'SOL', 
            name: 'Solana', 
            symbol: 'SOL', 
            logo: '/assets/crypto-icons/sol.svg',
            color: 'from-purple-500 to-violet-600'
        },
        { 
            id: 'PEPE', 
            name: 'Pepe', 
            symbol: 'PEPE', 
            logo: '/assets/crypto-icons/pepe.svg',
            color: 'from-green-500 to-emerald-600'
        },
        { 
            id: 'XRP', 
            name: 'XRP', 
            symbol: 'XRP', 
            logo: '/assets/crypto-icons/xrp.svg',
            color: 'from-blue-500 to-cyan-600'
        }
    ];

    // Available fiat currencies
    const fiatCurrencies = [
        { id: 'USD', name: 'US Dollar', symbol: '$' },
        { id: 'EUR', name: 'Euro', symbol: '€' },
        { id: 'GBP', name: 'British Pound', symbol: '£' },
        { id: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { id: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
        { id: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
        { id: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { id: 'INR', name: 'Indian Rupee', symbol: '₹' }
    ];

    // Mock prices (in a real app, these would come from an API)
    const [prices, setPrices] = useState({
        BTC: 69425.32,
        ETH: 3782.91,
        BNB: 587.43,
        SOL: 165.28,
        PEPE: 0.00000931,
        XRP: 0.5423
    });

    // Mock exchange rates (in a real app, these would come from an API)
    const [exchangeRates, setExchangeRates] = useState({
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 151.73,
        AUD: 1.52,
        CAD: 1.36,
        CNY: 7.23,
        INR: 83.41
    });

    // State for selected currencies and amount
    const [selectedCrypto, setSelectedCrypto] = useState(cryptocurrencies[0]);
    const [selectedFiat, setSelectedFiat] = useState(fiatCurrencies[0]);
    const [amount, setAmount] = useState(1);
    const [convertFrom, setConvertFrom] = useState('crypto'); // 'crypto' or 'fiat'

    // Update prices with random fluctuations every 5 seconds to simulate real-time changes
    useEffect(() => {
        const interval = setInterval(() => {
            setPrices(prevPrices => {
                const newPrices = { ...prevPrices };
                Object.keys(newPrices).forEach(key => {
                    // Add a random fluctuation between -0.5% and +0.5%
                    const fluctuation = newPrices[key] * (Math.random() * 0.01 - 0.005);
                    newPrices[key] = parseFloat((newPrices[key] + fluctuation).toFixed(key === 'PEPE' ? 8 : 2));
                });
                return newPrices;
            });
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);

    // Calculate conversion based on current selection
    const calculateConversion = () => {
        if (convertFrom === 'crypto') {
            // Converting from crypto to fiat
            const valueInUSD = amount * prices[selectedCrypto.id];
            const valueInSelectedFiat = valueInUSD * exchangeRates[selectedFiat.id];
            return valueInSelectedFiat.toFixed(selectedFiat.id === 'JPY' ? 0 : 2);
        } else {
            // Converting from fiat to crypto
            const valueInUSD = amount / exchangeRates[selectedFiat.id];
            const valueInSelectedCrypto = valueInUSD / prices[selectedCrypto.id];
            return selectedCrypto.id === 'PEPE' 
                ? valueInSelectedCrypto.toFixed(8) 
                : valueInSelectedCrypto.toFixed(6);
        }
    };

    // Format price for display
    const formatPrice = (price, currency) => {
        if (currency.id === 'PEPE') {
            return `${currency.symbol === 'PEPE' ? '' : currency.symbol}${price.toFixed(8)}`;
        }
        return `${currency.symbol === 'BTC' || currency.symbol === 'ETH' ? currency.symbol : ''}${price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}${currency.symbol !== 'BTC' && currency.symbol !== 'ETH' ? ' ' + currency.symbol : ''}`;
    };

    // Handle switching conversion direction
    const handleSwitch = () => {
        setConvertFrom(prev => prev === 'crypto' ? 'fiat' : 'crypto');
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Featured cryptocurrencies */}
                {cryptocurrencies.slice(0, 6).map((crypto) => (
                    <motion.div
                        key={crypto.id}
                        className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-300"
                        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                        <div className={`bg-gradient-to-r ${crypto.color} px-4 py-3 flex items-center justify-between`}>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                    <img 
                                        src={crypto.logo} 
                                        alt={crypto.name} 
                                        className="w-6 h-6" 
                                        onError={(e) => {
                                            e.target.src = '/assets/crypto-icons/generic.svg';
                                        }}
                                    />
                                </div>
                                <h3 className="font-bold text-white">{crypto.name}</h3>
                            </div>
                            <div className="text-white font-medium">
                                {formatPrice(prices[crypto.id], fiatCurrencies[0])}
                            </div>
                        </div>
                        
                        <div className="p-4">
                            <div className="flex flex-col space-y-4">
                                {/* From */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">From</label>
                                    <div className="flex rounded-md overflow-hidden border border-gray-700">
                                        <input
                                            type="number"
                                            value={1}
                                            readOnly
                                            className="w-full bg-gray-900 text-white px-3 py-2 focus:outline-none"
                                        />
                                        <div className="bg-gray-700 px-3 py-2 text-white whitespace-nowrap">
                                            {crypto.symbol}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* To */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Value in USD</label>
                                    <div className="relative flex rounded-md overflow-hidden border border-gray-700">
                                        <input
                                            type="text"
                                            value={formatPrice(prices[crypto.id], fiatCurrencies[0])}
                                            readOnly
                                            className="w-full bg-gray-900 text-white px-3 py-2 focus:outline-none"
                                        />
                                        <div className="bg-gray-700 px-3 py-2 text-white whitespace-nowrap">
                                            USD
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            
            {/* Advanced converter */}
            <div className="mt-12 bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-6 text-center">Currency Converter</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Converter inputs */}
                    <div className="flex flex-col space-y-6">
                        {/* From */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">From</label>
                            <div className="flex rounded-md overflow-hidden border border-gray-700">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                    className="w-full bg-gray-900 text-white px-3 py-2 focus:outline-none"
                                    placeholder="Enter amount"
                                    step="any"
                                    min="0"
                                />
                                <select
                                    value={convertFrom === 'crypto' ? selectedCrypto.id : selectedFiat.id}
                                    onChange={(e) => {
                                        if (convertFrom === 'crypto') {
                                            setSelectedCrypto(cryptocurrencies.find(c => c.id === e.target.value));
                                        } else {
                                            setSelectedFiat(fiatCurrencies.find(c => c.id === e.target.value));
                                        }
                                    }}
                                    className="bg-gray-700 px-3 py-2 text-white focus:outline-none border-l border-gray-600"
                                >
                                    {convertFrom === 'crypto' 
                                        ? cryptocurrencies.map(c => (
                                            <option key={c.id} value={c.id}>{c.id}</option>
                                          ))
                                        : fiatCurrencies.map(c => (
                                            <option key={c.id} value={c.id}>{c.id}</option>
                                          ))
                                    }
                                </select>
                            </div>
                        </div>
                        
                        {/* Switch currencies button */}
                        <div className="flex justify-center">
                            <motion.button
                                onClick={handleSwitch}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full shadow-md"
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.05 }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                            </motion.button>
                        </div>
                        
                        {/* To */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">To</label>
                            <div className="flex rounded-md overflow-hidden border border-gray-700">
                                <input
                                    type="text"
                                    value={calculateConversion()}
                                    readOnly
                                    className="w-full bg-gray-900 text-white px-3 py-2 focus:outline-none"
                                />
                                <select
                                    value={convertFrom === 'crypto' ? selectedFiat.id : selectedCrypto.id}
                                    onChange={(e) => {
                                        if (convertFrom === 'crypto') {
                                            setSelectedFiat(fiatCurrencies.find(c => c.id === e.target.value));
                                        } else {
                                            setSelectedCrypto(cryptocurrencies.find(c => c.id === e.target.value));
                                        }
                                    }}
                                    className="bg-gray-700 px-3 py-2 text-white focus:outline-none border-l border-gray-600"
                                >
                                    {convertFrom === 'crypto' 
                                        ? fiatCurrencies.map(c => (
                                            <option key={c.id} value={c.id}>{c.id}</option>
                                          ))
                                        : cryptocurrencies.map(c => (
                                            <option key={c.id} value={c.id}>{c.id}</option>
                                          ))
                                    }
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Conversion details */}
                    <div className="bg-gray-900 rounded-lg p-6 flex flex-col justify-between">
                        <div>
                            <h4 className="text-lg font-medium text-white mb-4">Conversion Details</h4>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Exchange Rate:</span>
                                    <span className="text-white font-medium">
                                        {convertFrom === 'crypto' 
                                            ? `1 ${selectedCrypto.id} = ${formatPrice(prices[selectedCrypto.id], selectedFiat)}`
                                            : `1 ${selectedFiat.id} = ${(1 / (prices[selectedCrypto.id] * exchangeRates[selectedFiat.id])).toFixed(selectedCrypto.id === 'PEPE' ? 8 : 6)} ${selectedCrypto.id}`
                                        }
                                    </span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Current {selectedCrypto.id} Price:</span>
                                    <span className="text-white font-medium">
                                        ${prices[selectedCrypto.id].toLocaleString('en-US', {
                                            minimumFractionDigits: selectedCrypto.id === 'PEPE' ? 8 : 2,
                                            maximumFractionDigits: selectedCrypto.id === 'PEPE' ? 8 : 2
                                        })}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Amount:</span>
                                    <span className="text-white font-medium">
                                        {convertFrom === 'crypto' 
                                            ? `${amount} ${selectedCrypto.id}`
                                            : `${amount} ${selectedFiat.id}`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Result:</span>
                                <span className="text-xl font-bold text-white">
                                    {convertFrom === 'crypto' 
                                        ? `${selectedFiat.symbol} ${calculateConversion()}`
                                        : `${calculateConversion()} ${selectedCrypto.id}`
                                    }
                                </span>
                            </div>
                            <p className="text-gray-500 text-xs mt-2">
                                * Prices update every 5 seconds to simulate real-time market conditions
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CurrencyConverters;