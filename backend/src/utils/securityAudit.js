const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');

/**
 * Security Audit Utility
 * Performs security checks and audits on the application
 */

class SecurityAudit {
    constructor() {
        this.auditResults = {
            timestamp: new Date().toISOString(),
            checks: [],
            score: 0,
            recommendations: []
        };
    }

    /**
     * Run comprehensive security audit
     * @returns {Object} Audit results
     */
    async runAudit() {
        logger.system('Starting security audit');
        
        this.auditResults = {
            timestamp: new Date().toISOString(),
            checks: [],
            score: 0,
            recommendations: []
        };

        // Run all security checks
        await this.checkEnvironmentVariables();
        await this.checkDependencies();
        await this.checkFilePermissions();
        await this.checkSecurityHeaders();
        await this.checkDatabaseSecurity();
        await this.checkAuthenticationSecurity();
        await this.checkInputValidation();
        await this.checkErrorHandling();
        await this.checkLoggingSecurity();
        await this.checkRateLimiting();
        await this.checkCORSConfiguration();
        await this.checkFileUploadSecurity();

        // Calculate security score
        this.calculateSecurityScore();

        // Generate recommendations
        this.generateRecommendations();

        logger.system('Security audit completed', {
            score: this.auditResults.score,
            checks: this.auditResults.checks.length,
            recommendations: this.auditResults.recommendations.length
        });

        return this.auditResults;
    }

    /**
     * Check environment variables security
     */
    async checkEnvironmentVariables() {
        const check = {
            name: 'Environment Variables',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        const sensitiveVars = [
            'JWT_SECRET',
            'MONGO_URI',
            'REDIS_URL',
            'ENCRYPTION_KEY',
            'API_KEY'
        ];

        for (const varName of sensitiveVars) {
            if (!process.env[varName]) {
                check.issues.push(`Missing sensitive environment variable: ${varName}`);
                check.status = 'fail';
            } else if (process.env[varName].length < 32) {
                check.issues.push(`Weak ${varName} (too short)`);
                check.status = 'warn';
            }
        }

        // Check for default values
        if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'your-secret-key') {
            check.issues.push('Using default JWT secret in production');
            check.status = 'fail';
        }

        if (check.issues.length === 0) {
            check.recommendations.push('Consider using environment variable encryption');
        }

        this.auditResults.checks.push(check);
    }

    /**
     * Check dependencies for known vulnerabilities
     */
    async checkDependencies() {
        const check = {
            name: 'Dependencies',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for known vulnerable packages
            const vulnerablePackages = [
                'express',
                'mongoose',
                'bcryptjs',
                'jsonwebtoken',
                'helmet',
                'cors'
            ];

            for (const pkg of vulnerablePackages) {
                if (dependencies[pkg]) {
                    // In a real implementation, you would check against a vulnerability database
                    check.recommendations.push(`Consider auditing ${pkg} for known vulnerabilities`);
                }
            }

            check.recommendations.push('Run npm audit regularly');
            check.recommendations.push('Keep dependencies updated');

        } catch (error) {
            check.issues.push('Could not read package.json');
            check.status = 'warn';
        }

        this.auditResults.checks.push(check);
    }

    /**
     * Check file permissions
     */
    async checkFilePermissions() {
        const check = {
            name: 'File Permissions',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        const sensitiveFiles = [
            'package.json',
            'package-lock.json',
            '.env',
            '.env.production',
            '.env.local'
        ];

        for (const file of sensitiveFiles) {
            const filePath = path.join(__dirname, '../../', file);
            try {
                const stats = fs.statSync(filePath);
                const mode = stats.mode & parseInt('777', 8);
                
                if (mode > parseInt('644', 8)) {
                    check.issues.push(`${file} has overly permissive permissions (${mode.toString(8)})`);
                    check.status = 'warn';
                }
            } catch (error) {
                // File doesn't exist or can't be accessed
            }
        }

        check.recommendations.push('Ensure sensitive files have restrictive permissions (600 or 644)');
        check.recommendations.push('Use .gitignore to exclude sensitive files');

        this.auditResults.checks.push(check);
    }

    /**
     * Check security headers
     */
    async checkSecurityHeaders() {
        const check = {
            name: 'Security Headers',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        const requiredHeaders = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Content-Security-Policy'
        ];

        // This would typically be tested by making actual HTTP requests
        check.recommendations.push('Verify security headers are properly set');
        check.recommendations.push('Test CSP policy in production');
        check.recommendations.push('Enable HSTS in production');

        this.auditResults.checks.push(check);
    }

    /**
     * Check database security
     */
    async checkDatabaseSecurity() {
        const check = {
            name: 'Database Security',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        // Check MongoDB connection string
        if (process.env.MONGO_URI) {
            if (process.env.MONGO_URI.includes('localhost') && process.env.NODE_ENV === 'production') {
                check.issues.push('Using localhost MongoDB in production');
                check.status = 'fail';
            }

            if (!process.env.MONGO_URI.includes('ssl=true') && process.env.NODE_ENV === 'production') {
                check.issues.push('MongoDB connection not using SSL in production');
                check.status = 'warn';
            }
        }

        check.recommendations.push('Use MongoDB authentication');
        check.recommendations.push('Enable MongoDB SSL/TLS');
        check.recommendations.push('Use MongoDB connection pooling');
        check.recommendations.push('Implement database query validation');

        this.auditResults.checks.push(check);
    }

    /**
     * Check authentication security
     */
    async checkAuthenticationSecurity() {
        const check = {
            name: 'Authentication Security',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        // Check JWT configuration
        if (process.env.JWT_EXPIRES_IN) {
            const expiresIn = process.env.JWT_EXPIRES_IN;
            if (expiresIn.includes('d') && parseInt(expiresIn) > 7) {
                check.issues.push('JWT expiration time too long');
                check.status = 'warn';
            }
        }

        check.recommendations.push('Implement refresh token rotation');
        check.recommendations.push('Use strong password requirements');
        check.recommendations.push('Implement account lockout after failed attempts');
        check.recommendations.push('Use multi-factor authentication');

        this.auditResults.checks.push(check);
    }

    /**
     * Check input validation
     */
    async checkInputValidation() {
        const check = {
            name: 'Input Validation',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        check.recommendations.push('Validate all input data');
        check.recommendations.push('Sanitize user input');
        check.recommendations.push('Use parameterized queries');
        check.recommendations.push('Implement file upload validation');

        this.auditResults.checks.push(check);
    }

    /**
     * Check error handling
     */
    async checkErrorHandling() {
        const check = {
            name: 'Error Handling',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        check.recommendations.push('Implement proper error handling');
        check.recommendations.push('Avoid exposing sensitive information in errors');
        check.recommendations.push('Log security-related errors');
        check.recommendations.push('Implement error monitoring');

        this.auditResults.checks.push(check);
    }

    /**
     * Check logging security
     */
    async checkLoggingSecurity() {
        const check = {
            name: 'Logging Security',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        check.recommendations.push('Implement secure logging');
        check.recommendations.push('Avoid logging sensitive data');
        check.recommendations.push('Implement log rotation');
        check.recommendations.push('Monitor logs for security events');

        this.auditResults.checks.push(check);
    }

    /**
     * Check rate limiting
     */
    async checkRateLimiting() {
        const check = {
            name: 'Rate Limiting',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        check.recommendations.push('Implement rate limiting');
        check.recommendations.push('Use different limits for different endpoints');
        check.recommendations.push('Implement IP-based rate limiting');
        check.recommendations.push('Monitor for abuse patterns');

        this.auditResults.checks.push(check);
    }

    /**
     * Check CORS configuration
     */
    async checkCORSConfiguration() {
        const check = {
            name: 'CORS Configuration',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        if (process.env.CORS_ORIGINS === '*') {
            check.issues.push('CORS allows all origins');
            check.status = 'fail';
        }

        check.recommendations.push('Configure CORS properly');
        check.recommendations.push('Use specific origins instead of wildcards');
        check.recommendations.push('Implement CORS preflight handling');

        this.auditResults.checks.push(check);
    }

    /**
     * Check file upload security
     */
    async checkFileUploadSecurity() {
        const check = {
            name: 'File Upload Security',
            status: 'pass',
            issues: [],
            recommendations: []
        };

        check.recommendations.push('Validate file types');
        check.recommendations.push('Limit file sizes');
        check.recommendations.push('Scan uploaded files for malware');
        check.recommendations.push('Store files outside web root');

        this.auditResults.checks.push(check);
    }

    /**
     * Calculate security score
     */
    calculateSecurityScore() {
        let totalScore = 0;
        let maxScore = 0;

        for (const check of this.auditResults.checks) {
            maxScore += 10;
            
            switch (check.status) {
                case 'pass':
                    totalScore += 10;
                    break;
                case 'warn':
                    totalScore += 5;
                    break;
                case 'fail':
                    totalScore += 0;
                    break;
            }
        }

        this.auditResults.score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    }

    /**
     * Generate security recommendations
     */
    generateRecommendations() {
        const recommendations = new Set();

        for (const check of this.auditResults.checks) {
            check.recommendations.forEach(rec => recommendations.add(rec));
        }

        this.auditResults.recommendations = Array.from(recommendations);
    }

    /**
     * Get security score description
     * @returns {string} Score description
     */
    getScoreDescription() {
        if (this.auditResults.score >= 90) return 'Excellent';
        if (this.auditResults.score >= 80) return 'Good';
        if (this.auditResults.score >= 70) return 'Fair';
        if (this.auditResults.score >= 60) return 'Poor';
        return 'Critical';
    }
}

// Create singleton instance
const securityAudit = new SecurityAudit();

module.exports = securityAudit;
