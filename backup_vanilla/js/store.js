/* ============================================================
   ANTIGRAVITY HR — Data Store
   localStorage-backed CRUD + seed data + activity tracking
   ============================================================ */

const Store = (() => {
  const STORAGE_KEY = 'antigravity_hr_v2';
  const USER_KEY = 'antigravity_user';

  // ---- Avatar color palette ----
  const AVATAR_COLORS = [
    '#0ea5e9','#8b5cf6','#06b6d4','#10b981','#f59e0b',
    '#ef4444','#ec4899','#14b8a6','#f97316','#3b82f6',
    '#a855f7','#84cc16','#e11d48','#0ea5e9','#d946ef'
  ];

  // ---- Initial Data Structure (empty — no demo data) ----
  const SEED = {
    employees: [],
    leaveRequests: [],
    leaveBalances: {
      casual: 12, sick: 10, paid: 15, unpaid: -1, // -1 = unlimited
      maternity: 180, paternity: 15
    },
    attendance: [],
    jobPostings: [],
    activities: [],
    activityLog: []
  };

  // ---- Helpers ----
  function getData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); }
      catch(e) { /* fall through */ }
    }
    return null;
  }

  function setData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function init() {
    if (!getData()) {
      setData(SEED);
    }
    // Ensure activityLog exists for upgraded installs
    const data = getData();
    if (!data.activityLog) {
      data.activityLog = [];
      setData(data);
    }
    // Ensure n8nSettings exists for upgraded installs
    if (!data.n8nSettings) {
      data.n8nSettings = {
        enabled: false,
        webhookUrl: '',
        linkedinKey: '',
        indeedKey: '',
        naukriKey: ''
      };
      setData(data);
    }
  }

  function getN8nSettings() {
    const data = getData();
    return data ? (data.n8nSettings || {
      enabled: false,
      webhookUrl: '',
      linkedinKey: '',
      indeedKey: '',
      naukriKey: ''
    }) : null;
  }

  function saveN8nSettings(settings) {
    const data = getData();
    data.n8nSettings = settings;
    setData(data);
  }

  function reset() {
    setData(SEED);
  }

  // ---- Generic CRUD ----
  function getAll(collection) {
    const data = getData();
    return data ? (data[collection] || []) : [];
  }

  function getById(collection, id) {
    return getAll(collection).find(item => item.id === id);
  }

  function add(collection, item) {
    const data = getData();
    if (!data[collection]) data[collection] = [];
    data[collection].push(item);
    setData(data);
    return item;
  }

  function update(collection, id, updates) {
    const data = getData();
    const idx = data[collection].findIndex(item => item.id === id);
    if (idx !== -1) {
      data[collection][idx] = { ...data[collection][idx], ...updates };
      setData(data);
      return data[collection][idx];
    }
    return null;
  }

  function remove(collection, id) {
    const data = getData();
    data[collection] = data[collection].filter(item => item.id !== id);
    setData(data);
  }

  // ---- Specific helpers ----
  function getEmployeeName(empId) {
    const emp = getById('employees', empId);
    return emp ? emp.name : 'Unknown';
  }

  function getEmployeeById(empId) {
    return getById('employees', empId);
  }

  function generateId(prefix) {
    return prefix + String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 100)).padStart(2, '0');
  }

  function getRandomAvatarColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  function getDepartments() {
    const emps = getAll('employees');
    const depts = {};
    emps.forEach(e => {
      if (!depts[e.department]) depts[e.department] = 0;
      depts[e.department]++;
    });
    return depts;
  }

  function getLeaveBalanceForEmployee(empId) {
    const data = getData();
    const balances = { ...data.leaveBalances };
    const approved = data.leaveRequests.filter(l => l.employeeId === empId && l.status === 'approved');
    approved.forEach(l => {
      const days = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1;
      if (balances[l.type] > 0) {
        balances[l.type] = Math.max(0, balances[l.type] - days);
      }
    });
    return balances;
  }

  function getTodayAttendance() {
    const today = new Date().toISOString().slice(0, 10);
    return getAll('attendance').filter(a => a.date === today);
  }

  function getAttendanceStats() {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = getAll('attendance').filter(a => a.date === today);
    const total = getAll('employees').filter(e => e.status === 'active').length;
    const present = todayRecords.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'half-day').length;
    const late = todayRecords.filter(a => a.status === 'late').length;
    const absent = total - present;
    return { total, present, late, absent };
  }

  function getPendingLeaves() {
    return getAll('leaveRequests').filter(l => l.status === 'pending');
  }

  function getOpenPositions() {
    return getAll('jobPostings').filter(j => j.status === 'open');
  }

  function getTotalCandidates() {
    return getAll('jobPostings').reduce((sum, j) => sum + (j.candidates ? j.candidates.length : 0), 0);
  }

  // ---- Activity Logging ----
  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) { return null; }
  }

  function logActivity(action, category, details = {}) {
    const user = getCurrentUser();
    const entry = {
      id: generateId('ACT'),
      userId: user ? user.email : 'system',
      userName: user ? user.name : 'System',
      userEmail: user ? user.email : '',
      action,
      category,
      details,
      timestamp: new Date().toISOString()
    };
    const data = getData();
    if (!data.activityLog) data.activityLog = [];
    data.activityLog.unshift(entry); // newest first
    // Keep max 500 entries
    if (data.activityLog.length > 500) {
      data.activityLog = data.activityLog.slice(0, 500);
    }
    setData(data);

    // Also push to the legacy activities feed for dashboard
    if (data.activities) {
      const iconMap = {
        auth: { icon: '🔑', iconBg: 'rgba(14,165,233,0.15)', iconColor: '#0ea5e9' },
        leave: { icon: '🏖️', iconBg: 'rgba(245,158,11,0.15)', iconColor: '#f59e0b' },
        attendance: { icon: '⏰', iconBg: 'rgba(16,185,129,0.15)', iconColor: '#10b981' },
        employee: { icon: '👤', iconBg: 'rgba(139,92,246,0.15)', iconColor: '#8b5cf6' },
        recruitment: { icon: '💼', iconBg: 'rgba(6,182,212,0.15)', iconColor: '#06b6d4' },
        profile: { icon: '⚙️', iconBg: 'rgba(99,102,241,0.15)', iconColor: '#6366f1' },
        admin: { icon: '🛡️', iconBg: 'rgba(244,63,94,0.15)', iconColor: '#f43f5e' }
      };
      const meta = iconMap[category] || iconMap.admin;
      data.activities.unshift({
        ...meta,
        message: `<strong>${entry.userName}</strong> ${formatActionMessage(action, details)}`,
        time: formatRelativeTime(entry.timestamp)
      });
      if (data.activities.length > 20) {
        data.activities = data.activities.slice(0, 20);
      }
      setData(data);
    }

    return entry;
  }

  function formatActionMessage(action, details) {
    const messages = {
      login: 'signed in to the system',
      logout: 'signed out',
      leave_request_created: `submitted a ${details.type || ''} leave request`,
      leave_approved: `approved leave for ${details.employeeName || 'an employee'}`,
      leave_rejected: `rejected leave for ${details.employeeName || 'an employee'}`,
      clock_in: 'clocked in for the day',
      clock_out: 'clocked out',
      employee_added: `added new employee: ${details.name || ''}`,
      employee_updated: `updated employee: ${details.name || ''}`,
      employee_deleted: `removed employee: ${details.name || ''}`,
      job_posted: `posted a new job: ${details.title || ''}`,
      job_status_changed: `changed job status to ${details.status || ''}`,
      candidate_added: `added candidate to ${details.jobTitle || ''}`,
      candidate_status_changed: `updated candidate status: ${details.candidateName || ''}`,
      profile_updated: 'updated their profile',
      role_changed: `changed role for ${details.userName || ''} to ${details.newRole || ''}`
    };
    return messages[action] || action.replace(/_/g, ' ');
  }

  function formatRelativeTime(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function getActivityLog(filters = {}) {
    let logs = getAll('activityLog');
    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters.category) {
      logs = logs.filter(l => l.category === filters.category);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      logs = logs.filter(l => new Date(l.timestamp) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      logs = logs.filter(l => new Date(l.timestamp) <= end);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(l =>
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        JSON.stringify(l.details).toLowerCase().includes(q)
      );
    }
    return logs;
  }

  // ---- User Management ----
  function getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem('antigravity_users') || '[]');
    } catch (e) { return []; }
  }

  function getUserByEmail(email) {
    return getAllUsers().find(u => u.email === email);
  }

  function updateUser(email, updates) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem('antigravity_users', JSON.stringify(users));
      // Also update current session if it's the logged-in user
      const current = getCurrentUser();
      if (current && current.email === email) {
        localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...updates }));
      }
      return users[idx];
    }
    return null;
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'Admin' || user.role === 'HR Manager');
  }

  function getUserActivityStats(email) {
    const logs = getActivityLog({ userId: email });
    const logins = logs.filter(l => l.action === 'login').length;
    const totalActions = logs.length;
    const categories = {};
    logs.forEach(l => {
      categories[l.category] = (categories[l.category] || 0) + 1;
    });
    const lastActive = logs.length > 0 ? logs[0].timestamp : null;
    return { logins, totalActions, categories, lastActive };
  }

  // ---- Public API ----
  return {
    init,
    reset,
    getAll,
    getById,
    add,
    update,
    remove,
    getEmployeeName,
    getEmployeeById,
    generateId,
    getRandomAvatarColor,
    getDepartments,
    getLeaveBalanceForEmployee,
    getTodayAttendance,
    getAttendanceStats,
    getPendingLeaves,
    getOpenPositions,
    getTotalCandidates,
    AVATAR_COLORS,
    // Activity & user management
    logActivity,
    getActivityLog,
    getCurrentUser,
    getAllUsers,
    getUserByEmail,
    updateUser,
    isAdmin,
    getUserActivityStats,
    formatRelativeTime,
    getN8nSettings,
    saveN8nSettings
  };
})();
