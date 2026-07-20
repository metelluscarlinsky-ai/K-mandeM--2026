// ============================================
// KÒMANDEM - CYBERSECURITY SYSTEM
// ============================================

(function() {
    'use strict';

    // Konfigirasyon
    const SECURITY_CONFIG = {
        maxLoginAttempts: 5,
        lockoutTime: 30 * 60 * 1000,
        sessionTimeout: 60 * 60 * 1000,
        allowedDomains: ['localhost', '127.0.0.1', 'komandem.onrender.com', 'komandem.netlify.app'],
        encryptionKey: 'KòmandeM_Secure_2026',
        debug: false
    };

    // ===== PROTEKSYON KONT KONSOLE DEBOG =====
    if (!SECURITY_CONFIG.debug) {
        setInterval(function() {
            if (window.console && window.console.log) {
                var methods = ['log', 'debug', 'info', 'warn', 'error'];
                methods.forEach(function(m) {
                    var original = console[m];
                    console[m] = function() {
                        if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('🔍')) {
                            return original.apply(console, arguments);
                        }
                    };
                });
            }
        }, 1000);
    }

    // ===== PROTEKSYON KONT CLICKJACKING =====
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

    // ===== PROTEKSYON KONT XSS =====
    function sanitizeInput(input) {
        if (!input) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(input));
        return div.innerHTML;
    }

    // ===== PROTEKSYON KONT CSRF =====
    function generateCSRFToken() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var token = '';
        for (var i = 0; i < 64; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    // ===== VERIFYE INTEGRITE STORAGE =====
    function verifyStorageIntegrity() {
        try {
            var test = 'integrity_test_' + Date.now();
            localStorage.setItem('security_test', test);
            var result = localStorage.getItem('security_test');
            localStorage.removeItem('security_test');
            return result === test;
        } catch(e) {
            console.error('❌ Storage tampered!');
            return false;
        }
    }

    // ===== DETEKTE DEVTOOLS =====
    function detectDevTools() {
        var threshold = 160;
        setInterval(function() {
            var widthThreshold = window.outerWidth - window.innerWidth > threshold;
            var heightThreshold = window.outerHeight - window.innerHeight > threshold;
            if (widthThreshold || heightThreshold) {
                if (SECURITY_CONFIG.debug) console.warn('⚠️ DevTools detected!');
                localStorage.setItem('security-devtools-detected', Date.now().toString());
            }
        }, 1000);
    }

    // ===== PROTEKSYON KONT BRUTE FORCE =====
    function checkBruteForce(key) {
        var attempts = JSON.parse(localStorage.getItem('security-attempts-' + key) || '{"count":0,"timestamp":0}');
        var now = Date.now();
        
        if (now - attempts.timestamp > SECURITY_CONFIG.lockoutTime) {
            attempts = { count: 0, timestamp: now };
        }
        
        attempts.count++;
        attempts.timestamp = now;
        localStorage.setItem('security-attempts-' + key, JSON.stringify(attempts));
        
        if (attempts.count >= SECURITY_CONFIG.maxLoginAttempts) {
            return { locked: true, remaining: 0 };
        }
        
        return { 
            locked: false, 
            remaining: SECURITY_CONFIG.maxLoginAttempts - attempts.count 
        };
    }

    // ===== CHIFREMAN SENP =====
    function encrypt(data) {
        try {
            return btoa(unescape(encodeURIComponent(data)));
        } catch(e) {
            return data;
        }
    }

    function decrypt(data) {
        try {
            return decodeURIComponent(escape(atob(data)));
        } catch(e) {
            return data;
        }
    }

    // ===== VALIDASYON ENTRÉ =====
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePhone(phone) {
        return /^[0-9]{8}$/.test(phone.replace(/\D/g, ''));
    }

    function validatePassword(password) {
        var hasMinLength = password.length >= 6;
        var hasUpperCase = /[A-Z]/.test(password);
        var hasNumber = /[0-9]/.test(password);
        return hasMinLength && (hasUpperCase || hasNumber);
    }

    // ===== SISTÈM ALÈT SEKIRITE =====
    function securityAlert(message, level) {
        var colors = {
            high: '#EF4444',
            medium: '#F59E0B',
            low: '#3B82F6'
        };
        
        var alert = {
            message: message,
            level: level || 'low',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        var alerts = JSON.parse(localStorage.getItem('security-alerts') || '[]');
        alerts.unshift(alert);
        if (alerts.length > 100) alerts.length = 100;
        localStorage.setItem('security-alerts', JSON.stringify(alerts));
        
        if (SECURITY_CONFIG.debug) {
            console.warn('🛡️ Security Alert:', alert);
        }
    }

    // ===== AUTO-LOCKOUT =====
    function checkSessionTimeout() {
        var lastActivity = parseInt(localStorage.getItem('security-last-activity') || '0');
        var now = Date.now();
        
        if (lastActivity && (now - lastActivity) > SECURITY_CONFIG.sessionTimeout) {
            securityAlert('Session timeout - auto logout', 'medium');
            localStorage.removeItem('komandem-admin-session');
            localStorage.removeItem('komandem-kliyan-session');
            return true;
        }
        
        localStorage.setItem('security-last-activity', now.toString());
        return false;
    }

    // ===== INIT SEKIRITE =====
    function initSecurity() {
        // Verifye storage
        if (!verifyStorageIntegrity()) {
            securityAlert('Storage integrity check failed', 'high');
        }
        
        // Detekte DevTools
        detectDevTools();
        
        // Verifye sesyon
        setInterval(checkSessionTimeout, 30000);
        
        // Update last activity
        localStorage.setItem('security-last-activity', Date.now().toString());
        
        // Log init
        if (SECURITY_CONFIG.debug) {
            console.log('🛡️ KòmandeM Security System v1.0 loaded');
        }
    }

    // Ekspòte fonksyon yo
    window.KMSecurity = {
        sanitize: sanitizeInput,
        encrypt: encrypt,
        decrypt: decrypt,
        validateEmail: validateEmail,
        validatePhone: validatePhone,
        validatePassword: validatePassword,
        checkBruteForce: checkBruteForce,
        alert: securityAlert,
        generateToken: generateCSRFToken,
        config: SECURITY_CONFIG
    };

    // Inisyalize
    document.addEventListener('DOMContentLoaded', initSecurity);

})();
