import { useCallback, useRef, useEffect } from 'react';

/**
 * Performance monitoring hook for tracking operations and milestones
 * @param {string} componentName - Name of the component being monitored
 * @returns {Object} Performance monitoring utilities
 */
export const usePerformanceMonitor = (componentName) => {
    const startTimes = useRef(new Map());
    const operations = useRef(new Map());
    const milestones = useRef([]);

    // Measure operation performance
    const measureOperation = useCallback(async (operationName, operation) => {
        const startTime = performance.now();
        const operationId = `${componentName}-${operationName}-${Date.now()}`;
        
        startTimes.current.set(operationId, startTime);
        
        try {
            const result = await operation();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Store operation metrics
            operations.current.set(operationId, {
                name: operationName,
                component: componentName,
                duration,
                startTime,
                endTime,
                success: true
            });
            
            // Log performance in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`⚡ ${componentName}.${operationName}: ${duration.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            operations.current.set(operationId, {
                name: operationName,
                component: componentName,
                duration,
                startTime,
                endTime,
                success: false,
                error: error.message
            });
            
            console.error(`❌ ${componentName}.${operationName} failed: ${duration.toFixed(2)}ms`, error);
            throw error;
        } finally {
            startTimes.current.delete(operationId);
        }
    }, [componentName]);

    // Mark performance milestones
    const markMilestone = useCallback((milestoneName) => {
        const timestamp = performance.now();
        const milestone = {
            name: milestoneName,
            component: componentName,
            timestamp,
            time: new Date().toISOString()
        };
        
        milestones.current.push(milestone);
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 ${componentName}.${milestoneName}: ${timestamp.toFixed(2)}ms`);
        }
        
        return milestone;
    }, [componentName]);

    // Get performance statistics
    const getStats = useCallback(() => {
        const operationStats = Array.from(operations.current.values());
        const avgDuration = operationStats.length > 0 
            ? operationStats.reduce((sum, op) => sum + op.duration, 0) / operationStats.length 
            : 0;
        
        return {
            component: componentName,
            totalOperations: operationStats.length,
            successfulOperations: operationStats.filter(op => op.success).length,
            failedOperations: operationStats.filter(op => !op.success).length,
            averageDuration: avgDuration,
            milestones: milestones.current.length,
            operations: operationStats,
            milestones: milestones.current
        };
    }, [componentName]);

    // Clear performance data
    const clearStats = useCallback(() => {
        operations.current.clear();
        milestones.current.length = 0;
        startTimes.current.clear();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (process.env.NODE_ENV === 'development') {
                const stats = getStats();
                console.log(`📊 ${componentName} Performance Summary:`, stats);
            }
        };
    }, [componentName, getStats]);

    return {
        measureOperation,
        markMilestone,
        getStats,
        clearStats
    };
};

/**
 * Memory monitoring hook
 */
export const useMemoryMonitor = () => {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
            const logMemoryUsage = () => {
                const memory = performance.memory;
                console.log('🧠 Memory Usage:', {
                    used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                    total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                    limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
                });
            };

            // Log memory usage every 30 seconds in development
            const interval = setInterval(logMemoryUsage, 30000);
            return () => clearInterval(interval);
        }
    }, []);
};

/**
 * Network monitoring hook
 */
export const useNetworkMonitor = () => {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && 'connection' in navigator) {
            const connection = navigator.connection;
            
            const logNetworkInfo = () => {
                console.log('🌐 Network Info:', {
                    effectiveType: connection.effectiveType,
                    downlink: `${connection.downlink} Mbps`,
                    rtt: `${connection.rtt} ms`,
                    saveData: connection.saveData
                });
            };

            logNetworkInfo();
            
            // Listen for connection changes
            const handleConnectionChange = () => {
                logNetworkInfo();
            };

            connection.addEventListener('change', handleConnectionChange);
            return () => connection.removeEventListener('change', handleConnectionChange);
        }
    }, []);
};

export default usePerformanceMonitor;