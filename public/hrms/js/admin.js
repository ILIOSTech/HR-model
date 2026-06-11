/* ============================================================
   ANTIGRAVITY HR — Admin Portal Module
   Full admin panel with Users, Activity Logs, Overview & Settings
   ============================================================ */

const AdminModule = (() => {
  let currentTab = 'overview';
  let usersPage = 1;
  let activityPage = 1;
  let activityFilters = { category: '', search: '', startDate: '', endDate: '' };
  let usersFilter = { role: '', search: '' };

  function render() {
    // Check admin access
    if (!Store.isAdmin()) {
      const main = document.getElementById('main-content');
      main.innerHTML = `
        <div class="empty-state" style="padding:var(--sp-16)">
          <div class="empty-state-icon">🔒</div>
          <h3 class="empty-state-title">Access Denied</h3>
          <p class="empty-state-text">You need admin privileges to access this page.</p>
          <button class="btn btn-primary" onclick="Router.navigate('dashboard')">Back to Dashboard</button>
        </div>
      `;
      return;
    }

    const main = document.getElementById('main-content');
    main.innerHTML = `
      ${UI.pageHeader('Admin Panel', 'Manage users, monitor activity, and configure system settings.',
        `<button class="btn btn-secondary btn-sm" onclick="AdminModule.exportActivityLog()">📥 Export Logs</button>`
      )}

      ${UI.tabs([
        { id: 'overview', label: '📊 Overview' },
        { id: 'users', label: '👥 Users' },
        { id: 'activity', label: '📋 Activity Logs' },
        { id: 'settings', label: '⚙️ Settings' }
      ], currentTab, 'AdminModule.switchTab')}

      <div id="admin-tab-content"></div>
    `;

    renderTab();
  }

  function switchTab(tab) {
    currentTab = tab;
    render();
  }

  function renderTab() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    switch (currentTab) {
      case 'overview': renderOverview(container); break;
      case 'users': renderUsers(container); break;
      case 'activity': renderActivity(container); break;
      case 'settings': renderSettings(container); break;
    }
  }

  // ===== Overview Tab =====
  function renderOverview(container) {
    const users = Store.getAllUsers();
    const allLogs = Store.getActivityLog();
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = allLogs.filter(l => l.timestamp.startsWith(today));
    const employees = Store.getAll('employees');
    const uniqueActiveToday = new Set(todayLogs.map(l => l.userId)).size;

    // Category breakdown
    const catCounts = {};
    allLogs.forEach(l => {
      catCounts[l.category] = (catCounts[l.category] || 0) + 1;
    });

    const catColors = {
      auth: '#0ea5e9', leave: '#f59e0b', attendance: '#10b981',
      employee: '#8b5cf6', recruitment: '#06b6d4', profile: '#6366f1', admin: '#f43f5e'
    };

    const catData = Object.entries(catCounts).map(([name, count]) => ({
      label: name.charAt(0).toUpperCase() + name.slice(1),
      value: count,
      color: catColors[name] || '#94a3b8'
    }));

    // Recent activity (last 15)
    const recentLogs = allLogs.slice(0, 15);

    container.innerHTML = `
      <div class="stat-cards stagger-children">
        ${UI.statCard(users.length, 'Registered Users', '👥', 'primary')}
        ${UI.statCard(uniqueActiveToday, 'Active Today', '🟢', 'success')}
        ${UI.statCard(allLogs.length, 'Total Activities', '📋', 'warning')}
        ${UI.statCard(employees.filter(e => e.status === 'active').length, 'Active Employees', '💼', 'accent')}
      </div>

      <div class="admin-overview-grid">
        <!-- Activity Breakdown -->
        <div class="card animate-fade-in-up">
          <div class="card-header">
            <h3 class="card-title">Activity Breakdown</h3>
            <span class="text-sm text-tertiary">By category</span>
          </div>
          ${catData.length > 0 ? `
            <div class="dept-chart-container">
              ${UI.donutChart(catData)}
              <div class="dept-legend">
                ${catData.map(d => `
                  <div class="dept-legend-item">
                    <span class="dept-legend-color" style="background:${d.color}"></span>
                    <span>${d.label}</span>
                    <span class="dept-legend-count">${d.value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="empty-state" style="padding:var(--sp-6)">
              <p class="text-sm text-tertiary">No activity data yet</p>
            </div>
          `}
        </div>

        <!-- Top Users -->
        <div class="card animate-fade-in-up" style="animation-delay:100ms">
          <div class="card-header">
            <h3 class="card-title">Most Active Users</h3>
          </div>
          ${renderTopUsers(allLogs)}
        </div>

        <!-- Recent Activity -->
        <div class="card admin-overview-full animate-fade-in-up" style="animation-delay:200ms">
          <div class="card-header">
            <h3 class="card-title">Recent System Activity</h3>
            <button class="btn btn-ghost btn-sm" onclick="AdminModule.switchTab('activity')">View All →</button>
          </div>
          ${recentLogs.length > 0 ? `
            <div class="admin-activity-list">
              ${recentLogs.map(l => renderActivityRow(l)).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:var(--sp-6)">
              <div class="empty-state-icon">📭</div>
              <p class="text-sm text-tertiary">No activity recorded yet</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderTopUsers(logs) {
    const userCounts = {};
    logs.forEach(l => {
      if (!userCounts[l.userId]) {
        userCounts[l.userId] = { name: l.userName, email: l.userId, count: 0 };
      }
      userCounts[l.userId].count++;
    });

    const sorted = Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    if (sorted.length === 0) {
      return `<div class="empty-state" style="padding:var(--sp-6)"><p class="text-sm text-tertiary">No users active yet</p></div>`;
    }

    return `<div class="top-users-list">
      ${sorted.map((u, i) => {
        const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const colors = Store.AVATAR_COLORS;
        const color = colors[i % colors.length];
        return `
          <div class="top-user-item">
            <div class="top-user-rank">#${i + 1}</div>
            <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
            <div class="top-user-info">
              <div class="top-user-name">${u.name}</div>
              <div class="top-user-email">${u.email}</div>
            </div>
            <div class="top-user-count">${u.count} actions</div>
          </div>
        `;
      }).join('')}
    </div>`;
  }

  // ===== Users Tab =====
  function renderUsers(container) {
    let users = Store.getAllUsers();
    const allLogs = Store.getActivityLog();

    // Apply filters
    if (usersFilter.role) {
      users = users.filter(u => (u.role || 'employee').toLowerCase() === usersFilter.role.toLowerCase());
    }
    if (usersFilter.search) {
      const q = usersFilter.search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    }

    container.innerHTML = `
      <div class="filter-bar">
        <input class="form-input" type="text" placeholder="Search users..."
          value="${usersFilter.search}" id="admin-user-search"
          oninput="AdminModule.filterUsers('search', this.value)">
        <select class="form-select" id="admin-role-filter" onchange="AdminModule.filterUsers('role', this.value)">
          <option value="">All Roles</option>
          <option value="admin" ${usersFilter.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="HR Manager" ${usersFilter.role === 'HR Manager' ? 'selected' : ''}>HR Manager</option>
          <option value="employee" ${usersFilter.role === 'employee' ? 'selected' : ''}>Employee</option>
        </select>
        <span class="text-sm text-tertiary" style="margin-left:auto">${users.length} user${users.length !== 1 ? 's' : ''}</span>
      </div>

      ${users.length > 0 ? renderUsersTable(users, allLogs) : `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">No Users Found</h3>
          <p class="empty-state-text">No registered users match your filters.</p>
        </div>
      `}
    `;
  }

  function renderUsersTable(users, allLogs) {
    const perPage = 10;
    const totalPages = Math.ceil(users.length / perPage);
    const start = (usersPage - 1) * perPage;
    const paged = users.slice(start, start + perPage);

    let html = `<div class="table-container glass"><table class="data-table" id="admin-users-table">
      <thead><tr>
        <th>User</th>
        <th>Role</th>
        <th>Department</th>
        <th>Total Actions</th>
        <th>Last Active</th>
        <th>Actions</th>
      </tr></thead><tbody>`;

    paged.forEach(user => {
      const userLogs = allLogs.filter(l => l.userId === user.email);
      const lastActive = userLogs.length > 0
        ? Store.formatRelativeTime(userLogs[0].timestamp)
        : 'Never';
      const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const color = Store.AVATAR_COLORS[Math.abs(user.name.charCodeAt(0) + user.name.charCodeAt(user.name.length - 1)) % Store.AVATAR_COLORS.length];
      const role = user.role || 'Employee';
      const roleBadgeType = role.toLowerCase() === 'admin' || role === 'HR Manager' ? 'primary' : 'neutral';

      html += `<tr>
        <td>
          <div class="data-table employee-cell">
            <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
            <div>
              <div class="name">${user.name}</div>
              <div class="email">${user.email}</div>
            </div>
          </div>
        </td>
        <td>${UI.badge(role, roleBadgeType)}</td>
        <td>${user.department || '—'}</td>
        <td><span class="font-semibold">${userLogs.length}</span></td>
        <td><span class="text-sm text-secondary">${lastActive}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick="AdminModule.viewUserProfile('${user.email}')" title="View Profile">👤</button>
            <button class="btn btn-ghost btn-sm" onclick="AdminModule.changeRole('${user.email}', '${role}')" title="Change Role">🔄</button>
          </div>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';

    // Pagination
    if (totalPages > 1) {
      html += `<div class="pagination">
        <span class="pagination-info">Showing ${start + 1}–${Math.min(start + perPage, users.length)} of ${users.length}</span>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="AdminModule.usersGoPage(${usersPage - 1})" ${usersPage === 1 ? 'disabled' : ''}>‹</button>`;
      for (let p = 1; p <= totalPages; p++) {
        html += `<button class="pagination-btn ${p === usersPage ? 'active' : ''}" onclick="AdminModule.usersGoPage(${p})">${p}</button>`;
      }
      html += `<button class="pagination-btn" onclick="AdminModule.usersGoPage(${usersPage + 1})" ${usersPage === totalPages ? 'disabled' : ''}>›</button>
        </div></div>`;
    }

    html += '</div>';
    return html;
  }

  function filterUsers(key, value) {
    usersFilter[key] = value;
    usersPage = 1;
    renderTab();
  }

  function usersGoPage(page) {
    usersPage = page;
    renderTab();
  }

  function viewUserProfile(email) {
    Router.navigate(`profile/${email}`);
  }

  function changeRole(email, currentRole) {
    const roleOptions = ['Admin', 'HR Manager', 'Employee'];
    const optionsHtml = roleOptions.map(r =>
      `<label class="admin-role-option">
        <input type="radio" name="new-role" value="${r}" ${r === currentRole ? 'checked' : ''}>
        <span class="admin-role-label">${r}</span>
       </label>`
    ).join('');

    UI.openModal('Change User Role',
      `<p class="text-sm text-secondary" style="margin-bottom:var(--sp-4)">Select a new role for <strong>${email}</strong>:</p>
       <div class="admin-role-options">${optionsHtml}</div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="save-role-btn">Save Role</button>`
    );

    setTimeout(() => {
      const btn = document.getElementById('save-role-btn');
      if (btn) btn.addEventListener('click', () => {
        const selected = document.querySelector('input[name="new-role"]:checked');
        if (selected) {
          Store.updateUser(email, { role: selected.value });
          Store.logActivity('role_changed', 'admin', { userName: email, newRole: selected.value });
          UI.closeModal();
          UI.toast(`Role updated to ${selected.value}`, 'success');
          renderTab();
        }
      });
    }, 50);
  }

  // ===== Activity Logs Tab =====
  function renderActivity(container) {
    let logs = Store.getActivityLog(activityFilters);

    const categories = ['auth', 'leave', 'attendance', 'employee', 'recruitment', 'profile', 'admin'];

    container.innerHTML = `
      <div class="filter-bar">
        <input class="form-input" type="text" placeholder="Search activities..."
          value="${activityFilters.search || ''}" id="admin-activity-search"
          oninput="AdminModule.filterActivity('search', this.value)">
        <select class="form-select" id="admin-cat-filter" onchange="AdminModule.filterActivity('category', this.value)">
          <option value="">All Categories</option>
          ${categories.map(c => `<option value="${c}" ${activityFilters.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
        </select>
        <input class="form-input" type="date" id="admin-date-start"
          value="${activityFilters.startDate || ''}"
          onchange="AdminModule.filterActivity('startDate', this.value)"
          title="From date">
        <input class="form-input" type="date" id="admin-date-end"
          value="${activityFilters.endDate || ''}"
          onchange="AdminModule.filterActivity('endDate', this.value)"
          title="To date">
        <span class="text-sm text-tertiary" style="margin-left:auto">${logs.length} entries</span>
      </div>

      ${logs.length > 0 ? renderActivityTable(logs) : `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">No Activity Logs</h3>
          <p class="empty-state-text">No activity matches your current filters.</p>
        </div>
      `}
    `;
  }

  function renderActivityTable(logs) {
    const perPage = 15;
    const totalPages = Math.ceil(logs.length / perPage);
    const start = (activityPage - 1) * perPage;
    const paged = logs.slice(start, start + perPage);

    const catIcons = {
      auth: '🔑', leave: '🏖️', attendance: '⏰',
      employee: '👤', recruitment: '💼', profile: '⚙️', admin: '🛡️'
    };

    let html = `<div class="table-container glass"><table class="data-table" id="admin-activity-table">
      <thead><tr>
        <th>Timestamp</th>
        <th>User</th>
        <th>Category</th>
        <th>Action</th>
        <th>Details</th>
      </tr></thead><tbody>`;

    paged.forEach(log => {
      const time = new Date(log.timestamp);
      const timeStr = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const icon = catIcons[log.category] || '📋';
      const actionDisplay = log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const detailStr = Object.entries(log.details || {})
        .filter(([k, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || '—';

      html += `<tr>
        <td><span class="text-sm">${timeStr}</span></td>
        <td>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">${log.userName}</span>
          </div>
        </td>
        <td><span class="badge badge-neutral">${icon} ${log.category}</span></td>
        <td><span class="text-sm">${actionDisplay}</span></td>
        <td><span class="text-xs text-tertiary truncate" style="max-width:200px;display:inline-block">${detailStr}</span></td>
      </tr>`;
    });

    html += '</tbody></table>';

    if (totalPages > 1) {
      html += `<div class="pagination">
        <span class="pagination-info">Showing ${start + 1}–${Math.min(start + perPage, logs.length)} of ${logs.length}</span>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="AdminModule.activityGoPage(${activityPage - 1})" ${activityPage === 1 ? 'disabled' : ''}>‹</button>`;
      for (let p = 1; p <= Math.min(totalPages, 7); p++) {
        html += `<button class="pagination-btn ${p === activityPage ? 'active' : ''}" onclick="AdminModule.activityGoPage(${p})">${p}</button>`;
      }
      if (totalPages > 7) {
        html += `<span class="text-xs text-tertiary" style="padding:0 4px">...</span>`;
        html += `<button class="pagination-btn ${totalPages === activityPage ? 'active' : ''}" onclick="AdminModule.activityGoPage(${totalPages})">${totalPages}</button>`;
      }
      html += `<button class="pagination-btn" onclick="AdminModule.activityGoPage(${activityPage + 1})" ${activityPage === totalPages ? 'disabled' : ''}>›</button>
        </div></div>`;
    }

    html += '</div>';
    return html;
  }

  function filterActivity(key, value) {
    activityFilters[key] = value;
    activityPage = 1;
    renderTab();
  }

  function activityGoPage(page) {
    activityPage = page;
    renderTab();
  }

  function renderActivityRow(log) {
    const catIcons = {
      auth: '🔑', leave: '🏖️', attendance: '⏰',
      employee: '👤', recruitment: '💼', profile: '⚙️', admin: '🛡️'
    };
    const icon = catIcons[log.category] || '📋';
    const actionDisplay = log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return `
      <div class="admin-activity-row">
        <div class="admin-activity-icon">${icon}</div>
        <div class="admin-activity-info">
          <div class="admin-activity-text"><strong>${log.userName}</strong> · ${actionDisplay}</div>
          <div class="admin-activity-time">${Store.formatRelativeTime(log.timestamp)}</div>
        </div>
        <span class="badge badge-neutral text-xs">${log.category}</span>
      </div>
    `;
  }

  // ===== Settings Tab =====
  function renderSettings(container) {
    const users = Store.getAllUsers();
    const logs = Store.getActivityLog();
    const employees = Store.getAll('employees');
    const n8n = Store.getN8nSettings();
    const activeJobs = Store.getAll('jobPostings').filter(j => j.status === 'open');

    container.innerHTML = `
      <div class="admin-settings-grid">
        <div class="card animate-fade-in-up">
          <div class="card-header">
            <h3 class="card-title">System Information</h3>
          </div>
          <div class="admin-settings-rows">
            <div class="admin-setting-row">
              <span class="admin-setting-label">Application</span>
              <span class="admin-setting-value">ILIOS-HR</span>
            </div>
            <div class="admin-setting-row">
              <span class="admin-setting-label">Version</span>
              <span class="admin-setting-value">2.0.0</span>
            </div>
            <div class="admin-setting-row">
              <span class="admin-setting-label">Registered Users</span>
              <span class="admin-setting-value">${users.length}</span>
            </div>
            <div class="admin-setting-row">
              <span class="admin-setting-label">Active Employees</span>
              <span class="admin-setting-value">${employees.filter(e => e.status === 'active').length}</span>
            </div>
            <div class="admin-setting-row">
              <span class="admin-setting-label">Activity Entries</span>
              <span class="admin-setting-value">${logs.length}</span>
            </div>
            <div class="admin-setting-row">
              <span class="admin-setting-label">Storage Used</span>
              <span class="admin-setting-value">${getStorageSize()}</span>
            </div>
          </div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay:100ms">
          <div class="card-header">
            <h3 class="card-title">Data Management</h3>
          </div>
          <div class="flex flex-col gap-4" style="padding:var(--sp-2) 0">
            <div class="admin-action-item">
              <div>
                <div class="font-semibold text-sm">Clear Activity Logs</div>
                <div class="text-xs text-tertiary">Remove all activity log entries</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="AdminModule.clearActivityLogs()">Clear Logs</button>
            </div>
            <div class="admin-action-item">
              <div>
                <div class="font-semibold text-sm">Reset All Data</div>
                <div class="text-xs text-tertiary">Reset HR data (employees, leaves, attendance, recruitment)</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="App.resetData()">Reset Data</button>
            </div>
            <div class="admin-action-item">
              <div>
                <div class="font-semibold text-sm">Export Activity Logs</div>
                <div class="text-xs text-tertiary">Download all activity as a JSON file</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="AdminModule.exportActivityLog()">📥 Export</button>
            </div>
          </div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay:150ms">
          <div class="card-header">
            <h3 class="card-title">🔌 n8n Integration Settings</h3>
          </div>
          <div class="flex flex-col gap-4" style="padding:var(--sp-2) 0">
            <div class="form-group flex items-center justify-between" style="border-bottom:1px solid var(--glass-border);padding-bottom:var(--sp-2)">
              <div>
                <label class="form-label" style="margin-bottom:0;font-weight:600">Enable n8n Integration</label>
                <div class="text-xs text-tertiary">Send job posting updates to n8n webhooks</div>
              </div>
              <input type="checkbox" id="n8n-enabled" ${n8n.enabled ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer">
            </div>

            <div class="form-group">
              <label class="form-label">n8n Webhook URL</label>
              <input class="form-input" id="n8n-webhook-url" type="text" placeholder="https://n8n.yourdomain.com/webhook/..." value="${n8n.webhookUrl || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">LinkedIn API Key / Bearer Token</label>
              <input class="form-input" id="n8n-linkedin-key" type="password" placeholder="••••••••••••••••" value="${n8n.linkedinKey || ''}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Indeed API Key</label>
                <input class="form-input" id="n8n-indeed-key" type="password" placeholder="••••••••••••••••" value="${n8n.indeedKey || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Naukri Developer Key</label>
                <input class="form-input" id="n8n-naukri-key" type="password" placeholder="••••••••••••••••" value="${n8n.naukriKey || ''}">
              </div>
            </div>

            <div class="flex gap-2" style="margin-top:var(--sp-2)">
              <button class="btn btn-secondary btn-sm" onclick="AdminModule.testN8nConnection()">Test Webhook</button>
              <button class="btn btn-primary btn-sm" onclick="AdminModule.saveN8nSettings()">Save Settings</button>
            </div>
          </div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay:200ms">
          <div class="card-header">
            <h3 class="card-title">🧪 n8n Webhook Simulator (Inbound)</h3>
          </div>
          <div class="flex flex-col gap-4" style="padding:var(--sp-2) 0">
            <p class="text-xs text-tertiary">Simulate receiving candidate applications forwarded from n8n webhooks.</p>
            
            <div class="form-group">
              <label class="form-label">Target Job Posting</label>
              <select class="form-select" id="sim-job-id">
                <option value="">Select an active job</option>
                ${activeJobs.map(j => `<option value="${j.id}">${j.title} (${j.department})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Candidate Payload (JSON)</label>
              <textarea class="form-textarea" id="sim-payload" rows="6" style="font-family:monospace;font-size:var(--text-xs);line-height:1.4">{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+91 98765 43210",
  "source": "LinkedIn"
}</textarea>
            </div>

            <div>
              <button class="btn btn-secondary btn-sm" onclick="AdminModule.runWebhookSimulator()">Simulate Ingestion</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2;
      }
    }
    if (total < 1024) return total + ' B';
    if (total < 1048576) return (total / 1024).toFixed(1) + ' KB';
    return (total / 1048576).toFixed(2) + ' MB';
  }

  function clearActivityLogs() {
    UI.confirm('This will permanently delete all activity log entries. Continue?', () => {
      const data = JSON.parse(localStorage.getItem('antigravity_hr_v2') || '{}');
      data.activityLog = [];
      localStorage.setItem('antigravity_hr_v2', JSON.stringify(data));
      UI.toast('Activity logs cleared', 'info');
      Store.logActivity('logs_cleared', 'admin', {});
      renderTab();
    });
  }

  function exportActivityLog() {
    const logs = Store.getActivityLog();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antigravity_activity_log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('Activity log exported', 'success');
  }

  function saveN8nSettings() {
    const enabled = document.getElementById('n8n-enabled').checked;
    const webhookUrl = document.getElementById('n8n-webhook-url').value.trim();
    const linkedinKey = document.getElementById('n8n-linkedin-key').value.trim();
    const indeedKey = document.getElementById('n8n-indeed-key').value.trim();
    const naukriKey = document.getElementById('n8n-naukri-key').value.trim();

    if (enabled && !webhookUrl) {
      UI.toast('Please specify the n8n Webhook URL when enabled', 'error');
      return;
    }

    Store.saveN8nSettings({ enabled, webhookUrl, linkedinKey, indeedKey, naukriKey });
    Store.logActivity('n8n_settings_updated', 'admin', { enabled, webhookUrl });
    UI.toast('n8n Integration settings saved successfully!', 'success');
  }

  async function testN8nConnection() {
    const webhookUrl = document.getElementById('n8n-webhook-url').value.trim();
    if (!webhookUrl) {
      UI.toast('Please enter a Webhook URL to test', 'error');
      return;
    }

    UI.toast('Sending test ping to n8n...', 'info');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          message: 'Test ping from Antigravity HR Webhook Settings',
          company: 'Antigravity HR'
        })
      });

      if (response.ok) {
        Store.logActivity('n8n_test_ping', 'admin', { status: 'success', url: webhookUrl });
        UI.toast('Test ping succeeded! n8n responded successfully.', 'success');
      } else {
        Store.logActivity('n8n_test_ping', 'admin', { status: 'failed', statusCode: response.status, url: webhookUrl });
        UI.toast(`Test ping failed. n8n returned status: ${response.status}`, 'warning');
      }
    } catch (e) {
      Store.logActivity('n8n_test_ping', 'admin', { status: 'error', error: e.message, url: webhookUrl });
      UI.toast(`Network error connecting to n8n: ${e.message}`, 'error');
    }
  }

  function runWebhookSimulator() {
    const jobId = document.getElementById('sim-job-id').value;
    const payloadText = document.getElementById('sim-payload').value.trim();

    if (!jobId) {
      UI.toast('Please select a target job posting', 'error');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      UI.toast('Invalid JSON payload structure', 'error');
      return;
    }

    if (!payload.name || !payload.email) {
      UI.toast('Payload must contain at least "name" and "email" fields', 'error');
      return;
    }

    const job = Store.getById('jobPostings', jobId);
    if (!job) {
      UI.toast('Selected job not found', 'error');
      return;
    }

    const newCandidate = {
      id: Store.generateId('C'),
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      stage: 'applied',
      appliedDate: new Date().toISOString().slice(0, 10),
      source: payload.source || 'n8n Webhook Simulator'
    };

    Store.update('jobPostings', jobId, {
      candidates: [...(job.candidates || []), newCandidate]
    });

    Store.logActivity('candidate_added', 'recruitment', {
      candidateName: newCandidate.name,
      jobTitle: job.title,
      source: newCandidate.source
    });

    UI.toast(`Candidate "${newCandidate.name}" ingested successfully into ${job.title}!`, 'success');
    renderTab();
  }

  return {
    render,
    switchTab,
    filterUsers,
    usersGoPage,
    viewUserProfile,
    changeRole,
    filterActivity,
    activityGoPage,
    clearActivityLogs,
    exportActivityLog,
    saveN8nSettings,
    testN8nConnection,
    runWebhookSimulator
  };
})();
