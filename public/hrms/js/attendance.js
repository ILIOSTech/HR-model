/* ============================================================
   ANTIGRAVITY HR — Attendance Management Module
   ============================================================ */

const AttendanceModule = (() => {
  let currentTab = 'today';
  let currentPage = 1;
  let filterDate = '2026-06-10';
  let filterEmployee = 'all';
  let clockedIn = false;
  let clockInTime = null;

  function render() {
    const main = document.getElementById('main-content');
    const stats = Store.getAttendanceStats();

    main.innerHTML = `
      ${UI.pageHeader('Attendance Management', `${stats.present} of ${stats.total} employees present today`,
        `<button class="btn btn-secondary" onclick="AttendanceModule.exportReport()">
          📥 Export Report
        </button>`
      )}

      <!-- Clock In Panel -->
      <div class="clock-in-panel glass animate-fade-in-up" id="clock-panel">
        <div>
          <div class="clock-time" id="live-clock">${getCurrentTime()}</div>
          <div class="clock-date">${formatDate(new Date())}</div>
        </div>
        <div class="clock-actions">
          <button class="btn ${clockedIn ? 'btn-secondary' : 'btn-primary'} btn-lg" id="clock-in-btn" onclick="AttendanceModule.toggleClock()">
            ${clockedIn ? '🔴 Clock Out' : '🟢 Clock In'}
          </button>
        </div>
        <div class="clock-status" id="clock-status">
          ${clockedIn ?
            `<span class="clock-status-dot" style="background:var(--success-400)"></span>
             <span style="color:var(--success-400)">Clocked in at ${clockInTime}</span>` :
            `<span class="clock-status-dot" style="background:var(--text-tertiary)"></span>
             <span style="color:var(--text-tertiary)">Not clocked in</span>`
          }
        </div>
      </div>

      <!-- Stats -->
      <div class="attendance-overview stagger-children">
        <div class="attendance-stat glass">
          <div class="att-value" style="color:var(--success-400)">${stats.present}</div>
          <div class="att-label">Present</div>
          <div class="att-bar"><div class="att-bar-fill" style="width:${(stats.present/stats.total*100)}%;background:var(--success-500)"></div></div>
        </div>
        <div class="attendance-stat glass">
          <div class="att-value" style="color:var(--danger-400)">${stats.absent}</div>
          <div class="att-label">Absent</div>
          <div class="att-bar"><div class="att-bar-fill" style="width:${(stats.absent/stats.total*100)}%;background:var(--danger-500)"></div></div>
        </div>
        <div class="attendance-stat glass">
          <div class="att-value" style="color:var(--warning-400)">${stats.late}</div>
          <div class="att-label">Late</div>
          <div class="att-bar"><div class="att-bar-fill" style="width:${(stats.late/stats.total*100)}%;background:var(--warning-500)"></div></div>
        </div>
        <div class="attendance-stat glass">
          <div class="att-value" style="color:var(--primary-400)">${Math.round(stats.present/stats.total*100)}%</div>
          <div class="att-label">Attendance Rate</div>
          <div class="att-bar"><div class="att-bar-fill" style="width:${(stats.present/stats.total*100)}%;background:var(--primary-500)"></div></div>
        </div>
      </div>

      ${UI.tabs([
        { id: 'today', label: '📋 Today' },
        { id: 'history', label: '📊 History' },
        { id: 'anomalies', label: '⚠️ Anomalies' }
      ], currentTab, 'AttendanceModule.switchTab')}

      <div id="attendance-content"></div>
    `;

    renderTab();
    startClock();
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab').forEach(t => {
      const labels = { today: 'Today', history: 'History', anomalies: 'Anomalies' };
      t.classList.toggle('active', t.textContent.includes(labels[tabId]));
    });
    renderTab();
  }

  function renderTab() {
    const container = document.getElementById('attendance-content');
    if (!container) return;

    switch (currentTab) {
      case 'today': renderToday(container); break;
      case 'history': renderHistory(container); break;
      case 'anomalies': renderAnomalies(container); break;
    }
  }

  function renderToday(container) {
    const records = Store.getAll('attendance').filter(a => a.date === '2026-06-10');
    const employees = Store.getAll('employees').filter(e => e.status === 'active');

    // Merge employees with their attendance
    const rows = employees.map(emp => {
      const record = records.find(r => r.employeeId === emp.id);
      return {
        ...emp,
        loginTime: record ? record.loginTime : null,
        logoutTime: record ? record.logoutTime : null,
        attStatus: record ? record.status : 'absent'
      };
    });

    const columns = [
      {
        label: 'Employee', key: 'name',
        render: (row) => `<div class="employee-cell">
          ${UI.avatar(row.name, row.color, 'sm')}
          <div><div class="name">${row.name}</div><div class="email">${row.department}</div></div>
        </div>`
      },
      { label: 'Login', key: 'loginTime', render: (row) => row.loginTime || '—' },
      { label: 'Logout', key: 'logoutTime', render: (row) => row.logoutTime || '—' },
      {
        label: 'Hours', key: 'hours',
        render: (row) => {
          if (!row.loginTime || !row.logoutTime) return '—';
          const [lh, lm] = row.loginTime.split(':').map(Number);
          const [oh, om] = row.logoutTime.split(':').map(Number);
          const hrs = (oh * 60 + om - lh * 60 - lm) / 60;
          return `${hrs.toFixed(1)}h`;
        }
      },
      { label: 'Status', key: 'attStatus', render: (row) => UI.statusBadge(row.attStatus) }
    ];

    container.innerHTML = `<div class="animate-fade-in-up">
      ${UI.dataTable(columns, rows, { id: 'today-att-table', page: currentPage, perPage: 15 })}
    </div>`;
  }

  function renderHistory(container) {
    let records = Store.getAll('attendance');

    if (filterEmployee !== 'all') {
      records = records.filter(r => r.employeeId === filterEmployee);
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    const employees = Store.getAll('employees');

    const columns = [
      {
        label: 'Employee', key: 'employeeId',
        render: (row) => {
          const emp = Store.getEmployeeById(row.employeeId);
          if (!emp) return '—';
          return `<div class="employee-cell">
            ${UI.avatar(emp.name, emp.color, 'sm')}
            <div><div class="name">${emp.name}</div></div>
          </div>`;
        }
      },
      { label: 'Date', key: 'date' },
      { label: 'Login', key: 'loginTime', render: (row) => row.loginTime || '—' },
      { label: 'Logout', key: 'logoutTime', render: (row) => row.logoutTime || '—' },
      { label: 'Status', key: 'status', render: (row) => UI.statusBadge(row.status) }
    ];

    container.innerHTML = `
      <div class="filter-bar">
        <select class="form-select" onchange="AttendanceModule.setEmployeeFilter(this.value)">
          <option value="all">All Employees</option>
          ${employees.map(e => `<option value="${e.id}" ${filterEmployee === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
        </select>
      </div>
      <div class="animate-fade-in-up">
        ${UI.dataTable(columns, records, { id: 'history-att-table', page: currentPage, perPage: 12 })}
      </div>
    `;

    container.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page >= 1) { currentPage = page; renderHistory(container); }
      });
    });
  }

  function renderAnomalies(container) {
    const records = Store.getAll('attendance');
    const employees = Store.getAll('employees');

    // Find anomalies
    const anomalies = [];
    employees.forEach(emp => {
      const empRecords = records.filter(r => r.employeeId === emp.id);
      const lateCount = empRecords.filter(r => r.status === 'late').length;
      const absentCount = empRecords.filter(r => r.status === 'absent').length;
      const missingLogout = empRecords.filter(r => r.loginTime && !r.logoutTime).length;

      if (lateCount >= 3) {
        anomalies.push({
          employee: emp,
          type: 'Frequent Late Arrivals',
          detail: `${lateCount} late arrivals in last 2 weeks`,
          severity: 'warning'
        });
      }
      if (absentCount >= 2) {
        anomalies.push({
          employee: emp,
          type: 'Multiple Absences',
          detail: `${absentCount} absences in last 2 weeks`,
          severity: 'danger'
        });
      }
      if (missingLogout > 0) {
        anomalies.push({
          employee: emp,
          type: 'Missing Logout',
          detail: `${missingLogout} missing logout entries`,
          severity: 'info'
        });
      }
    });

    if (anomalies.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3 class="empty-state-title">No Anomalies Found</h3>
        <p class="empty-state-text">All attendance records look good for the current period.</p>
      </div>`;
      return;
    }

    const columns = [
      {
        label: 'Employee', key: 'employee',
        render: (row) => `<div class="employee-cell">
          ${UI.avatar(row.employee.name, row.employee.color, 'sm')}
          <div><div class="name">${row.employee.name}</div><div class="email">${row.employee.department}</div></div>
        </div>`
      },
      { label: 'Anomaly Type', key: 'type', render: (row) => `<span class="font-medium">${row.type}</span>` },
      { label: 'Details', key: 'detail' },
      { label: 'Severity', key: 'severity', render: (row) => UI.badge(row.severity.charAt(0).toUpperCase() + row.severity.slice(1), row.severity === 'danger' ? 'danger' : row.severity === 'warning' ? 'warning' : 'info') }
    ];

    container.innerHTML = `<div class="animate-fade-in-up">
      ${UI.dataTable(columns, anomalies, { id: 'anomaly-table', page: 1, perPage: 20 })}
    </div>`;
  }

  // ---- Actions ----
  function toggleClock() {
    if (!clockedIn) {
      clockedIn = true;
      clockInTime = getCurrentTime();
      Store.logActivity('clock_in', 'attendance', { time: clockInTime });
      UI.toast(`Clocked in at ${clockInTime}`, 'success');
    } else {
      const outTime = getCurrentTime();
      Store.logActivity('clock_out', 'attendance', { clockIn: clockInTime, clockOut: outTime });
      clockedIn = false;
      UI.toast(`Clocked out at ${outTime}. Have a great evening!`, 'info');
      clockInTime = null;
    }
    render();
  }

  function setEmployeeFilter(empId) {
    filterEmployee = empId;
    currentPage = 1;
    renderTab();
  }

  function exportReport() {
    UI.toast('Attendance report exported successfully', 'success');
  }

  // ---- Helpers ----
  function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  }

  function formatDate(date) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  let clockInterval;
  function startClock() {
    clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const el = document.getElementById('live-clock');
      if (el) el.textContent = getCurrentTime();
    }, 1000);
  }

  return { render, switchTab, toggleClock, setEmployeeFilter, exportReport };
})();
