/* ============================================================
   ANTIGRAVITY HR — Leave Management Module
   ============================================================ */

const LeaveModule = (() => {
  let currentTab = 'requests';
  let currentPage = 1;
  let filterStatus = 'all';
  let calendarMonth = 5; // June (0-indexed)
  let calendarYear = 2026;

  function render() {
    const main = document.getElementById('main-content');
    const leaveRequests = Store.getAll('leaveRequests');
    const pendingCount = leaveRequests.filter(l => l.status === 'pending').length;

    main.innerHTML = `
      ${UI.pageHeader('Leave Management', `${leaveRequests.length} total requests · ${pendingCount} pending`,
        `<button class="btn btn-primary" onclick="LeaveModule.openApplyModal()">
          <span>+</span> Apply Leave
        </button>`
      )}

      ${UI.tabs([
        { id: 'requests', label: '📋 Requests' },
        { id: 'balances', label: '📊 Balances' },
        { id: 'calendar', label: '📅 Calendar' }
      ], currentTab, 'LeaveModule.switchTab')}

      <div id="leave-content"></div>
    `;

    renderTab();
  }

  function switchTab(tabId) {
    currentTab = tabId;
    // Update tab UI
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.textContent.includes(
      tabId === 'requests' ? 'Requests' : tabId === 'balances' ? 'Balances' : 'Calendar'
    )));
    renderTab();
  }

  function renderTab() {
    const container = document.getElementById('leave-content');
    if (!container) return;

    switch (currentTab) {
      case 'requests': renderRequests(container); break;
      case 'balances': renderBalances(container); break;
      case 'calendar': renderCalendar(container); break;
    }
  }

  function renderRequests(container) {
    let requests = Store.getAll('leaveRequests');
    if (filterStatus !== 'all') {
      requests = requests.filter(l => l.status === filterStatus);
    }
    requests.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));

    const columns = [
      {
        label: 'Employee', key: 'employeeId',
        render: (row) => {
          const emp = Store.getEmployeeById(row.employeeId);
          if (!emp) return '—';
          return `<div class="employee-cell">
            ${UI.avatar(emp.name, emp.color, 'sm')}
            <div><div class="name">${emp.name}</div><div class="email">${emp.email}</div></div>
          </div>`;
        }
      },
      {
        label: 'Type', key: 'type',
        render: (row) => `<span style="text-transform:capitalize">${row.type}</span>`
      },
      { label: 'From', key: 'startDate' },
      { label: 'To', key: 'endDate' },
      {
        label: 'Days', key: 'days',
        render: (row) => {
          const days = Math.ceil((new Date(row.endDate) - new Date(row.startDate)) / 86400000) + 1;
          return `${days} day${days > 1 ? 's' : ''}`;
        }
      },
      { label: 'Reason', key: 'reason', render: (row) => `<span class="truncate" style="max-width:160px;display:block">${row.reason}</span>` },
      { label: 'Status', key: 'status', render: (row) => UI.statusBadge(row.status) },
      {
        label: 'Actions', key: 'actions',
        render: (row) => {
          if (row.status === 'pending') {
            return `<div class="flex gap-2">
              <button class="btn btn-success btn-sm" onclick="LeaveModule.approve('${row.id}')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="LeaveModule.reject('${row.id}')">Reject</button>
            </div>`;
          }
          return '—';
        }
      }
    ];

    container.innerHTML = `
      <div class="filter-bar">
        <select class="form-select" onchange="LeaveModule.setFilter(this.value)" style="min-width:150px">
          <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="approved" ${filterStatus === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="rejected" ${filterStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>
      <div class="animate-fade-in-up">
        ${UI.dataTable(columns, requests, { id: 'leave-table', page: currentPage, perPage: 8 })}
      </div>
    `;

    // Pagination event
    container.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page >= 1) { currentPage = page; renderRequests(container); }
      });
    });
  }

  function renderBalances(container) {
    const employees = Store.getAll('employees').filter(e => e.status === 'active');
    const leaveTypes = [
      { key: 'casual', label: 'Casual Leave', total: 12, color: '#0ea5e9' },
      { key: 'sick', label: 'Sick Leave', total: 10, color: '#f59e0b' },
      { key: 'paid', label: 'Paid Leave', total: 15, color: '#10b981' },
      { key: 'unpaid', label: 'Unpaid Leave', total: -1, color: '#8b5cf6' }
    ];

    // Show overall company balance summary
    const allRequests = Store.getAll('leaveRequests').filter(l => l.status === 'approved');
    const usageByType = {};
    allRequests.forEach(l => {
      const days = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1;
      usageByType[l.type] = (usageByType[l.type] || 0) + days;
    });

    container.innerHTML = `
      <div class="leave-balances stagger-children animate-fade-in-up">
        ${leaveTypes.map(lt => {
          const used = usageByType[lt.key] || 0;
          return `<div class="leave-balance-card glass">
            <div class="lb-type">${lt.label}</div>
            ${UI.leaveCircle(used, lt.total, lt.color)}
            <div class="lb-details">${lt.total < 0 ? 'Unlimited' : `${used} used of ${lt.total} per person`}</div>
          </div>`;
        }).join('')}
      </div>

      <div class="card animate-fade-in-up" style="animation-delay:200ms">
        <div class="card-header">
          <h3 class="card-title">Employee Leave Summary</h3>
        </div>
        ${UI.dataTable([
          {
            label: 'Employee', key: 'name',
            render: (row) => `<div class="employee-cell">
              ${UI.avatar(row.name, row.color, 'sm')}
              <div><div class="name">${row.name}</div><div class="email">${row.department}</div></div>
            </div>`
          },
          { label: 'Casual', key: 'casual', render: (row) => `${row.balances.casual}/${leaveTypes[0].total}` },
          { label: 'Sick', key: 'sick', render: (row) => `${row.balances.sick}/${leaveTypes[1].total}` },
          { label: 'Paid', key: 'paid', render: (row) => `${row.balances.paid}/${leaveTypes[2].total}` },
          { label: 'Status', key: 'status', render: (row) => UI.statusBadge(row.status) }
        ], employees.map(e => ({
          ...e,
          balances: Store.getLeaveBalanceForEmployee(e.id)
        })), { id: 'balance-table', page: 1, perPage: 15 })}
      </div>
    `;
  }

  function renderCalendar(container) {
    const leaveRequests = Store.getAll('leaveRequests').filter(l => l.status === 'approved');
    const leaveDates = [];
    leaveRequests.forEach(l => {
      let d = new Date(l.startDate);
      const end = new Date(l.endDate);
      while (d <= end) {
        leaveDates.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
    });

    // People on leave this month
    const monthLeaves = leaveRequests.filter(l => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return (start.getMonth() === calendarMonth && start.getFullYear() === calendarYear) ||
             (end.getMonth() === calendarMonth && end.getFullYear() === calendarYear);
    });

    container.innerHTML = `
      <div class="leave-calendar-wrap animate-fade-in-up">
        <div class="card">
          ${UI.calendar(calendarYear, calendarMonth, leaveDates)}
        </div>
        <div class="leave-calendar-sidebar">
          <h3 class="card-title" style="margin-bottom:var(--sp-3)">On Leave This Month</h3>
          ${monthLeaves.length === 0 ? '<p class="text-sm text-tertiary">No approved leaves this month</p>' :
            monthLeaves.map(l => {
              const emp = Store.getEmployeeById(l.employeeId);
              if (!emp) return '';
              return `<div class="leave-calendar-entry">
                ${UI.avatar(emp.name, emp.color, 'sm')}
                <div>
                  <div class="lce-name">${emp.name}</div>
                  <div class="lce-type">${l.startDate} → ${l.endDate} · ${l.type}</div>
                </div>
              </div>`;
            }).join('')
          }
        </div>
      </div>
    `;
  }

  // ---- Actions ----
  function setFilter(status) {
    filterStatus = status;
    currentPage = 1;
    renderTab();
  }

  function approve(leaveId) {
    const leave = Store.getById('leaveRequests', leaveId);
    Store.update('leaveRequests', leaveId, { status: 'approved', approvedBy: 'current' });
    const empName = leave ? Store.getEmployeeName(leave.employeeId) : 'Unknown';
    Store.logActivity('leave_approved', 'leave', { employeeName: empName, type: leave ? leave.type : '' });
    UI.toast('Leave request approved', 'success');
    App.updateBadges();
    renderTab();
  }

  function reject(leaveId) {
    UI.confirm('Are you sure you want to reject this leave request?', () => {
      const leave = Store.getById('leaveRequests', leaveId);
      Store.update('leaveRequests', leaveId, { status: 'rejected', approvedBy: 'current' });
      const empName = leave ? Store.getEmployeeName(leave.employeeId) : 'Unknown';
      Store.logActivity('leave_rejected', 'leave', { employeeName: empName, type: leave ? leave.type : '' });
      UI.toast('Leave request rejected', 'warning');
      App.updateBadges();
      renderTab();
    });
  }

  function openApplyModal() {
    UI.openModal('Apply for Leave', UI.leaveForm(),
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="LeaveModule.submitLeave()">Submit Request</button>`
    );
  }

  function submitLeave() {
    const empId = document.getElementById('leave-emp').value;
    const type = document.getElementById('leave-type').value;
    const startDate = document.getElementById('leave-start').value;
    const endDate = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value;

    if (!empId || !startDate || !endDate || !reason) {
      UI.toast('Please fill all fields', 'error');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      UI.toast('End date must be after start date', 'error');
      return;
    }

    Store.add('leaveRequests', {
      id: Store.generateId('L'),
      employeeId: empId,
      type,
      startDate,
      endDate,
      reason,
      status: 'pending',
      appliedDate: new Date().toISOString().slice(0, 10)
    });

    UI.closeModal();
    UI.toast('Leave request submitted successfully', 'success');
    const empName = Store.getEmployeeName(empId);
    Store.logActivity('leave_request_created', 'leave', { type, employeeName: empName, startDate, endDate });
    App.updateBadges();
    render();
  }

  // Global calendar navigation
  window.CalendarNav = function(dir) {
    calendarMonth += dir;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderTab();
  };

  return { render, switchTab, setFilter, approve, reject, openApplyModal, submitLeave };
})();
