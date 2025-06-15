import React from 'react';

/**
 * LoadingSpinner - A reusable loading indicator component with different sizes
 * 
 * @param {Object} props
 * @param {string} props.size - Size of the spinner ('small', 'medium', 'large')
 * @param {string} props.color - Color theme ('primary', 'secondary', 'white')
 * @returns {JSX.Element}
 */
const LoadingSpinner = ({ size = 'medium', color = 'primary' }) => {
    // Determine size classes
    const sizeClasses = {
        small: 'h-5 w-5',
        medium: 'h-8 w-8',
        large: 'h-12 w-12'
    };
    
    // Determine color classes
    const colorClasses = {
        primary: 'border-blue-500 border-t-transparent',
        secondary: 'border-purple-500 border-t-transparent',
        white: 'border-white border-t-transparent'
    };
    
    return (
        <div 
            className={`animate-spin rounded-full ${sizeClasses[size]} border-4 ${colorClasses[color]}`}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default LoadingSpinner;