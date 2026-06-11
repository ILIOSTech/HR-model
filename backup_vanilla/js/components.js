/* ============================================================
   ANTIGRAVITY HR — Reusable Components
   Modals, Toasts, Tables, Charts, Avatars, etc.
   ============================================================ */

const UI = (() => {

  // ---- Avatar ----
  function avatar(name, color, size = '') {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2);
    const cls = size ? `avatar avatar-${size}` : 'avatar';
    return `<div class="${cls}" style="background:${color}">${initials}</div>`;
  }

  // ---- Badge ----
  function badge(text, type = 'neutral') {
    return `<span class="badge badge-${type}">${text}</span>`;
  }

  function statusBadge(status) {
    const map = {
      active: ['Active', 'success'],
      'on-leave': ['On Leave', 'warning'],
      terminated: ['Terminated', 'danger'],
      pending: ['Pending', 'warning'],
      approved: ['Approved', 'success'],
      rejected: ['Rejected', 'danger'],
      present: ['Present', 'success'],
      absent: ['Absent', 'danger'],
      late: ['Late', 'warning'],
      'half-day': ['Half Day', 'info'],
      open: ['Open', 'success'],
      closed: ['Closed', 'neutral'],
      applied: ['Applied', 'info'],
      screening: ['Screening', 'primary'],
      interview: ['Interview', 'warning'],
      offer: ['Offer', 'success'],
      hired: ['Hired', 'success'],
    };
    const [label, type] = map[status] || [status, 'neutral'];
    return badge(label, type);
  }

  // ---- Toast Notifications ----
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.classList.add('removing');setTimeout(()=>this.parentElement.remove(),300)">✕</button>
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  // ---- Modal ----
  function openModal(title, bodyHTML, footerHTML = '') {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" onclick="UI.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;
    requestAnimationFrame(() => overlay.classList.add('active'));
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // ---- Confirm Dialog ----
  function confirm(message, onConfirm) {
    openModal('Confirm Action', `<p style="color:var(--text-secondary)">${message}</p>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="confirm-yes-btn">Confirm</button>`
    );
    setTimeout(() => {
      const btn = document.getElementById('confirm-yes-btn');
      if (btn) btn.addEventListener('click', () => { closeModal(); onConfirm(); });
    }, 50);
  }

  // ---- Data Table ----
  function dataTable(columns, rows, options = {}) {
    const { id = 'data-table', page = 1, perPage = 10, onRowClick } = options;
    const totalPages = Math.ceil(rows.length / perPage);
    const start = (page - 1) * perPage;
    const paged = rows.slice(start, start + perPage);

    let html = `<div class="table-container glass"><table class="data-table" id="${id}">`;
    html += '<thead><tr>';
    columns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';

    if (paged.length === 0) {
      html += `<tr><td colspan="${columns.length}" style="text-align:center;padding:var(--sp-8);color:var(--text-tertiary)">No records found</td></tr>`;
    } else {
      paged.forEach((row, idx) => {
        const clickAttr = onRowClick ? `style="cursor:pointer" data-idx="${start + idx}"` : '';
        html += `<tr ${clickAttr}>`;
        columns.forEach(col => {
          html += `<td>${col.render ? col.render(row) : (row[col.key] || '—')}</td>`;
        });
        html += '</tr>';
      });
    }

    html += '</tbody></table>';

    // Pagination
    if (totalPages > 1) {
      html += `<div class="pagination">
        <span class="pagination-info">Showing ${start + 1}–${Math.min(start + perPage, rows.length)} of ${rows.length}</span>
        <div class="pagination-controls">
          <button class="pagination-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`;
      for (let p = 1; p <= totalPages; p++) {
        html += `<button class="pagination-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
      html += `<button class="pagination-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>›</button>
        </div></div>`;
    }
    html += '</div>';
    return html;
  }

  // ---- Simple Bar Chart (SVG) ----
  function barChart(data, options = {}) {
    const { width = 600, height = 200, barColor = 'url(#barGrad)', labels = true } = options;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.min(32, (width - 40) / data.length - 8);
    const chartH = height - 40;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%">`;
    svg += `<defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--primary-400)"/>
      <stop offset="100%" stop-color="var(--primary-600)"/>
    </linearGradient></defs>`;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = 10 + (chartH / 4) * i;
      svg += `<line x1="30" y1="${y}" x2="${width - 10}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
    }

    data.forEach((d, i) => {
      const x = 40 + i * ((width - 50) / data.length);
      const barH = (d.value / maxVal) * chartH;
      const y = 10 + chartH - barH;

      svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${barColor}" rx="4" opacity="0.9">
        <animate attributeName="height" from="0" to="${barH}" dur="0.6s" fill="freeze"/>
        <animate attributeName="y" from="${10 + chartH}" to="${y}" dur="0.6s" fill="freeze"/>
      </rect>`;

      if (labels) {
        svg += `<text x="${x + barW / 2}" y="${height - 5}" text-anchor="middle" fill="var(--text-tertiary)" font-size="10">${d.label}</text>`;
        svg += `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" fill="var(--text-secondary)" font-size="10" font-weight="600">${d.value}</text>`;
      }
    });

    svg += '</svg>';
    return svg;
  }

  // ---- Donut Chart (SVG) ----
  function donutChart(data, options = {}) {
    const { size = 160, thickness = 20 } = options;
    const r = (size - thickness) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const total = data.reduce((s, d) => s + d.value, 0);

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${thickness}"/>`;

    let offset = 0;
    data.forEach(d => {
      const pct = d.value / total;
      const dash = pct * circumference;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${thickness}"
        stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" opacity="0.85">
        <animate attributeName="stroke-dasharray" from="0 ${circumference}" to="${dash} ${circumference - dash}" dur="0.8s" fill="freeze"/>
      </circle>`;
      offset += dash;
    });

    svg += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--text-primary)" font-size="22" font-weight="700" font-family="var(--font-heading)">${total}</text>`;
    svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text-tertiary)" font-size="10">Total</text>`;
    svg += '</svg>';
    return svg;
  }

  // ---- Leave Balance Circle ----
  function leaveCircle(used, total, color) {
    const r = 32;
    const circumference = 2 * Math.PI * r;
    const remaining = total < 0 ? total : total - used;
    const pct = total < 0 ? 0 : (used / total);
    const dash = pct * circumference;

    return `<div class="lb-circle">
      <svg viewBox="0 0 80 80">
        <circle class="circle-bg" cx="40" cy="40" r="${r}"/>
        <circle class="circle-fill" cx="40" cy="40" r="${r}" stroke="${color}"
          stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="0"
          transform="rotate(-90 40 40)"/>
      </svg>
      <div class="lb-value">${total < 0 ? '∞' : remaining}</div>
    </div>`;
  }

  // ---- Calendar ----
  function calendar(year, month, highlights = []) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let html = `<div class="calendar">
      <div class="calendar-header">
        <button class="btn btn-ghost btn-sm" onclick="CalendarNav(-1)">‹</button>
        <h3 style="font-size:var(--text-base);font-weight:600">${months[month]} ${year}</h3>
        <button class="btn btn-ghost btn-sm" onclick="CalendarNav(1)">›</button>
      </div>
      <div class="calendar-grid">`;

    days.forEach(d => {
      html += `<div class="calendar-day-label">${d}</div>`;
    });

    // Previous month padding
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="calendar-day other-month">${prevDays - i}</div>`;
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const hasLeave = highlights.includes(dateStr);
      html += `<div class="calendar-day${isToday ? ' today' : ''}">${d}${hasLeave ? '<span class="leave-dot"></span>' : ''}</div>`;
    }

    // Next month padding
    const totalCells = firstDay + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
      }
    }

    html += '</div></div>';
    return html;
  }

  // ---- Stat Card ----
  function statCard(value, label, icon, iconType, change = null) {
    return `<div class="stat-card glass">
      <div class="stat-card-header">
        <div class="stat-card-icon ${iconType}">${icon}</div>
        ${change ? `<span class="stat-card-change ${change > 0 ? 'up' : 'down'}">${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%</span>` : ''}
      </div>
      <div class="stat-card-value">${value}</div>
      <div class="stat-card-label">${label}</div>
    </div>`;
  }

  // ---- Activity Item ----
  function activityItem(activity) {
    return `<div class="activity-item">
      <div class="activity-icon" style="background:${activity.iconBg || 'var(--glass-bg)'};color:${activity.iconColor || 'var(--text-secondary)'}">
        ${activity.icon}
      </div>
      <div class="activity-content">
        <div>${activity.message}</div>
        <div class="activity-time">${activity.time}</div>
      </div>
    </div>`;
  }

  // ---- Page Header ----
  function pageHeader(title, subtitle, actions = '') {
    return `<div class="page-header">
      <div class="page-header-left">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
      <div class="page-header-right flex gap-3">${actions}</div>
    </div>`;
  }

  // ---- Tabs ----
  function tabs(items, activeId, onClickFn) {
    return `<div class="tabs">${items.map(item =>
      `<button class="tab ${item.id === activeId ? 'active' : ''}" onclick="${onClickFn}('${item.id}')">${item.label}</button>`
    ).join('')}</div>`;
  }

  // ---- Employee Form ----
  function employeeForm(employee = null) {
    const e = employee || {};
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" id="emp-name" value="${e.name || ''}" placeholder="Enter full name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="emp-email" type="email" value="${e.email || ''}" placeholder="email@antigravity.io" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Department</label>
          <select class="form-select" id="emp-dept">
            <option value="">Select department</option>
            ${['Engineering','Design','HR','Marketing','Sales','Finance'].map(d =>
              `<option value="${d}" ${e.department === d ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <input class="form-input" id="emp-role" value="${e.role || ''}" placeholder="Job title">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="emp-phone" value="${e.phone || ''}" placeholder="+91 XXXXX XXXXX">
        </div>
        <div class="form-group">
          <label class="form-label">Joining Date</label>
          <input class="form-input" id="emp-join" type="date" value="${e.joinDate || ''}">
        </div>
      </div>
    `;
  }

  // ---- Leave Form ----
  function leaveForm() {
    const employees = Store.getAll('employees').filter(e => e.status === 'active');
    return `
      <div class="form-group">
        <label class="form-label">Employee</label>
        <select class="form-select" id="leave-emp">
          <option value="">Select employee</option>
          ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Leave Type</label>
        <select class="form-select" id="leave-type">
          <option value="casual">Casual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="paid">Paid Leave</option>
          <option value="unpaid">Unpaid Leave</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input class="form-input" id="leave-start" type="date">
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input class="form-input" id="leave-end" type="date">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <textarea class="form-textarea" id="leave-reason" placeholder="Enter reason for leave"></textarea>
      </div>
    `;
  }

  return {
    avatar, badge, statusBadge, toast, openModal, closeModal, confirm,
    dataTable, barChart, donutChart, leaveCircle, calendar,
    statCard, activityItem, pageHeader, tabs, employeeForm, leaveForm
  };
})();
