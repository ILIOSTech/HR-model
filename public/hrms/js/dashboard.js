/* ============================================================
   ANTIGRAVITY HR — Dashboard Module
   ============================================================ */

const DashboardModule = (() => {

  function render() {
    const main = document.getElementById('main-content');
    const stats = Store.getAttendanceStats();
    const pendingLeaves = Store.getPendingLeaves();
    const openPositions = Store.getOpenPositions();
    const departments = Store.getDepartments();
    const activities = Store.getAll('activities');
    const employees = Store.getAll('employees');

    // Attendance data for bar chart (last 7 working days)
    const attendanceRecords = Store.getAll('attendance');
    const dayNames = ['Mon','Tue','Wed','Thu','Fri'];
    const chartData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().slice(0, 10);
      const present = attendanceRecords.filter(a => a.date === dateStr && (a.status === 'present' || a.status === 'late' || a.status === 'half-day')).length;
      chartData.push({ label: dayNames[d.getDay() - 1], value: present });
    }

    // Department chart data
    const deptColors = {
      Engineering: '#0ea5e9', Design: '#8b5cf6', HR: '#10b981',
      Marketing: '#f59e0b', Sales: '#06b6d4', Finance: '#ec4899'
    };
    const deptData = Object.entries(departments).map(([name, count]) => ({
      label: name, value: count, color: deptColors[name] || '#0ea5e9'
    }));

    const hasEmployees = employees.length > 0;
    const hasActivities = activities.length > 0;

    main.innerHTML = `
      ${UI.pageHeader('Dashboard', 'Welcome back! Here\'s your HR overview for today.')}

      <div class="stat-cards stagger-children">
        ${UI.statCard(employees.filter(e => e.status === 'active').length, 'Total Employees', '👥', 'primary')}
        ${UI.statCard(stats.present, 'Present Today', '✅', 'success')}
        ${UI.statCard(pendingLeaves.length, 'Pending Leaves', '📋', 'warning')}
        ${UI.statCard(openPositions.length, 'Open Positions', '💼', 'accent')}
      </div>

      <div class="dashboard-grid">
        <!-- Attendance Chart -->
        <div class="card chart-card animate-fade-in-up">
          <div class="card-header">
            <h3 class="card-title">Attendance Trend</h3>
            <span class="text-sm text-tertiary">Last 5 working days</span>
          </div>
          ${hasEmployees ? `
            <div class="today-summary">
              <div class="today-item">
                <div class="today-item-value" style="color:var(--success-400)">${stats.present}</div>
                <div class="today-item-label">Present</div>
              </div>
              <div class="today-item">
                <div class="today-item-value" style="color:var(--warning-400)">${stats.late}</div>
                <div class="today-item-label">Late</div>
              </div>
              <div class="today-item">
                <div class="today-item-value" style="color:var(--danger-400)">${stats.absent}</div>
                <div class="today-item-label">Absent</div>
              </div>
            </div>
            <div class="chart-container">
              ${chartData.some(d => d.value > 0) ? UI.barChart(chartData) : '<div class="empty-state" style="padding:var(--sp-8)"><div class="empty-state-icon">📊</div><p class="text-sm text-tertiary">No attendance data yet</p></div>'}
            </div>
          ` : `
            <div class="empty-state" style="padding:var(--sp-8)">
              <div class="empty-state-icon">📊</div>
              <p class="text-sm text-tertiary">Add employees to see attendance trends</p>
            </div>
          `}
        </div>

        <!-- Quick Actions + Department -->
        <div class="flex flex-col gap-5">
          <div class="card animate-fade-in-up" style="animation-delay:100ms">
            <div class="card-header">
              <h3 class="card-title">Quick Actions</h3>
            </div>
            <div class="quick-actions">
              <button class="quick-action-btn" onclick="Router.navigate('leave')">
                <span class="qa-icon">🏖️</span>
                <span>Apply Leave</span>
              </button>
              <button class="quick-action-btn" onclick="Router.navigate('attendance')">
                <span class="qa-icon">⏰</span>
                <span>Attendance</span>
              </button>
              <button class="quick-action-btn" onclick="Router.navigate('employees')">
                <span class="qa-icon">👤</span>
                <span>Add Employee</span>
              </button>
              <button class="quick-action-btn" onclick="Router.navigate('recruitment')">
                <span class="qa-icon">📋</span>
                <span>Post Job</span>
              </button>
            </div>
          </div>

          <div class="card animate-fade-in-up" style="animation-delay:200ms">
            <div class="card-header">
              <h3 class="card-title">Departments</h3>
            </div>
            ${deptData.length > 0 ? `
              <div class="dept-chart-container">
                ${UI.donutChart(deptData)}
                <div class="dept-legend">
                  ${deptData.map(d => `
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
                <p class="text-sm text-tertiary">No departments yet — add employees to populate</p>
              </div>
            `}
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card dashboard-grid-full animate-fade-in-up" style="animation-delay:300ms">
          <div class="card-header">
            <h3 class="card-title">Recent Activity</h3>
          </div>
          ${hasActivities ? `
            <div class="activity-feed">
              ${activities.map(a => UI.activityItem(a)).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:var(--sp-6)">
              <div class="empty-state-icon">📭</div>
              <p class="text-sm text-tertiary">No recent activity — actions you perform will appear here</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  return { render };
})();

