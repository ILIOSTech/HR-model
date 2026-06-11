/* ============================================================
   ANTIGRAVITY HR — User Profile Module
   Personal profile page with info, activity timeline & stats
   ============================================================ */

const ProfileModule = (() => {
  let activityFilter = '';
  let showCount = 20;

  function render(params) {
    const main = document.getElementById('main-content');
    const currentUser = Store.getCurrentUser();

    // Determine which user to show
    let targetEmail = currentUser ? currentUser.email : null;
    if (params && params[0]) {
      targetEmail = decodeURIComponent(params[0]);
    }

    if (!targetEmail) {
      main.innerHTML = `
        <div class="empty-state" style="padding:var(--sp-16)">
          <div class="empty-state-icon">🔒</div>
          <h3 class="empty-state-title">Not Logged In</h3>
          <p class="empty-state-text">Please sign in to view your profile.</p>
        </div>
      `;
      return;
    }

    // Get user data
    const user = Store.getUserByEmail(targetEmail) || currentUser;
    const isOwnProfile = currentUser && currentUser.email === targetEmail;
    const stats = Store.getUserActivityStats(targetEmail);
    const logs = Store.getActivityLog({ userId: targetEmail });

    // Employee record match
    const employees = Store.getAll('employees');
    const empRecord = employees.find(e => e.email === targetEmail);

    // Attendance stats
    const allAttendance = Store.getAll('attendance');
    const empAttendance = empRecord
      ? allAttendance.filter(a => a.employeeId === empRecord.id)
      : [];
    const presentDays = empAttendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'half-day').length;

    // Leave stats
    const allLeaves = Store.getAll('leaveRequests');
    const empLeaves = empRecord
      ? allLeaves.filter(l => l.employeeId === empRecord.id)
      : [];
    const approvedLeaves = empLeaves.filter(l => l.status === 'approved').length;

    const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarColor = empRecord ? empRecord.color : Store.AVATAR_COLORS[Math.abs(user.name.charCodeAt(0)) % Store.AVATAR_COLORS.length];
    const role = user.role || 'Employee';
    const joinDate = empRecord ? empRecord.joinDate : (user.joinDate || new Date().toISOString().slice(0, 10));
    const memberSince = new Date(joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    main.innerHTML = `
      <!-- Profile Header -->
      <div class="profile-header glass animate-fade-in-up">
        <div class="profile-header-bg"></div>
        <div class="profile-header-content">
          <div class="profile-avatar-large" style="background:${avatarColor}">${initials}</div>
          <div class="profile-header-info">
            <h1 class="profile-name">${user.name || 'User'}</h1>
            <div class="profile-meta">
              <span class="profile-role-badge ${role.toLowerCase() === 'admin' || role === 'HR Manager' ? 'role-admin' : 'role-employee'}">${role}</span>
              <span class="profile-dept">${user.department || '—'}</span>
              <span class="profile-since">Member since ${memberSince}</span>
            </div>
            <div class="profile-email">${user.email || ''}</div>
          </div>
          ${isOwnProfile ? `
            <div class="profile-header-actions">
              <button class="btn btn-secondary btn-sm" onclick="ProfileModule.editProfile()">✏️ Edit Profile</button>
              <button class="btn btn-ghost btn-sm" onclick="ProfileModule.changePassword()">🔑 Change Password</button>
            </div>
          ` : `
            <div class="profile-header-actions">
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('admin')">← Back to Admin</button>
            </div>
          `}
        </div>
      </div>

      <!-- Stats Row -->
      <div class="profile-stats stagger-children">
        <div class="profile-stat-card glass">
          <div class="profile-stat-icon" style="background:rgba(14,165,233,0.12);color:#0ea5e9">🔑</div>
          <div class="profile-stat-value">${stats.logins}</div>
          <div class="profile-stat-label">Total Logins</div>
        </div>
        <div class="profile-stat-card glass">
          <div class="profile-stat-icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6">⚡</div>
          <div class="profile-stat-value">${stats.totalActions}</div>
          <div class="profile-stat-label">Actions Taken</div>
        </div>
        <div class="profile-stat-card glass">
          <div class="profile-stat-icon" style="background:rgba(16,185,129,0.12);color:#10b981">✅</div>
          <div class="profile-stat-value">${presentDays}</div>
          <div class="profile-stat-label">Days Present</div>
        </div>
        <div class="profile-stat-card glass">
          <div class="profile-stat-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">🏖️</div>
          <div class="profile-stat-value">${approvedLeaves}</div>
          <div class="profile-stat-label">Leaves Taken</div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="profile-grid">
        <!-- Personal Info -->
        <div class="card animate-fade-in-up" style="animation-delay:100ms">
          <div class="card-header">
            <h3 class="card-title">Personal Information</h3>
          </div>
          <div class="profile-info-rows">
            <div class="profile-info-row">
              <span class="profile-info-label">Full Name</span>
              <span class="profile-info-value">${user.name || '—'}</span>
            </div>
            <div class="profile-info-row">
              <span class="profile-info-label">Email</span>
              <span class="profile-info-value">${user.email || '—'}</span>
            </div>
            <div class="profile-info-row">
              <span class="profile-info-label">Department</span>
              <span class="profile-info-value">${user.department || '—'}</span>
            </div>
            <div class="profile-info-row">
              <span class="profile-info-label">Role</span>
              <span class="profile-info-value">${role}</span>
            </div>
            <div class="profile-info-row">
              <span class="profile-info-label">Phone</span>
              <span class="profile-info-value">${empRecord ? (empRecord.phone || '—') : '—'}</span>
            </div>
            <div class="profile-info-row">
              <span class="profile-info-label">Join Date</span>
              <span class="profile-info-value">${memberSince}</span>
            </div>
            <div class="profile-info-row">
              <span class="profile-info-label">Status</span>
              <span class="profile-info-value">${empRecord ? UI.statusBadge(empRecord.status) : UI.badge('Active', 'success')}</span>
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card animate-fade-in-up" style="animation-delay:200ms">
          <div class="card-header">
            <h3 class="card-title">Activity Timeline</h3>
            <span class="text-sm text-tertiary">${logs.length} total</span>
          </div>

          <!-- Category Filters -->
          <div class="profile-activity-filters">
            <button class="profile-filter-chip ${activityFilter === '' ? 'active' : ''}" onclick="ProfileModule.setFilter('')">All</button>
            <button class="profile-filter-chip ${activityFilter === 'auth' ? 'active' : ''}" onclick="ProfileModule.setFilter('auth')">🔑 Auth</button>
            <button class="profile-filter-chip ${activityFilter === 'leave' ? 'active' : ''}" onclick="ProfileModule.setFilter('leave')">🏖️ Leave</button>
            <button class="profile-filter-chip ${activityFilter === 'attendance' ? 'active' : ''}" onclick="ProfileModule.setFilter('attendance')">⏰ Attendance</button>
            <button class="profile-filter-chip ${activityFilter === 'employee' ? 'active' : ''}" onclick="ProfileModule.setFilter('employee')">👤 Employee</button>
            <button class="profile-filter-chip ${activityFilter === 'recruitment' ? 'active' : ''}" onclick="ProfileModule.setFilter('recruitment')">💼 Recruitment</button>
          </div>

          <!-- Timeline -->
          ${renderTimeline(logs)}
        </div>
      </div>
    `;
  }

  function renderTimeline(logs) {
    let filtered = logs;
    if (activityFilter) {
      filtered = logs.filter(l => l.category === activityFilter);
    }

    const visible = filtered.slice(0, showCount);

    if (visible.length === 0) {
      return `
        <div class="empty-state" style="padding:var(--sp-8)">
          <div class="empty-state-icon">📭</div>
          <p class="text-sm text-tertiary">No activity recorded${activityFilter ? ' in this category' : ''}</p>
        </div>
      `;
    }

    const catIcons = {
      auth: '🔑', leave: '🏖️', attendance: '⏰',
      employee: '👤', recruitment: '💼', profile: '⚙️', admin: '🛡️'
    };

    const catColors = {
      auth: '#0ea5e9', leave: '#f59e0b', attendance: '#10b981',
      employee: '#8b5cf6', recruitment: '#06b6d4', profile: '#6366f1', admin: '#f43f5e'
    };

    let html = '<div class="timeline">';
    visible.forEach((log, i) => {
      const icon = catIcons[log.category] || '📋';
      const color = catColors[log.category] || '#94a3b8';
      const time = new Date(log.timestamp);
      const timeStr = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        + ' · ' + time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const actionDisplay = log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const isLast = i === visible.length - 1;

      html += `
        <div class="timeline-item ${isLast ? 'timeline-last' : ''}">
          <div class="timeline-line-container">
            <div class="timeline-dot" style="background:${color}">${icon}</div>
            ${!isLast ? '<div class="timeline-line"></div>' : ''}
          </div>
          <div class="timeline-content">
            <div class="timeline-action">${actionDisplay}</div>
            <div class="timeline-details">
              ${Object.entries(log.details || {}).filter(([k, v]) => v).map(([k, v]) => `<span>${k}: ${v}</span>`).join(' · ') || ''}
            </div>
            <div class="timeline-time">${timeStr}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    if (filtered.length > showCount) {
      html += `<div class="text-center" style="padding:var(--sp-4)">
        <button class="btn btn-ghost btn-sm" onclick="ProfileModule.loadMore()">Load More (${filtered.length - showCount} remaining)</button>
      </div>`;
    }

    return html;
  }

  function setFilter(filter) {
    activityFilter = filter;
    showCount = 20;
    render();
  }

  function loadMore() {
    showCount += 20;
    render();
  }

  function editProfile() {
    const user = Store.getCurrentUser();
    if (!user) return;

    UI.openModal('Edit Profile',
      `<div class="form-group">
        <label class="form-label">Full Name</label>
        <input class="form-input" id="edit-profile-name" value="${user.name || ''}" placeholder="Enter your name">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Department</label>
          <select class="form-select" id="edit-profile-dept">
            ${['HR','Engineering','Design','Marketing','Sales','Finance'].map(d =>
              `<option value="${d}" ${user.department === d ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Role / Title</label>
          <input class="form-input" id="edit-profile-role" value="${user.role || ''}" placeholder="e.g. HR Manager">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="save-profile-btn">Save Changes</button>`
    );

    setTimeout(() => {
      const btn = document.getElementById('save-profile-btn');
      if (btn) btn.addEventListener('click', () => {
        const name = document.getElementById('edit-profile-name').value.trim();
        const department = document.getElementById('edit-profile-dept').value;
        const role = document.getElementById('edit-profile-role').value.trim();

        if (!name) {
          UI.toast('Name is required', 'error');
          return;
        }

        // Update user record
        Store.updateUser(user.email, { name, department, role });

        // Update employee record if exists
        const employees = Store.getAll('employees');
        const emp = employees.find(e => e.email === user.email);
        if (emp) {
          Store.update('employees', emp.id, { name, department, role });
        }

        // Update localStorage session
        const updated = { ...user, name, department, role };
        localStorage.setItem('antigravity_user', JSON.stringify(updated));

        Store.logActivity('profile_updated', 'profile', { name, department, role });

        UI.closeModal();
        UI.toast('Profile updated successfully', 'success');

        // Refresh display
        if (typeof App !== 'undefined' && App.updateBadges) {
          // Re-render user display
          const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const avatar = document.getElementById('topbar-avatar');
          if (avatar) {
            avatar.textContent = initials;
            avatar.title = `${name} — ${role || 'Employee'}`;
          }
          const sidebarName = document.querySelector('.sidebar-user .user-info div:first-child');
          const sidebarRole = document.querySelector('.sidebar-user .user-info div:last-child');
          const sidebarAvatar = document.querySelector('.sidebar-user .avatar');
          if (sidebarName) sidebarName.textContent = name;
          if (sidebarRole) sidebarRole.textContent = role || 'Employee';
          if (sidebarAvatar) sidebarAvatar.textContent = initials;
        }

        render();
      });
    }, 50);
  }

  function changePassword() {
    UI.openModal('Change Password',
      `<div class="form-group">
        <label class="form-label">Current Password</label>
        <input class="form-input" type="password" id="current-password" placeholder="Enter current password">
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input class="form-input" type="password" id="new-password" placeholder="Enter new password">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm New Password</label>
        <input class="form-input" type="password" id="confirm-new-password" placeholder="Confirm new password">
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="save-password-btn">Update Password</button>`
    );

    setTimeout(() => {
      const btn = document.getElementById('save-password-btn');
      if (btn) btn.addEventListener('click', () => {
        const current = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-new-password').value;

        const user = Store.getCurrentUser();
        const fullUser = Store.getUserByEmail(user.email);

        if (fullUser && fullUser.password && fullUser.password !== current) {
          UI.toast('Current password is incorrect', 'error');
          return;
        }
        if (newPass.length < 4) {
          UI.toast('New password must be at least 4 characters', 'error');
          return;
        }
        if (newPass !== confirm) {
          UI.toast('Passwords do not match', 'error');
          return;
        }

        Store.updateUser(user.email, { password: newPass });
        Store.logActivity('password_changed', 'profile', {});

        UI.closeModal();
        UI.toast('Password updated successfully', 'success');
      });
    }, 50);
  }

  return { render, setFilter, loadMore, editProfile, changePassword };
})();
