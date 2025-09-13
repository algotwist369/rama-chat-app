const mongoose = require('mongoose');

/**
 * Query Optimization Utilities
 * Provides optimized query methods and performance monitoring
 */

class QueryOptimizer {
    /**
     * Execute a query with performance monitoring
     * @param {Function} queryFunction - The query function to execute
     * @param {string} operation - Description of the operation
     * @returns {Promise} Query result
     */
    static async executeWithMonitoring(queryFunction, operation) {
        const startTime = Date.now();
        try {
            const result = await queryFunction();
            const executionTime = Date.now() - startTime;
            
            // Log slow queries (>100ms)
            if (executionTime > 100) {
                console.warn(`🐌 Slow query detected: ${operation} took ${executionTime}ms`);
            }
            
            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error(`❌ Query failed: ${operation} (${executionTime}ms)`, error.message);
            throw error;
        }
    }

    /**
     * Optimized pagination for large datasets
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Object} filter - Query filter
     * @param {Object} options - Pagination options
     * @returns {Promise<Object>} Paginated result
     */
    static async paginate(Model, filter = {}, options = {}) {
        const {
            page = 1,
            limit = 20,
            sort = { createdAt: -1 },
            select = null,
            populate = null,
            lean = false
        } = options;

        const skip = (page - 1) * limit;
        
        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            throw new Error('Invalid pagination parameters');
        }

        const query = Model.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        if (select) query.select(select);
        if (populate) query.populate(populate);
        if (lean) query.lean();

        const [data, total] = await Promise.all([
            query.exec(),
            Model.countDocuments(filter)
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        };
    }

    /**
     * Optimized aggregation pipeline for complex queries
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Array} pipeline - Aggregation pipeline
     * @param {Object} options - Aggregation options
     * @returns {Promise<Array>} Aggregation result
     */
    static async aggregate(Model, pipeline, options = {}) {
        const {
            allowDiskUse = true,
            maxTimeMS = 30000,
            batchSize = 1000
        } = options;

        return Model.aggregate(pipeline)
            .allowDiskUse(allowDiskUse)
            .option({ maxTimeMS, batchSize });
    }

    /**
     * Bulk operations for better performance
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Array} operations - Bulk operations
     * @returns {Promise<Object>} Bulk operation result
     */
    static async bulkWrite(Model, operations) {
        if (!operations || operations.length === 0) {
            throw new Error('No operations provided for bulk write');
        }

        // Limit bulk operations to prevent memory issues
        const maxOperations = 1000;
        if (operations.length > maxOperations) {
            console.warn(`⚠️  Large bulk operation detected: ${operations.length} operations. Consider batching.`);
        }

        return Model.bulkWrite(operations, {
            ordered: false, // Continue processing even if some operations fail
            writeConcern: { w: 'majority', j: true }
        });
    }

    /**
     * Optimized find with caching support
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Object} filter - Query filter
     * @param {Object} options - Query options
     * @param {Function} cacheKey - Cache key generator function
     * @param {Function} cacheGet - Cache get function
     * @param {Function} cacheSet - Cache set function
     * @param {number} ttl - Cache TTL in seconds
     * @returns {Promise} Query result
     */
    static async findWithCache(Model, filter, options = {}, cacheKey, cacheGet, cacheSet, ttl = 300) {
        if (!cacheKey || !cacheGet || !cacheSet) {
            // No caching, execute query directly
            return Model.find(filter, options.select, options)
                .populate(options.populate)
                .sort(options.sort)
                .limit(options.limit)
                .lean(options.lean);
        }

        const key = cacheKey(filter, options);
        
        try {
            // Try to get from cache first
            const cached = await cacheGet(key);
            if (cached) {
                return cached;
            }
        } catch (error) {
            console.warn('Cache get failed:', error.message);
        }

        // Execute query
        const result = await Model.find(filter, options.select, options)
            .populate(options.populate)
            .sort(options.sort)
            .limit(options.limit)
            .lean(options.lean);

        // Cache the result
        try {
            await cacheSet(key, result, ttl);
        } catch (error) {
            console.warn('Cache set failed:', error.message);
        }

        return result;
    }

    /**
     * Optimized text search with ranking
     * @param {mongoose.Model} Model - Mongoose model
     * @param {string} searchText - Text to search for
     * @param {Object} additionalFilter - Additional filters
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    static async textSearch(Model, searchText, additionalFilter = {}, options = {}) {
        const {
            limit = 20,
            skip = 0,
            language = 'english',
            caseSensitive = false
        } = options;

        const filter = {
            ...additionalFilter,
            $text: {
                $search: searchText,
                $language: language,
                $caseSensitive: caseSensitive
            }
        };

        return Model.find(filter, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Optimized distinct values query
     * @param {mongoose.Model} Model - Mongoose model
     * @param {string} field - Field to get distinct values for
     * @param {Object} filter - Additional filter
     * @returns {Promise<Array>} Distinct values
     */
    static async getDistinct(Model, field, filter = {}) {
        return Model.distinct(field, filter);
    }

    /**
     * Optimized count with filter
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Object} filter - Count filter
     * @returns {Promise<number>} Document count
     */
    static async count(Model, filter = {}) {
        return Model.countDocuments(filter);
    }

    /**
     * Optimized exists check
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Object} filter - Exists filter
     * @returns {Promise<boolean>} Whether document exists
     */
    static async exists(Model, filter) {
        const count = await Model.countDocuments(filter, { limit: 1 });
        return count > 0;
    }

    /**
     * Optimized findOne with lean option
     * @param {mongoose.Model} Model - Mongoose model
     * @param {Object} filter - Query filter
     * @param {Object} options - Query options
     * @returns {Promise} Single document
     */
    static async findOne(Model, filter, options = {}) {
        const query = Model.findOne(filter);
        
        if (options.select) query.select(options.select);
        if (options.populate) query.populate(options.populate);
        if (options.lean) query.lean();
        if (options.sort) query.sort(options.sort);

        return query.exec();
    }

    /**
     * Optimized findById with lean option
     * @param {mongoose.Model} Model - Mongoose model
     * @param {string} id - Document ID
     * @param {Object} options - Query options
     * @returns {Promise} Single document
     */
    static async findById(Model, id, options = {}) {
        const query = Model.findById(id);
        
        if (options.select) query.select(options.select);
        if (options.populate) query.populate(options.populate);
        if (options.lean) query.lean();

        return query.exec();
    }

    /**
     * Batch operations for better performance
     * @param {Array} items - Items to process
     * @param {Function} processor - Processing function
     * @param {number} batchSize - Batch size
     * @returns {Promise<Array>} Processed results
     */
    static async batchProcess(items, processor, batchSize = 100) {
        const results = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => processor(item))
            );
            results.push(...batchResults);
        }
        
        return results;
    }

    /**
     * Get query execution statistics
     * @param {mongoose.Model} Model - Mongoose model
     * @returns {Promise<Object>} Query statistics
     */
    static async getQueryStats(Model) {
        const stats = await Model.collection.stats();
        return {
            collection: Model.collection.name,
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            totalIndexSize: stats.totalIndexSize,
            indexSizes: stats.indexSizes
        };
    }
}

module.exports = QueryOptimizer;
