/* ============================================================
   ANTIGRAVITY HR — App Initialization
   ============================================================ */

const App = (() => {
  const THEME_KEY = 'antigravity_theme';
  const USER_KEY = 'antigravity_user';

  function init() {
    // Initialize data store
    Store.init();

    // Apply saved theme
    initTheme();

    // Register routes
    Router.register('dashboard',   () => DashboardModule.render());
    Router.register('leave',       () => LeaveModule.render());
    Router.register('attendance',  () => AttendanceModule.render());
    Router.register('employees',   (params) => EmployeesModule.render(params));
    Router.register('recruitment', () => RecruitmentModule.render());
    Router.register('admin',       () => AdminModule.render());
    Router.register('profile',     (params) => ProfileModule.render(params));

    // Setup sidebar navigation
    setupSidebar();

    // Setup login & sign-up
    setupLogin();
    setupSignup();

    // Update pending badges
    updateBadges();

    // Update user display if already logged in
    updateUserDisplay();

    // Update admin visibility
    updateAdminVisibility();

    // Initialize router
    Router.init();
  }

  // ---- Theme Management ----
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    updateThemeIcons();
  }

  function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem(THEME_KEY, 'light');
    }
    updateThemeIcons();
  }

  function updateThemeIcons() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // Topbar icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';

    // Login screen toggle
    const loginToggle = document.getElementById('login-theme-toggle');
    if (loginToggle) loginToggle.innerHTML = isLight ? '☀️ Switch to Dark Mode' : '🌙 Switch to Light Mode';
  }

  // ---- Auth Tab Toggle ----
  function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');

    if (tab === 'signin') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      tabSignin.classList.add('active');
      tabSignup.classList.remove('active');
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      tabSignin.classList.remove('active');
      tabSignup.classList.add('active');
    }
  }

  // ---- Sidebar ----
  function setupSidebar() {
    document.querySelectorAll('.sidebar-link[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(link.dataset.route);
      });
    });
  }

  // ---- Login ----
  function setupLogin() {
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
          UI.toast('Please enter your credentials', 'error');
          return;
        }

        // Check against registered users
        const users = JSON.parse(localStorage.getItem('antigravity_users') || '[]');
        const user = users.find(u => u.email === email);

        if (user && user.password === password) {
          // Matching registered user
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          completeLogin(user.name);
        } else if (users.length === 0) {
          // No users registered — allow any login as admin
          const guestUser = { name: 'Admin', email, department: 'HR', role: 'Admin' };
          localStorage.setItem(USER_KEY, JSON.stringify(guestUser));
          // Also register as a user
          users.push({ ...guestUser, password });
          localStorage.setItem('antigravity_users', JSON.stringify(users));
          completeLogin(guestUser.name);
        } else if (user && user.password !== password) {
          UI.toast('Incorrect password', 'error');
        } else {
          UI.toast('Account not found — please sign up first', 'error');
        }
      });
    }

    // Demo login
    const demoBtn = document.getElementById('demo-login-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        const demoUser = { name: 'Admin', email: 'admin@antigravity.io', department: 'HR', role: 'Admin' };
        localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
        // Ensure demo user exists in users list
        const users = JSON.parse(localStorage.getItem('antigravity_users') || '[]');
        if (!users.find(u => u.email === demoUser.email)) {
          users.push({ ...demoUser, password: 'admin' });
          localStorage.setItem('antigravity_users', JSON.stringify(users));
        }
        completeLogin(demoUser.name);
      });
    }
  }

  function completeLogin(userName) {
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hiding');
    setTimeout(() => { loginScreen.style.display = 'none'; }, 500);

    // Log the login activity
    Store.logActivity('login', 'auth', { method: 'credentials' });

    UI.toast(`Welcome back, ${userName}! 👋`, 'success');
    updateUserDisplay();
    updateAdminVisibility();
  }

  // ---- Sign Up ----
  function setupSignup() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const department = (document.getElementById('signup-dept-custom') && document.getElementById('signup-dept-custom').value.trim()) || document.getElementById('signup-dept').value;
      const role = document.getElementById('signup-role').value.trim() || 'Employee';
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;

      // Validation
      if (!name || !email || !password) {
        UI.toast('Please fill all required fields', 'error');
        return;
      }
      if (password.length < 4) {
        UI.toast('Password must be at least 4 characters', 'error');
        return;
      }
      if (password !== confirm) {
        UI.toast('Passwords do not match', 'error');
        return;
      }

      // Check if email already exists
      const users = JSON.parse(localStorage.getItem('antigravity_users') || '[]');
      if (users.find(u => u.email === email)) {
        UI.toast('An account with this email already exists', 'error');
        return;
      }

      // Create user (sign-ups default to Employee role)
      const newUser = { name, email, password, department, role: 'Employee' };
      users.push(newUser);
      localStorage.setItem('antigravity_users', JSON.stringify(users));

      // Also add as an employee to the HR system
      Store.add('employees', {
        id: Store.generateId('E'),
        name,
        email,
        department,
        role,
        phone: '',
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        color: Store.getRandomAvatarColor()
      });

      // Auto-login
      localStorage.setItem(USER_KEY, JSON.stringify({ name, email, department, role: 'Employee' }));

      // Log activity
      Store.logActivity('login', 'auth', { method: 'signup' });

      UI.toast(`Account created successfully! Welcome, ${name}! 🎉`, 'success');
      completeLogin(name);
    });
  }

  // ---- User Display ----
  function updateUserDisplay() {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

      // Update topbar avatar
      const avatar = document.getElementById('topbar-avatar');
      if (avatar) {
        avatar.textContent = initials;
        avatar.title = `${user.name} — ${user.role || 'Employee'}`;
      }

      // Update sidebar user
      const sidebarName = document.querySelector('.sidebar-user .user-info div:first-child');
      const sidebarRole = document.querySelector('.sidebar-user .user-info div:last-child');
      const sidebarAvatar = document.querySelector('.sidebar-user .avatar');
      if (sidebarName) sidebarName.textContent = user.name;
      if (sidebarRole) sidebarRole.textContent = user.role || 'Employee';
      if (sidebarAvatar) sidebarAvatar.textContent = initials;
    } catch (e) { /* ignore */ }
  }

  // ---- Admin Visibility ----
  function updateAdminVisibility() {
    if (Store.isAdmin()) {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }
  }

  // ---- Badges ----
  function updateBadges() {
    const pendingLeaves = Store.getPendingLeaves();
    const leaveBadge = document.getElementById('leave-badge');
    if (leaveBadge) {
      if (pendingLeaves.length > 0) {
        leaveBadge.textContent = pendingLeaves.length;
        leaveBadge.style.display = 'flex';
      } else {
        leaveBadge.style.display = 'none';
      }
    }
  }

  // ---- Reset ----
  function resetData() {
    UI.confirm('This will reset all HR data to empty. Are you sure?', () => {
      Store.reset();
      Store.logActivity('data_reset', 'admin', {});
      UI.toast('Data has been reset', 'info');
      Router.handleRoute();
      updateBadges();
    });
  }

  function logout() {
    UI.confirm('Are you sure you want to sign out?', () => {
      localStorage.removeItem(USER_KEY);
      Store.logActivity('logout', 'auth', {});
      document.body.classList.remove('is-admin');
      const loginScreen = document.getElementById('login-screen');
      loginScreen.style.display = '';
      loginScreen.classList.remove('hiding');
      UI.toast('Signed out successfully', 'info');
    });
  }

  return { init, updateBadges, resetData, toggleTheme, switchAuthTab, updateAdminVisibility, logout };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
