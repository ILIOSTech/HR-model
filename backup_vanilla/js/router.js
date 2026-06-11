/* ============================================================
   ANTIGRAVITY HR — SPA Router
   Hash-based client-side routing
   ============================================================ */

const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const [route, ...params] = hash.split('/');

    if (routes[route]) {
      // Update active sidebar link
      document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.toggle('active', link.dataset.route === route);
      });

      // Update topbar title
      const titles = {
        dashboard: 'Dashboard',
        leave: 'Leave Management',
        attendance: 'Attendance',
        employees: 'Employees',
        recruitment: 'Recruitment',
        admin: 'Admin Panel',
        profile: 'My Profile'
      };
      const topbarTitle = document.getElementById('topbar-title');
      if (topbarTitle) {
        topbarTitle.textContent = titles[route] || route;
      }

      // Animate page transition
      const main = document.getElementById('main-content');
      if (main) {
        main.style.opacity = '0';
        main.style.transform = 'translateY(8px)';
        setTimeout(() => {
          routes[route](params);
          main.style.opacity = '1';
          main.style.transform = 'translateY(0)';
        }, 150);
      } else {
        routes[route](params);
      }

      currentRoute = route;
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function getCurrent() {
    return currentRoute;
  }

  return { register, navigate, init, getCurrent, handleRoute };
})();
