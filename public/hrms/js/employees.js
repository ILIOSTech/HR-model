/* ============================================================
   ANTIGRAVITY HR — Employee Management Module
   ============================================================ */

const EmployeesModule = (() => {
  let viewMode = 'grid'; // grid | list
  let filterDept = 'all';
  let searchQuery = '';
  let currentPage = 1;
  let detailEmployee = null;

  function render(params = []) {
    if (params[0]) {
      detailEmployee = params[0];
      renderDetail();
      return;
    }
    detailEmployee = null;
    renderList();
  }

  function renderList() {
    const main = document.getElementById('main-content');
    let employees = Store.getAll('employees');
    const departments = Store.getDepartments();

    // Filters
    if (filterDept !== 'all') {
      employees = employees.filter(e => e.department === filterDept);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      employees = employees.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
      );
    }

    main.innerHTML = `
      ${UI.pageHeader('Employees', `${employees.length} team members`,
        `<button class="btn btn-primary" onclick="EmployeesModule.openAddModal()">
          <span>+</span> Add Employee
        </button>`
      )}

      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search employees..." value="${searchQuery}"
            oninput="EmployeesModule.search(this.value)" class="form-input" style="padding-left:36px;border-radius:var(--radius-full)">
        </div>
        <select class="form-select" onchange="EmployeesModule.filterByDept(this.value)">
          <option value="all">All Departments</option>
          ${Object.keys(departments).map(d => `<option value="${d}" ${filterDept === d ? 'selected' : ''}>${d} (${departments[d]})</option>`).join('')}
        </select>
        <div class="view-toggle" style="margin-left:auto">
          <button class="view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="EmployeesModule.setView('grid')">▦</button>
          <button class="view-toggle-btn ${viewMode === 'list' ? 'active' : ''}" onclick="EmployeesModule.setView('list')">☰</button>
        </div>
      </div>

      <div id="employees-content" class="animate-fade-in-up"></div>
    `;

    const container = document.getElementById('employees-content');

    if (viewMode === 'grid') {
      renderGrid(container, employees);
    } else {
      renderTable(container, employees);
    }
  }

  function renderGrid(container, employees) {
    if (employees.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <h3 class="empty-state-title">No Employees Found</h3>
        <p class="empty-state-text">Try adjusting your search or filter criteria.</p>
      </div>`;
      return;
    }

    container.innerHTML = `<div class="employee-grid stagger-children">
      ${employees.map((emp, idx) => `
        <div class="employee-card glass" style="animation-delay:${idx * 50}ms" onclick="EmployeesModule.showDetail('${emp.id}')">
          <div class="emp-avatar" style="background:${emp.color}">${emp.name.split(' ').map(w => w[0]).join('')}</div>
          <div class="emp-name">${emp.name}</div>
          <div class="emp-role">${emp.role}</div>
          <div class="emp-dept">${emp.department}</div>
          <div class="emp-footer">
            ${UI.statusBadge(emp.status)}
            <span class="text-xs text-tertiary">Joined ${emp.joinDate}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderTable(container, employees) {
    const columns = [
      {
        label: 'Employee', key: 'name',
        render: (row) => `<div class="employee-cell" style="cursor:pointer" onclick="EmployeesModule.showDetail('${row.id}')">
          ${UI.avatar(row.name, row.color, 'sm')}
          <div><div class="name">${row.name}</div><div class="email">${row.email}</div></div>
        </div>`
      },
      { label: 'Department', key: 'department' },
      { label: 'Role', key: 'role' },
      { label: 'Joined', key: 'joinDate' },
      { label: 'Status', key: 'status', render: (row) => UI.statusBadge(row.status) },
      {
        label: 'Actions', key: 'actions',
        render: (row) => `<div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();EmployeesModule.openEditModal('${row.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();EmployeesModule.deleteEmployee('${row.id}')">🗑️</button>
        </div>`
      }
    ];

    container.innerHTML = UI.dataTable(columns, employees, { id: 'emp-table', page: currentPage, perPage: 10 });

    container.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page >= 1) { currentPage = page; renderTable(container, employees); }
      });
    });
  }

  function renderDetail() {
    const main = document.getElementById('main-content');
    const emp = Store.getEmployeeById(detailEmployee);
    if (!emp) { renderList(); return; }

    const balances = Store.getLeaveBalanceForEmployee(emp.id);
    const leaveHistory = Store.getAll('leaveRequests').filter(l => l.employeeId === emp.id);
    const attendance = Store.getAll('attendance').filter(a => a.employeeId === emp.id);
    const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'half-day').length;
    const totalDays = attendance.length;

    main.innerHTML = `
      ${UI.pageHeader(emp.name, '',
        `<button class="btn btn-secondary" onclick="EmployeesModule.render([])">← Back to List</button>
         <button class="btn btn-primary" onclick="EmployeesModule.openEditModal('${emp.id}')">✏️ Edit</button>`
      )}

      <div class="employee-detail animate-fade-in-up">
        <div class="emp-detail-sidebar">
          <div class="card">
            <div class="emp-detail-avatar" style="background:${emp.color}">${emp.name.split(' ').map(w => w[0]).join('')}</div>
            <div class="emp-detail-name">${emp.name}</div>
            <div class="emp-detail-role">${emp.role}</div>
            <div style="margin-top:var(--sp-3)">${UI.statusBadge(emp.status)}</div>

            <div class="emp-detail-info">
              <div class="emp-detail-row"><span class="label">Employee ID</span><span class="value">${emp.id}</span></div>
              <div class="emp-detail-row"><span class="label">Email</span><span class="value">${emp.email}</span></div>
              <div class="emp-detail-row"><span class="label">Phone</span><span class="value">${emp.phone}</span></div>
              <div class="emp-detail-row"><span class="label">Department</span><span class="value">${emp.department}</span></div>
              <div class="emp-detail-row"><span class="label">Joined</span><span class="value">${emp.joinDate}</span></div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-5">
          <!-- Attendance Summary -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Attendance Summary</h3>
            </div>
            <div class="attendance-overview">
              <div class="attendance-stat">
                <div class="att-value" style="color:var(--success-400)">${presentDays}</div>
                <div class="att-label">Days Present</div>
              </div>
              <div class="attendance-stat">
                <div class="att-value" style="color:var(--danger-400)">${totalDays - presentDays}</div>
                <div class="att-label">Days Absent</div>
              </div>
              <div class="attendance-stat">
                <div class="att-value" style="color:var(--primary-400)">${totalDays > 0 ? Math.round(presentDays/totalDays*100) : 0}%</div>
                <div class="att-label">Attendance Rate</div>
              </div>
            </div>
          </div>

          <!-- Leave Balances -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Leave Balances</h3>
            </div>
            <div class="leave-balances">
              <div class="leave-balance-card" style="background:rgba(99,102,241,0.06);border-radius:var(--radius-md)">
                <div class="lb-type">Casual</div>
                <div style="font-size:var(--text-xl);font-weight:700;color:var(--primary-400)">${balances.casual}</div>
                <div class="lb-details">of 12 remaining</div>
              </div>
              <div class="leave-balance-card" style="background:rgba(245,158,11,0.06);border-radius:var(--radius-md)">
                <div class="lb-type">Sick</div>
                <div style="font-size:var(--text-xl);font-weight:700;color:var(--warning-400)">${balances.sick}</div>
                <div class="lb-details">of 10 remaining</div>
              </div>
              <div class="leave-balance-card" style="background:rgba(16,185,129,0.06);border-radius:var(--radius-md)">
                <div class="lb-type">Paid</div>
                <div style="font-size:var(--text-xl);font-weight:700;color:var(--success-400)">${balances.paid}</div>
                <div class="lb-details">of 15 remaining</div>
              </div>
            </div>
          </div>

          <!-- Leave History -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Leave History</h3>
            </div>
            ${leaveHistory.length === 0 ?
              '<p class="text-sm text-tertiary" style="padding:var(--sp-4)">No leave history</p>' :
              UI.dataTable([
                { label: 'Type', key: 'type', render: (row) => `<span style="text-transform:capitalize">${row.type}</span>` },
                { label: 'From', key: 'startDate' },
                { label: 'To', key: 'endDate' },
                { label: 'Reason', key: 'reason' },
                { label: 'Status', key: 'status', render: (row) => UI.statusBadge(row.status) }
              ], leaveHistory, { id: 'emp-leave-table', page: 1, perPage: 5 })
            }
          </div>
        </div>
      </div>
    `;
  }

  // ---- Actions ----
  function search(query) {
    searchQuery = query;
    currentPage = 1;
    const container = document.getElementById('employees-content');
    let employees = Store.getAll('employees');
    if (filterDept !== 'all') employees = employees.filter(e => e.department === filterDept);
    if (query) {
      const q = query.toLowerCase();
      employees = employees.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
      );
    }
    if (viewMode === 'grid') renderGrid(container, employees);
    else renderTable(container, employees);
  }

  function filterByDept(dept) {
    filterDept = dept;
    currentPage = 1;
    renderList();
  }

  function setView(mode) {
    viewMode = mode;
    renderList();
  }

  function showDetail(empId) {
    detailEmployee = empId;
    renderDetail();
  }

  function openAddModal() {
    UI.openModal('Add New Employee', UI.employeeForm(),
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="EmployeesModule.submitEmployee()">Add Employee</button>`
    );
  }

  function openEditModal(empId) {
    const emp = Store.getEmployeeById(empId);
    if (!emp) return;
    UI.openModal('Edit Employee', UI.employeeForm(emp),
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="EmployeesModule.submitEmployee('${empId}')">Save Changes</button>`
    );
  }

  function submitEmployee(existingId) {
    const name = document.getElementById('emp-name').value.trim();
    const email = document.getElementById('emp-email').value.trim();
    const department = document.getElementById('emp-dept').value;
    const role = document.getElementById('emp-role').value.trim();
    const phone = document.getElementById('emp-phone').value.trim();
    const joinDate = document.getElementById('emp-join').value;

    if (!name || !email || !department || !role) {
      UI.toast('Please fill all required fields', 'error');
      return;
    }

    if (existingId) {
      Store.update('employees', existingId, { name, email, department, role, phone, joinDate });
      Store.logActivity('employee_updated', 'employee', { name, department, role });
      UI.toast(`${name}'s profile updated`, 'success');
    } else {
      Store.add('employees', {
        id: Store.generateId('E'),
        name, email, department, role, phone, joinDate,
        status: 'active',
        color: Store.getRandomAvatarColor()
      });
      Store.logActivity('employee_added', 'employee', { name, department, role });
      UI.toast(`${name} added to the team!`, 'success');
    }

    UI.closeModal();
    if (detailEmployee) renderDetail();
    else renderList();
  }

  function deleteEmployee(empId) {
    const emp = Store.getEmployeeById(empId);
    if (!emp) return;
    UI.confirm(`Are you sure you want to remove ${emp.name}? This action cannot be undone.`, () => {
      Store.logActivity('employee_deleted', 'employee', { name: emp.name, department: emp.department });
      Store.remove('employees', empId);
      UI.toast(`${emp.name} has been removed`, 'warning');
      renderList();
    });
  }

  return { render, search, filterByDept, setView, showDetail, openAddModal, openEditModal, submitEmployee, deleteEmployee };
})();
