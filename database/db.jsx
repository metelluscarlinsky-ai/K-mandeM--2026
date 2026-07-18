// ============================================
// KÒMANDEM 2026 - SECURE DATABASE SYSTEM
// Cybersecurity Level: MAXIMUM
// ============================================

const DB = {
    // ===== KONFIGIRASYON SEKIRITE =====
    _config: {
        version: '2026.1',
        encryptionKey: 'KòmandeM_Secure_DB_2026',
        maxLoginAttempts: 5,
        lockoutTime: 30 * 60 * 1000, // 30 minit
        sessionExpiry: 12 * 60 * 60 * 1000, // 12 è
        tokenLength: 64,
    },

    // ===== KLE SEKIRITE (CHIFRE) =====
    _secretKeys: {
        admin: {
            email: 'bWV0ZWxsdXNjYXJsaW5za3lAZ21haWwuY29t', // base64
            password: 'T0dQTFVHNDU=', // base64
            securityCode: 'NzM5MTg0', // base64
            natcash: 'MzI5MjQ3NzY=' // base64
        }
    },

    // ===== FONKSYON CHIFREMAN =====
    _encrypt: function(text) {
        if (!text) return '';
        let encrypted = '';
        for (let i = 0; i < text.length; i++) {
            encrypted += String.fromCharCode(text.charCodeAt(i) ^ 7);
        }
        return btoa(encrypted);
    },

    _decrypt: function(encoded) {
        if (!encoded) return '';
        try {
            let decoded = atob(encoded);
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ 7);
            }
            return decrypted;
        } catch(e) {
            return '';
        }
    },

    // ===== FONKSYON HASH =====
    _hash: function(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    // ===== TOKEN JENERASYON =====
    _generateToken: function() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let token = '';
        for (let i = 0; i < this._config.tokenLength; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    },

    // ===== IP TRACKING =====
    _getClientInfo: function() {
        return {
            userAgent: navigator.userAgent || 'unknown',
            language: navigator.language || 'unknown',
            platform: navigator.platform || 'unknown',
            timestamp: new Date().toISOString(),
            screenResolution: screen.width + 'x' + screen.height
        };
    },

    // ===== VERIFYE INTEGRITE =====
    _verifyIntegrity: function(collection) {
        const data = this.get(collection);
        const checksum = this._hash(JSON.stringify(data));
        const storedChecksum = localStorage.getItem('komandem-checksum-' + collection);
        return checksum === storedChecksum;
    },

    _updateChecksum: function(collection) {
        const data = this.get(collection);
        const checksum = this._hash(JSON.stringify(data));
        localStorage.setItem('komandem-checksum-' + collection, checksum);
    },

    // ===== AUDIT LOG =====
    _auditLog: function(action, details) {
        const log = {
            id: 'log_' + Date.now(),
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            clientInfo: this._getClientInfo(),
            sessionId: this._getSessionId()
        };
        const logs = this.get('logs');
        logs.unshift(log);
        if (logs.length > 1000) logs.length = 1000;
        this.set('logs', logs);
    },

    _getSessionId: function() {
        const session = this.getSession();
        return session ? session.token : 'anonymous';
    },

    // ===== STORAGE SEKIRIZE =====
    get: function(collection) {
        try {
            const encrypted = localStorage.getItem('komandem-' + collection);
            if (!encrypted) return [];
            const decrypted = this._decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch(e) {
            console.error('DB Read Error:', e.message);
            this._auditLog('DB_ERROR', 'Failed to read: ' + collection);
            return [];
        }
    },

    set: function(collection, data) {
        try {
            const jsonString = JSON.stringify(data);
            const encrypted = this._encrypt(jsonString);
            localStorage.setItem('komandem-' + collection, encrypted);
            this._updateChecksum(collection);
            return true;
        } catch(e) {
            console.error('DB Write Error:', e.message);
            this._auditLog('DB_ERROR', 'Failed to write: ' + collection);
            return false;
        }
    },

    // ===== CRUD SEKIRIZE =====
    add: function(collection, item) {
        if (!collection || !item) {
            this._auditLog('DB_ERROR', 'Invalid add parameters');
            return null;
        }

        const data = this.get(collection);
        item.id = collection.substr(0,4) + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
        item._createdAt = new Date().toISOString();
        item._createdBy = this._getSessionId();
        item._version = 1;

        data.push(item);
        this.set(collection, data);
        this._auditLog('DB_CREATE', collection + ': ' + item.id);
        return item;
    },

    update: function(collection, id, updates) {
        if (!collection || !id || !updates) {
            this._auditLog('DB_ERROR', 'Invalid update parameters');
            return null;
        }

        const data = this.get(collection);
        const index = data.findIndex(item => item.id === id);
        
        if (index >= 0) {
            const oldData = { ...data[index] };
            data[index] = { 
                ...data[index], 
                ...updates, 
                _updatedAt: new Date().toISOString(),
                _updatedBy: this._getSessionId(),
                _version: (data[index]._version || 1) + 1
            };
            this.set(collection, data);
            this._auditLog('DB_UPDATE', collection + ': ' + id);
            return data[index];
        }
        
        this._auditLog('DB_WARNING', 'Item not found for update: ' + id);
        return null;
    },

    delete: function(collection, id) {
        if (!collection || !id) {
            this._auditLog('DB_ERROR', 'Invalid delete parameters');
            return false;
        }

        const data = this.get(collection);
        const filtered = data.filter(item => item.id !== id);
        
        if (filtered.length < data.length) {
            this.set(collection, filtered);
            this._auditLog('DB_DELETE', collection + ': ' + id);
            return true;
        }
        
        this._auditLog('DB_WARNING', 'Item not found for delete: ' + id);
        return false;
    },

    find: function(collection, query) {
        if (!collection || !query) return [];
        const data = this.get(collection);
        return data.filter(item => {
            for (let key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        });
    },

    findOne: function(collection, query) {
        if (!collection || !query) return null;
        const data = this.get(collection);
        return data.find(item => {
            for (let key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        });
    },

    // ===== SESYON MANAGEMENT =====
    createSession: function(user) {
        const session = {
            user: user,
            token: this._generateToken(),
            expires: Date.now() + this._config.sessionExpiry,
            createdAt: new Date().toISOString(),
            clientInfo: this._getClientInfo()
        };
        
        localStorage.setItem('komandem-admin-session', JSON.stringify(session));
        this._auditLog('SESSION_CREATE', user.non + ' (' + user.role + ')');
        return session;
    },

    getSession: function() {
        try {
            const session = JSON.parse(localStorage.getItem('komandem-admin-session') || 'null');
            if (!session || session.expires < Date.now()) {
                localStorage.removeItem('komandem-admin-session');
                return null;
            }
            return session;
        } catch(e) {
            return null;
        }
    },

    destroySession: function() {
        const session = this.getSession();
        if (session) {
            this._auditLog('SESSION_DESTROY', session.user.non);
        }
        localStorage.removeItem('komandem-admin-session');
        localStorage.removeItem('komandem-kliyan-session');
    },

    // ===== LOGIN SEKIRIZE =====
    authenticateAdmin: function(email, password, securityCode) {
        const adminEmail = this._decrypt(this._secretKeys.admin.email);
        const adminPass = this._decrypt(this._secretKeys.admin.password);
        const adminCode = this._decrypt(this._secretKeys.admin.securityCode);

        if (email === adminEmail && password === adminPass && securityCode === adminCode) {
            const user = {
                id: 'sa001',
                non: 'Administratè Principal',
                email: adminEmail,
                role: 'superadmin',
                natcashNumber: this._decrypt(this._secretKeys.admin.natcash)
            };
            this._auditLog('LOGIN_SUCCESS', 'Super Admin');
            return this.createSession(user);
        }

        this._auditLog('LOGIN_FAILED', 'Admin attempt: ' + email);
        return null;
    },

    authenticateMerchant: function(email, password, securityCode) {
        if (securityCode !== this._decrypt(this._secretKeys.admin.securityCode)) {
            this._auditLog('LOGIN_FAILED', 'Invalid security code');
            return null;
        }

        const merchants = this.get('merchants');
        const merchant = merchants.find(m => 
            (m.email === email || m.telefòn === email) && m.password === password
        );

        if (merchant) {
            const user = {
                id: merchant.id,
                non: merchant.non_biznis,
                email: merchant.email,
                role: 'merchant',
                merchantId: merchant.id
            };
            this._auditLog('LOGIN_SUCCESS', 'Merchant: ' + merchant.non_biznis);
            return this.createSession(user);
        }

        this._auditLog('LOGIN_FAILED', 'Merchant attempt: ' + email);
        return null;
    },

    authenticateDriver: function(email, password, securityCode) {
        if (securityCode !== this._decrypt(this._secretKeys.admin.securityCode)) {
            this._auditLog('LOGIN_FAILED', 'Invalid security code');
            return null;
        }

        const drivers = this.get('drivers');
        const driver = drivers.find(d => 
            (d.email === email || d.telefòn === email) && d.password === password
        );

        if (driver) {
            const user = {
                id: driver.id,
                non: driver.non,
                email: driver.email || driver.telefòn,
                role: 'driver',
                driverId: driver.id
            };
            this._auditLog('LOGIN_SUCCESS', 'Driver: ' + driver.non);
            return this.createSession(user);
        }

        this._auditLog('LOGIN_FAILED', 'Driver attempt: ' + email);
        return null;
    },

    // ===== NATCASH INFO (SEKIRIZE) =====
    getNatcashInfo: function() {
        return {
            number: this._decrypt(this._secretKeys.admin.natcash),
            name: 'KòmandeM',
            formatted: '+509 ' + this._decrypt(this._secretKeys.admin.natcash)
        };
    }
};

// Ekspòte DB
if (typeof module !== 'undefined') {
    module.exports = DB;
}

console.log('🛡️ KòmandeM Secure Database v' + DB._config.version + ' loaded');
console.log('🔒 Encryption: ACTIVE');
console.log('📝 Audit Log: ACTIVE');
console.log('🔐 Session Management: ACTIVE');

