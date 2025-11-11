
console.log('FinOps Tracker - Static JS loaded');

// Basic routing simulation
function initApp() {
  console.log('Initializing FinOps Tracker...');

  // Simple login check
  const token = localStorage.getItem('token');
  const root = document.getElementById('root');

  if (!token) {
    root.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5;">
        <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
          <h1 style="text-align: center; margin-bottom: 2rem;">FinOps Tracker</h1>
          <form id="loginForm">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Email:</label>
              <input type="email" id="email" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" required />
            </div>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Password:</label>
              <input type="password" id="password" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" required />
            </div>
            <button type="submit" style="width: 100%; padding: 0.75rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Login
            </button>
          </form>
          <div id="message" style="margin-top: 1rem; padding: 0.5rem; border-radius: 4px; display: none;"></div>
        </div>
      </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const messageDiv = document.getElementById('message');

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          messageDiv.style.cssText = 'color: green; background: #d4edda; border: 1px solid #c3e6cb;';
          messageDiv.textContent = 'Login successful! Redirecting...';
          messageDiv.style.display = 'block';

          setTimeout(() => {
            initApp();
          }, 1500);
        } else {
          messageDiv.style.cssText = 'color: red; background: #f8d7da; border: 1px solid #f5c6cb;';
          messageDiv.textContent = data.message || 'Login failed';
          messageDiv.style.display = 'block';
        }
      } catch (error) {
        console.error('Login error:', error);
        messageDiv.style.cssText = 'color: red; background: #f8d7da; border: 1px solid #f5c6cb;';
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.style.display = 'block';
      }
    });

  } else {
    // User is logged in, show dashboard
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    root.innerHTML = `
      <div style="background: #f8f9fa; min-height: 100vh;">
        <nav style="background: white; border-bottom: 1px solid #dee2e6; padding: 1rem 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0; color: #007bff;">FinOps Tracker</h1>
            <div>
              <span style="margin-right: 1rem;">Welcome, ${user.name || 'User'}</span>
              <button onclick="logout()" style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div style="padding: 2rem;">
          <h2>Dashboard</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 1rem 0; color: #28a745;">Total Budget</h3>
              <p style="font-size: 2rem; margin: 0; font-weight: bold;">$300,000</p>
            </div>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 1rem 0; color: #007bff;">Active Companies</h3>
              <p style="font-size: 2rem; margin: 0; font-weight: bold;">2</p>
            </div>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 1rem 0; color: #ffc107;">Pending Invoices</h3>
              <p style="font-size: 2rem; margin: 0; font-weight: bold;">1</p>
            </div>
          </div>

          <div style="margin-top: 2rem;">
            <h3>Quick Actions</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
              <button onclick="loadData('companies')" style="background: #007bff; color: white; border: none; padding: 1rem; border-radius: 4px; cursor: pointer;">View Companies</button>
              <button onclick="loadData('invoices')" style="background: #28a745; color: white; border: none; padding: 1rem; border-radius: 4px; cursor: pointer;">View Invoices</button>
              <button onclick="loadData('payments')" style="background: #ffc107; color: black; border: none; padding: 1rem; border-radius: 4px; cursor: pointer;">View Payments</button>
              <button onclick="loadData('vendors')" style="background: #6f42c1; color: white; border: none; padding: 1rem; border-radius: 4px; cursor: pointer;">View Vendors</button>
            </div>
          </div>

          <div id="dataDisplay" style="margin-top: 2rem;"></div>
        </div>
      </div>
    `;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  initApp();
}

async function loadData(type) {
  const dataDisplay = document.getElementById('dataDisplay');
  dataDisplay.innerHTML = '<p>Loading ' + type + '...</p>';

  try {
    const response = await fetch('/api/' + type);
    const data = await response.json();

    if (data.success && data.data) {
      let html = '<h3>' + type.charAt(0).toUpperCase() + type.slice(1) + '</h3>';
      html += '<div style="background: white; padding: 1rem; border-radius: 4px; border: 1px solid #dee2e6;">';

      if (data.data.length === 0) {
        html += '<p>No ' + type + ' found.</p>';
      } else {
        html += '<table style="width: 100%; border-collapse: collapse;">';
        if (type === 'companies') {
          html += '<tr><th style="border: 1px solid #dee2e6; padding: 0.5rem;">ID</th><th style="border: 1px solid #dee2e6; padding: 0.5rem;">Name</th><th style="border: 1px solid #dee2e6; padding: 0.5rem;">Budget</th><th style="border: 1px solid #dee2e6; padding: 0.5rem;">Status</th></tr>';
          data.data.forEach(item => {
            html += '<tr><td style="border: 1px solid #dee2e6; padding: 0.5rem;">' + item.id + '</td><td style="border: 1px solid #dee2e6; padding: 0.5rem;">' + item.name + '</td><td style="border: 1px solid #dee2e6; padding: 0.5rem;">$' + item.budget.toLocaleString() + '</td><td style="border: 1px solid #dee2e6; padding: 0.5rem;">' + item.status + '</td></tr>';
          });
        } else if (type === 'invoices') {
          html += '<tr><th style="border: 1px solid #dee2e6; padding: 0.5rem;">ID</th><th style="border: 1px solid #dee2e6; padding: 0.5rem;">Company</th><th style="border: 1px solid #dee2e6; padding: 0.5rem;">Amount</th><th style="border: 1px solid #dee2e6; padding: 0.5rem;">Status</th></tr>';
          data.data.forEach(item => {
            html += '<tr><td style="border: 1px solid #dee2e6; padding: 0.5rem;">' + item.id + '</td><td style="border: 1px solid #dee2e6; padding: 0.5rem;">' + item.company + '</td><td style="border: 1px solid #dee2e6; padding: 0.5rem;">$' + item.amount.toLocaleString() + '</td><td style="border: 1px solid #dee2e6; padding: 0.5rem;">' + item.status + '</td></tr>';
          });
        } else {
          html += '<pre>' + JSON.stringify(data.data, null, 2) + '</pre>';
        }
        html += '</table>';
      }

      html += '</div>';
      dataDisplay.innerHTML = html;
    } else {
      dataDisplay.innerHTML = '<p style="color: red;">Failed to load ' + type + '</p>';
    }
  } catch (error) {
    console.error('Error loading ' + type + ':', error);
    dataDisplay.innerHTML = '<p style="color: red;">Error loading ' + type + '</p>';
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
