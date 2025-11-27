/**
 * Main JavaScript for Gambia Election Results System
 * Mobile-friendly SPA with vanilla JavaScript
 */

// ============================================
// State Management
// ============================================
const state = {
    token: null,
    user: null,
    regions: [],
    constituencies: [],
    stations: [],
    participants: [],
    currentView: 'login'
};

// ============================================
// API Helper
// ============================================
const API_BASE = '/api';

const api = {
    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(state.token && { Authorization: `Bearer ${state.token}` })
            },
            ...options
        };
        
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            showLoader();
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                // Check if account is deactivated
                if (response.status === 403 && data.message && data.message.toLowerCase().includes('deactivated')) {
                    showAccountDeactivatedPage();
                    throw new Error(data.message || 'Account deactivated');
                }
                // Check if session has been terminated
                if (response.status === 401 && data.message && data.message.toLowerCase().includes('terminated')) {
                    showToast('Your session has been terminated by an administrator', 'error');
                    logout();
                    throw new Error(data.message || 'Session terminated');
                }
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            hideLoader();
        }
    },
    
    get(endpoint) {
        return this.request(endpoint);
    },
    
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    },
    
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ============================================
// UI Helpers
// ============================================
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showAccountDeactivatedPage() {
    // Mark user as deactivated to prevent further API calls
    if (state.user) {
        state.user.is_active = false;
    }
    
    // Hide header completely
    const header = document.getElementById('header');
    if (header) header.style.display = 'none';
    
    // Hide sidenav completely
    const sidenav = document.getElementById('sidenav');
    const overlay = document.getElementById('overlay');
    if (sidenav) sidenav.style.display = 'none';
    if (overlay) overlay.classList.remove('active');
    
    // Hide menu button
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) menuBtn.style.display = 'none';
    
    // Show deactivation message in main container
    document.body.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; padding: 1rem;">
            <div class="card" style="max-width: 500px; text-align: center;">
                <div class="card-body">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                    <h2 style="color: #dc3545; margin-bottom: 1rem;">Account Deactivated</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 1.5rem; color: #6c757d;">
                        Your account has been deactivated by an administrator.
                    </p>
                    <p style="margin-bottom: 2rem; color: #6c757d;">
                        You no longer have access to this system. 
                        Please contact your system administrator for more information.
                    </p>
                    <button class="btn btn-primary btn-full" onclick="localStorage.clear(); window.location.reload();">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    `;
}

function toggleSidenav() {
    const sidenav = document.getElementById('sidenav');
    const overlay = document.getElementById('overlay');
    sidenav.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeSidenav() {
    document.getElementById('sidenav').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

// ============================================
// Authentication
// ============================================
async function login(email, password) {
    try {
        const response = await api.post('/auth/login', { email, password });
        state.token = response.data.token;
        state.user = response.data.user;
        
        // Store in localStorage
        localStorage.setItem('token', state.token);
        localStorage.setItem('user', JSON.stringify(state.user));
        
        showToast('Login successful!', 'success');
        initializeApp();
    } catch (error) {
        showToast(error.message || 'Login failed', 'error');
    }
}

function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'success');
    showLoginView();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
        return true;
    }
    return false;
}

// ============================================
// Navigation
// ============================================
function initializeNavigation() {
    const menuBtn = document.getElementById('menuBtn');
    const closeSidenavBtn = document.getElementById('closeSidenavBtn');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    menuBtn.addEventListener('click', toggleSidenav);
    closeSidenavBtn.addEventListener('click', closeSidenav);
    overlay.addEventListener('click', closeSidenav);
    logoutBtn.addEventListener('click', logout);
    refreshBtn.addEventListener('click', refreshCurrentView);
    
    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (state.user) {
        userInfo.textContent = state.user.full_name;
        logoutBtn.style.display = 'flex';
        refreshBtn.style.display = 'flex';
    }
    
    // Build menu based on role
    buildMenu();
}

function buildMenu() {
    const navMenu = document.getElementById('navMenu');
    const role = state.user?.role;
    
    const menuItems = {
        admin: [
            { label: 'Dashboard', view: 'dashboard', icon: iconDashboard() },
            { label: 'Submit Results', view: 'submit', icon: iconEdit() },
            { label: 'View Results', view: 'results', icon: iconChart() },
            { label: 'Projection Results', view: 'projection-results', icon: iconTrendUp() },
            { label: 'Projection Setup', view: 'projection-setup', icon: iconTarget() },
            { label: 'Participants', view: 'participants', icon: iconUsers() },
            { label: 'Users', view: 'users', icon: iconUser() },
            { label: 'Geography', view: 'geography', icon: iconMap() },
            { label: 'Active Sessions', view: 'sessions', icon: iconUser() },
            { label: 'Audit Logs', view: 'audit', icon: iconList() },
            { label: 'System Settings', view: 'settings', icon: iconSettings() }
        ],
        manager: [
            { label: 'Dashboard', view: 'dashboard', icon: iconDashboard() },
            { label: 'Submit Results', view: 'submit', icon: iconEdit() },
            { label: 'View Results', view: 'results', icon: iconChart() },
            { label: 'Projection Results', view: 'projection-results', icon: iconTrendUp() },
            { label: 'Users', view: 'users', icon: iconUser() },
            { label: 'Active Sessions', view: 'sessions', icon: iconUser() }
        ],
        member: [
            { label: 'Dashboard', view: 'dashboard', icon: iconDashboard() },
            { label: 'My Stations', view: 'my-stations', icon: iconMap() },
            { label: 'Submit Results', view: 'submit', icon: iconEdit() },
            { label: 'View Results', view: 'results', icon: iconChart() },
            { label: 'Projection Results', view: 'projection-results', icon: iconTrendUp() }
        ],
        reader: [
            { label: 'Dashboard', view: 'dashboard', icon: iconDashboard() },
            { label: 'View Results', view: 'results', icon: iconChart() },
            { label: 'Projection Results', view: 'projection-results', icon: iconTrendUp() }
        ]
    };
    
    const items = menuItems[role] || menuItems.reader;
    
    navMenu.innerHTML = items.map(item => `
        <li>
            <a href="#" data-view="${item.view}">
                ${item.icon}
                ${item.label}
            </a>
        </li>
    `).join('');
    
    // Add event listeners
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            navigateTo(view);
            closeSidenav();
        });
    });
}

function navigateTo(view) {
    // Check if user is deactivated
    if (state.user && state.user.is_active === false) {
        showAccountDeactivatedPage();
        return;
    }
    
    state.currentView = view;
    
    // Update active nav item
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === view) {
            link.classList.add('active');
        }
    });
    
    // Load view
    loadCurrentView();
}

// Refresh current view (reload data)
function refreshCurrentView() {
    showToast('Refreshing...', 'info');
    loadCurrentView();
}

// Load view based on state.currentView
function loadCurrentView() {
    const view = state.currentView || 'dashboard';
    
    switch (view) {
        case 'dashboard':
            showDashboard();
            break;
        case 'results':
            showResultsView();
            break;
        case 'submit':
            showSubmitResultsView();
            break;
        case 'participants':
            showParticipantsView();
            break;
        case 'users':
            showUsersView();
            break;
        case 'geography':
            showGeographyView();
            break;
        case 'my-stations':
            showMyStationsView();
            break;
        case 'audit':
            showAuditLogsView();
            break;
        case 'sessions':
            showActiveSessionsView();
            break;
        case 'settings':
            showSystemSettingsView();
            break;
        case 'projection-results':
            showProjectionResultsView();
            break;
        case 'projection-setup':
            showProjectionSetupView();
            break;
        default:
            showDashboard();
    }
}

// ============================================
// Views
// ============================================

// Login View
function showLoginView() {
    const content = document.getElementById('content');
    document.getElementById('header').style.display = 'none';
    
    content.innerHTML = `
        <div style="max-width: 400px; margin: 40px auto; padding: 20px;">
            <div class="card">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: var(--primary-color); margin-bottom: 8px;">Election Results</h1>
                    <p class="text-muted">The Gambia</p>
                </div>
                <form id="loginForm">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-control" id="loginEmail" required 
                               autocomplete="username" placeholder="Enter your username">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div style="position: relative;">
                            <input type="password" class="form-control" id="loginPassword" required 
                                   autocomplete="current-password" placeholder="Enter your password"
                                   style="padding-right: 2.5rem;">
                            <button type="button" onclick="togglePasswordVisibility('loginPassword', 'loginPasswordToggle')" 
                                    id="loginPasswordToggle"
                                    style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); 
                                           border: none; background: none; cursor: pointer; padding: 0.25rem; font-size: 1.2rem;">
                                👁️
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">Login</button>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });
}

// Dashboard View
async function showDashboard() {
    try {
        // Check if user is a member with assignments
        if (state.user.role === 'member') {
            await showMemberDashboard();
            return;
        }
        
        // Show national dashboard for admin/manager/reader
        const response = await api.get('/results/country');
        const data = response.data;
        
        const totalVotes = data.total_votes || 0;
        const registeredVoters = data.registered_voters || 0;
        const blankBallots = data.blank_ballots || 0;
        const spoiledBallots = data.spoiled_ballots || 0;
        const turnoutPercent = registeredVoters > 0 
            ? ((totalVotes / registeredVoters) * 100).toFixed(1) 
            : 0;
        
        // Get top 3 parties by vote count (dynamic sorting)
        const results = data.results || [];
        const top3 = [...results]
            .sort((a, b) => b.vote_count - a.vote_count) // Sort by votes DESC
            .slice(0, 3);
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <!-- Page Title -->
            <div style="margin-bottom: 2rem;">
                <h1 style="font-size: 2rem; font-weight: 700; color: #1a202c; margin-bottom: 0.5rem;">
                    🇬🇲 National Election Results
                </h1>
                <p style="color: #718096; font-size: 1rem;">The Gambia • Live Results</p>
            </div>
            
            ${top3.length > 0 ? `
            <!-- Top 3 Leading Parties Card -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        border-radius: 16px; 
                        padding: 2.5rem; 
                        margin-bottom: 2rem; 
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        color: white;
                        position: relative;
                        overflow: hidden;">
                <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; 
                            background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; 
                            background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: relative; z-index: 1;">
                    <div style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 2px; 
                                opacity: 0.9; margin-bottom: 1.5rem;">Top 3 Leading Parties</div>
                    
                    ${top3.map((party, index) => {
                        const percent = totalVotes > 0 ? ((party.vote_count / totalVotes) * 100).toFixed(1) : 0;
                        const isFirst = index === 0;
                        
                        return `
                        <div style="margin-bottom: ${index < 2 ? '1.5rem' : '0'}; 
                                    padding-bottom: ${index < 2 ? '1.5rem' : '0'}; 
                                    border-bottom: ${index < 2 ? '1px solid rgba(255,255,255,0.2)' : 'none'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 200px;">
                                    <div style="font-size: ${isFirst ? '0.75rem' : '0.7rem'}; 
                                                opacity: 0.8; 
                                                margin-bottom: 0.25rem;">
                                        ${index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place'}
                                    </div>
                                    <h3 style="font-size: ${isFirst ? '1.75rem' : '1.5rem'}; 
                                               font-weight: ${isFirst ? '800' : '700'}; 
                                               margin: 0; 
                                               line-height: 1.2;">
                                        ${party.participant_name}
                                    </h3>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: ${isFirst ? '2.5rem' : '2rem'}; 
                                                font-weight: 900;">
                                        ${percent}%
                                    </div>
                                    <div style="font-size: 0.875rem; opacity: 0.9;">
                                        ${party.vote_count.toLocaleString()} votes
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- Statistics Grid -->
            <div style="display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
                        gap: 1rem; 
                        margin-bottom: 2rem;">
                
                <!-- Stations Progress -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            border-radius: 12px; 
                            padding: 1.5rem; 
                            color: white;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">📍 Stations</div>
                    <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
                        ${data.stations_reported || 0}/${data.total_stations || 0}
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">
                        ${data.total_stations > 0 ? ((data.stations_reported / data.total_stations) * 100).toFixed(0) : 0}% Reported
                    </div>
                </div>
                
                <!-- Registered Voters -->
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                            border-radius: 12px; 
                            padding: 1.5rem; 
                            color: white;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">👥 Registered</div>
                    <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
                        ${(registeredVoters / 1000000).toFixed(2)}M
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">
                        ${registeredVoters.toLocaleString()} voters
                    </div>
                </div>
                
                <!-- Total Votes -->
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                            border-radius: 12px; 
                            padding: 1.5rem; 
                            color: white;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">🗳️ Total Votes</div>
                    <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
                        ${(totalVotes / 1000).toFixed(1)}K
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">
                        ${totalVotes.toLocaleString()} cast
                    </div>
                </div>
                
                <!-- Turnout -->
                <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); 
                            border-radius: 12px; 
                            padding: 1.5rem; 
                            color: white;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">📊 Turnout</div>
                    <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
                        ${turnoutPercent}%
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">
                        Voter participation
                    </div>
                </div>
                
                <!-- Blank Ballots -->
                <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); 
                            border-radius: 12px; 
                            padding: 1.5rem; 
                            color: white;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">📄 Blank</div>
                    <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
                        ${(blankBallots / 1000).toFixed(1)}K
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">
                        ${blankBallots.toLocaleString()} ballots
                    </div>
                </div>
                
                <!-- Spoiled Ballots -->
                <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); 
                            border-radius: 12px; 
                            padding: 1.5rem; 
                            color: #2d3748;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="font-size: 0.875rem; opacity: 0.8; margin-bottom: 0.5rem;">❌ Spoiled</div>
                    <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
                        ${(spoiledBallots / 1000).toFixed(1)}K
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.7;">
                        ${spoiledBallots.toLocaleString()} ballots
                    </div>
                </div>
            </div>
            
            <!-- Results by Participant -->
            <div style="background: white; 
                        border-radius: 16px; 
                        padding: 2rem; 
                        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);">
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: #1a202c; margin-bottom: 0.5rem;">
                        📈 Detailed Results
                    </h3>
                    <p style="color: #718096; font-size: 0.875rem;">Vote distribution by political party</p>
                </div>
                <div id="resultsChart">
                    <!-- Results will be rendered here -->
                </div>
            </div>
        `;
        
        renderResultsChart(results, totalVotes);
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}

// Member Dashboard - Shows only their assigned areas
async function showMemberDashboard() {
    try {
        const content = document.getElementById('content');
        
        // Get member's assignments
        const assignments = state.user.assignments || [];
        
        if (assignments.length === 0) {
            content.innerHTML = `
                <h2 class="mb-2">My Dashboard</h2>
                <div class="card">
                    <div class="card-body text-center">
                        <p class="text-muted">You have not been assigned to any areas yet.</p>
                        <p class="text-muted">Please contact your administrator.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Build dashboard based on assignments
        let dashboardHTML = '<h2 class="mb-2">My Assigned Areas</h2>';
        
        for (const assignment of assignments) {
            let endpoint = '';
            let title = '';
            
            if (assignment.level === 1) {
                endpoint = `/results/station/${assignment.station_id}`;
                title = `${assignment.station_name}`;
            } else if (assignment.level === 2) {
                endpoint = `/results/constituency/${assignment.constituency_id}`;
                title = `${assignment.constituency_name}`;
            } else if (assignment.level === 3) {
                endpoint = `/results/region/${assignment.region_id}`;
                title = `${assignment.region_name}`;
            }
            
            try {
                const results = await api.get(endpoint);
                const data = results.data;
                
                const totalVotes = data.total_votes || 0;
                const registeredVoters = data.registered_voters || 0;
                const blankBallots = data.blank_ballots || 0;
                const spoiledBallots = data.spoiled_ballots || 0;
                const turnoutPercent = registeredVoters > 0 
                    ? ((totalVotes / registeredVoters) * 100).toFixed(1) 
                    : 0;
                
                dashboardHTML += `
                    <div class="card mb-2">
                        <div class="card-header">
                            <h3 class="card-title">${title}</h3>
                            <span class="badge ${assignment.level === 1 ? 'badge-success' : assignment.level === 2 ? 'badge-warning' : ''}">
                                Level ${assignment.level}
                            </span>
                        </div>
                        <div class="card-body">
                            <div class="stats-grid mb-2">
                                ${assignment.level !== 1 ? `
                                <div class="stat-card">
                                    <span class="stat-value">${data.stations_reported || 0}</span>
                                    <span class="stat-label">Reported</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">${data.total_stations || 0}</span>
                                    <span class="stat-label">Total Stations</span>
                                </div>
                                ` : ''}
                                <div class="stat-card">
                                    <span class="stat-value">${registeredVoters.toLocaleString()}</span>
                                    <span class="stat-label">Registered</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">${totalVotes.toLocaleString()}</span>
                                    <span class="stat-label">Total Votes</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">${turnoutPercent}%</span>
                                    <span class="stat-label">Turnout</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">${blankBallots.toLocaleString()}</span>
                                    <span class="stat-label">Blank</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">${spoiledBallots.toLocaleString()}</span>
                                    <span class="stat-label">Spoiled</span>
                                </div>
                            </div>
                            <div id="resultsChart_${assignment.id}"></div>
                        </div>
                    </div>
                `;
                
                // Delay to ensure DOM is ready
                setTimeout(() => {
                    renderResultsChart(data.results || [], totalVotes, `resultsChart_${assignment.id}`);
                }, 100);
                
            } catch (error) {
                dashboardHTML += `
                    <div class="card mb-2">
                        <div class="card-header">
                            <h3 class="card-title">${title}</h3>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Failed to load results for this area.</p>
                        </div>
                    </div>
                `;
            }
        }
        
        content.innerHTML = dashboardHTML;
        
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}

// Results View
async function showResultsView() {
    // For members, show only their assigned areas
    if (state.user.role === 'member') {
        await showMemberResultsView();
        return;
    }
    
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2 class="mb-2">View Results</h2>
        
        <div class="card">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Select Level</label>
                    <select class="form-control form-select" id="resultLevel">
                        <option value="country">Country</option>
                        <option value="region">Region</option>
                        <option value="constituency">Constituency</option>
                        <option value="station">Station</option>
                    </select>
                </div>
                <div class="form-group hidden" id="regionSelectGroup">
                    <label class="form-label">Select Region</label>
                    <select class="form-control form-select" id="regionSelect">
                        <option value="">-- Select Region --</option>
                    </select>
                </div>
                <div class="form-group hidden" id="constituencySelectGroup">
                    <label class="form-label">Select Constituency</label>
                    <select class="form-control form-select" id="constituencySelect">
                        <option value="">-- Select Constituency --</option>
                    </select>
                </div>
                <div class="form-group hidden" id="stationSelectGroup">
                    <label class="form-label">Select Station</label>
                    <select class="form-control form-select" id="stationSelect">
                        <option value="">-- Select Station --</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-full" id="viewResultsBtn">View Results</button>
            </div>
        </div>
        
        <div id="resultsDisplay"></div>
    `;
    
    // Load geography data
    await loadGeographyData();
    
    // Set up event listeners
    setupResultsViewListeners();
}

// Member Results View - Restricted to assigned areas
async function showMemberResultsView() {
    const content = document.getElementById('content');
    
    const assignments = state.user.assignments || [];
    
    if (assignments.length === 0) {
        content.innerHTML = `
            <h2 class="mb-2">View Results</h2>
            <div class="card">
                <div class="card-body text-center">
                    <p class="text-muted">You have not been assigned to any areas yet.</p>
                </div>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <h2 class="mb-2">View Results - My Areas</h2>
        
        <div class="card">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Select Your Assigned Area</label>
                    <select class="form-control form-select" id="memberAreaSelect">
                        <option value="">-- Select Area --</option>
                        ${assignments.map(a => {
                            let label = '';
                            let value = '';
                            if (a.level === 1) {
                                label = `Station: ${a.station_name}`;
                                value = `station:${a.station_id}`;
                            } else if (a.level === 2) {
                                label = `Constituency: ${a.constituency_name}`;
                                value = `constituency:${a.constituency_id}`;
                            } else if (a.level === 3) {
                                label = `Region: ${a.region_name}`;
                                value = `region:${a.region_id}`;
                            }
                            return `<option value="${value}">${label}</option>`;
                        }).join('')}
                    </select>
                </div>
                <button class="btn btn-primary btn-full" id="viewMemberResultsBtn">View Results</button>
            </div>
        </div>
        
        <div id="resultsDisplay"></div>
    `;
    
    document.getElementById('viewMemberResultsBtn').addEventListener('click', async () => {
        const select = document.getElementById('memberAreaSelect');
        const value = select.value;
        
        if (!value) {
            showToast('Please select an area', 'warning');
            return;
        }
        
        const [type, id] = value.split(':');
        const endpoint = `/results/${type}/${id}`;
        
        try {
            const response = await api.get(endpoint);
            displayResults(response.data, type);
        } catch (error) {
            showToast('Failed to load results', 'error');
        }
    });
}

function setupResultsViewListeners() {
    const levelSelect = document.getElementById('resultLevel');
    const regionSelect = document.getElementById('regionSelect');
    const constituencySelect = document.getElementById('constituencySelect');
    const viewBtn = document.getElementById('viewResultsBtn');
    
    levelSelect.addEventListener('change', (e) => {
        const level = e.target.value;
        
        // Show/hide appropriate selects
        document.getElementById('regionSelectGroup').classList.toggle('hidden', level === 'country');
        document.getElementById('constituencySelectGroup').classList.toggle('hidden', 
            level === 'country' || level === 'region');
        document.getElementById('stationSelectGroup').classList.toggle('hidden', 
            level !== 'station');
        
        // Populate region select
        if (level !== 'country') {
            populateRegionSelect();
        }
    });
    
    regionSelect.addEventListener('change', (e) => {
        const regionId = e.target.value;
        const level = levelSelect.value;
        
        if (regionId && (level === 'constituency' || level === 'station')) {
            populateConstituencySelect(regionId);
        }
    });
    
    constituencySelect.addEventListener('change', (e) => {
        const constituencyId = e.target.value;
        const level = levelSelect.value;
        
        if (constituencyId && level === 'station') {
            populateStationSelect(constituencyId);
        }
    });
    
    viewBtn.addEventListener('click', async () => {
        const level = levelSelect.value;
        let endpoint = '';
        
        switch (level) {
            case 'country':
                endpoint = '/results/country';
                break;
            case 'region':
                const regionId = regionSelect.value;
                if (!regionId) {
                    showToast('Please select a region', 'warning');
                    return;
                }
                endpoint = `/results/region/${regionId}`;
                break;
            case 'constituency':
                const constituencyId = constituencySelect.value;
                if (!constituencyId) {
                    showToast('Please select a constituency', 'warning');
                    return;
                }
                endpoint = `/results/constituency/${constituencyId}`;
                break;
            case 'station':
                const stationId = document.getElementById('stationSelect').value;
                if (!stationId) {
                    showToast('Please select a station', 'warning');
                    return;
                }
                endpoint = `/results/station/${stationId}`;
                break;
        }
        
        try {
            const response = await api.get(endpoint);
            displayResults(response.data, level);
        } catch (error) {
            showToast('Failed to load results', 'error');
        }
    });
}

function displayResults(data, level) {
    const display = document.getElementById('resultsDisplay');
    
    const totalVotes = data.total_votes || 0;
    const registeredVoters = data.registered_voters || 0;
    const blankBallots = data.blank_ballots || 0;
    const spoiledBallots = data.spoiled_ballots || 0;
    const turnoutPercent = registeredVoters > 0 
        ? ((totalVotes / registeredVoters) * 100).toFixed(1) 
        : 0;
    
    let title = 'Results';
    if (level === 'station') title = data.station_name;
    else if (level === 'constituency') title = data.constituency_name;
    else if (level === 'region') title = data.region_name;
    else title = 'National Results';
    
    display.innerHTML = `
        <div class="card mt-2">
            <div class="card-header">
                <h3 class="card-title">${title}</h3>
            </div>
            <div class="card-body">
                <div class="stats-grid mb-2">
                    ${level !== 'station' ? `
                    <div class="stat-card">
                        <span class="stat-value">${data.stations_reported || 0}</span>
                        <span class="stat-label">Reported</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${data.total_stations || 0}</span>
                        <span class="stat-label">Total Stations</span>
                    </div>
                    ` : ''}
                    <div class="stat-card">
                        <span class="stat-value">${totalVotes.toLocaleString()}</span>
                        <span class="stat-label">Total Votes</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${registeredVoters.toLocaleString()}</span>
                        <span class="stat-label">Registered Voters</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${turnoutPercent}%</span>
                        <span class="stat-label">Turnout</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${blankBallots.toLocaleString()}</span>
                        <span class="stat-label">Blank Ballots</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${spoiledBallots.toLocaleString()}</span>
                        <span class="stat-label">Spoiled Ballots</span>
                    </div>
                </div>
                <div id="resultsChartDisplay"></div>
            </div>
        </div>
    `;
    
    renderResultsChart(data.results || [], totalVotes, 'resultsChartDisplay');
}

function renderResultsChart(results, totalVotes, containerId = 'resultsChart') {
    const container = document.getElementById(containerId);
    
    if (!results || results.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No results available</p>';
        return;
    }
    
    // Sort by vote count
    const sortedResults = results.sort((a, b) => b.vote_count - a.vote_count);
    
    // Color schemes for bars (gradient colors)
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 1st place - Purple
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // 2nd place - Pink
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // 3rd place - Blue
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Orange
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Teal
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Light
        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)'  // Peach
    ];
    
    container.innerHTML = sortedResults.map((result, index) => {
        const percentage = totalVotes > 0 ? ((result.vote_count / totalVotes) * 100).toFixed(1) : 0;
        const color = colors[index % colors.length];
        const isTop3 = index < 3;
        
        return `
            <div style="margin-bottom: ${isTop3 ? '1.5rem' : '1rem'}; 
                        padding-bottom: ${isTop3 ? '1.5rem' : '1rem'}; 
                        border-bottom: ${index < sortedResults.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 200px;">
                        <div style="font-weight: 700; 
                                    color: #718096; 
                                    font-size: 1.25rem; 
                                    min-width: 2rem;">
                            ${index + 1}.
                        </div>
                        <div>
                            <div style="font-weight: ${isTop3 ? '700' : '600'}; 
                                        color: #1a202c; 
                                        font-size: ${isTop3 ? '1.125rem' : '1rem'};">
                                ${result.participant_name}
                            </div>
                            <div style="font-size: 0.875rem; color: #718096;">
                                ${result.category_name || 'Political Party'}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: ${isTop3 ? '1.5rem' : '1.25rem'}; 
                                    font-weight: 700; 
                                    background: ${color}; 
                                    -webkit-background-clip: text; 
                                    -webkit-text-fill-color: transparent;
                                    background-clip: text;">
                            ${percentage}%
                        </div>
                        <div style="font-size: 0.875rem; color: #718096;">
                            ${result.vote_count.toLocaleString()} votes
                        </div>
                    </div>
                </div>
                <div style="background: #e2e8f0; 
                            height: ${isTop3 ? '16px' : '12px'}; 
                            border-radius: 999px; 
                            overflow: hidden;
                            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);">
                    <div style="background: ${color}; 
                                height: 100%; 
                                width: ${percentage}%; 
                                border-radius: 999px; 
                                transition: width 1s ease-out;
                                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Submit Results View
async function showSubmitResultsView() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2 class="mb-2">Submit Results</h2>
        
        <div class="card">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Search Station / Constituency / Region</label>
                    <input type="text" 
                           class="form-control" 
                           id="stationSearchInput" 
                           placeholder="Type to search...">
                </div>
                <div class="form-group" id="stationSelectContainer">
                    <label class="form-label">Select Station</label>
                    <select class="form-control form-select" id="submitStationSelect" size="10" style="height: auto;">
                        <option value="">-- Select Station --</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-full" id="loadStationBtn">Load Station</button>
            </div>
        </div>
        
        <div id="resultsForm"></div>
    `;
    
    // Load accessible stations
    await loadAccessibleStations();
    
    // Add search functionality
    const searchInput = document.getElementById('stationSearchInput');
    const stationSelect = document.getElementById('submitStationSelect');
    const allOptions = Array.from(stationSelect.options);
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // Clear current options
        stationSelect.innerHTML = '';
        
        // Filter and display matching options
        const filtered = allOptions.filter(option => {
            return option.text.toLowerCase().includes(searchTerm) || option.value === '';
        });
        
        filtered.forEach(option => {
            stationSelect.appendChild(option.cloneNode(true));
        });
        
        // Show count
        const count = filtered.length - 1; // -1 for the placeholder option
        if (searchTerm) {
            searchInput.placeholder = `Found ${count} station(s)`;
        } else {
            searchInput.placeholder = 'Type to search...';
        }
    });
    
    // Double-click to load station
    stationSelect.addEventListener('dblclick', () => {
        if (stationSelect.value) {
            loadStationForm();
        }
    });
    
    document.getElementById('loadStationBtn').addEventListener('click', loadStationForm);
}

async function loadAccessibleStations() {
    try {
        let stations = [];
        
        if (state.user.role === 'member') {
            const response = await api.get('/results/my-stations');
            stations = response.data.stations;
        } else {
            // Admin/Manager can access all stations
            const response = await api.get('/geography/stations');
            stations = response.data.stations;
        }
        
        const select = document.getElementById('submitStationSelect');
        select.innerHTML = '<option value="">-- Select Station --</option>' + 
            stations.map(s => `
                <option value="${s.id}">${s.region_name} > ${s.constituency_name} > ${s.name}</option>
            `).join('');
    } catch (error) {
        showToast('Failed to load stations', 'error');
    }
}

async function loadStationForm() {
    const stationId = document.getElementById('submitStationSelect').value;
    
    if (!stationId) {
        showToast('Please select a station', 'warning');
        return;
    }
    
    try {
        // Load participants
        const participantsRes = await api.get('/participants');
        const participants = participantsRes.data.participants;
        
        // Load existing results
        const resultsRes = await api.get(`/results/station/${stationId}`);
        const existingResults = resultsRes.data.results || [];
        const stationData = resultsRes.data;
        
        const resultsMap = {};
        existingResults.forEach(r => {
            resultsMap[r.participant_id] = r.vote_count;
        });
        
        // Load existing attachments
        const attachmentsRes = await api.get(`/attachments/station/${stationId}?recent_only=true`);
        const attachments = attachmentsRes.data.attachments || [];
        const recentAttachment = attachments[0];
        
        const registeredVoters = stationData.registered_voters || 0;
        const blankBallots = stationData.blank_ballots || 0;
        const spoiledBallots = stationData.spoiled_ballots || 0;
        const hasIssue = stationData.has_issue || false;
        const issueComment = stationData.issue_comment || '';
        const canEdit = ['admin', 'manager', 'member'].includes(state.user.role);
        
        const formContainer = document.getElementById('resultsForm');
        formContainer.innerHTML = `
            <!-- Station Name Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 1.5rem; 
                        border-radius: 12px; 
                        margin-top: 1rem;
                        margin-bottom: 1rem;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.25rem;">Selected Station</div>
                <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0;">${stationData.station_name}</h3>
                <div style="font-size: 0.875rem; opacity: 0.9; margin-top: 0.25rem;">
                    ${stationData.constituency_name} • ${stationData.region_name}
                </div>
            </div>
            
            ${canEdit ? `
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">Station Metadata</h3>
                </div>
                <div class="card-body">
                    ${hasIssue || issueComment ? `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: ${hasIssue ? '#fff3cd' : '#e7f3ff'}; border-left: 4px solid ${hasIssue ? '#ffc107' : '#2196F3'}; border-radius: 4px;">
                        ${hasIssue ? `<div style="color: #856404; font-weight: 600; margin-bottom: 0.5rem;">⚠️ Issue Reported</div>` : ''}
                        ${issueComment ? `
                            <div>
                                <strong>Current Comment:</strong>
                                <p style="margin-top: 0.5rem; white-space: pre-wrap; color: #495057;">${issueComment}</p>
                            </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    <form id="updateMetadataForm">
                        <div class="form-group">
                            <label class="form-label">Registered Voters</label>
                            <input type="number" 
                                   class="form-control" 
                                   id="registeredVotersInput"
                                   value="${registeredVoters}" 
                                   min="0" 
                                   required>
                            <small class="text-muted">Current: ${registeredVoters.toLocaleString()}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Blank Ballots</label>
                            <input type="number" 
                                   class="form-control" 
                                   id="blankBallotsInput"
                                   value="${blankBallots}" 
                                   min="0" 
                                   required>
                            <small class="text-muted">Ballots cast with no selection</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Spoiled Ballots</label>
                            <input type="number" 
                                   class="form-control" 
                                   id="spoiledBallotsInput"
                                   value="${spoiledBallots}" 
                                   min="0" 
                                   required>
                            <small class="text-muted">Invalid or damaged ballots</small>
                        </div>
                        
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" 
                                       id="hasIssueCheckbox"
                                       ${hasIssue ? 'checked' : ''}
                                       style="width: 18px; height: 18px; cursor: pointer;">
                                <span class="form-label" style="margin: 0;">Report an Issue</span>
                            </label>
                            <small class="text-muted">Check this box if there were any irregularities or issues</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                Comments / Issue Description 
                                <span id="commentRequiredLabel" style="color: #d32f2f; display: ${hasIssue ? 'inline' : 'none'};">*</span>
                            </label>
                            <textarea class="form-control" 
                                      id="issueCommentInput"
                                      rows="4"
                                      placeholder="Add any comments or notes here. If you reported an issue, please describe it in detail.">${issueComment}</textarea>
                            <small class="text-muted" id="commentHelpText">
                                ${hasIssue ? 'Comment is required when an issue is reported' : 'Optional: Add any observations, notes, or comments about the voting process'}
                            </small>
                        </div>
                        
                        <button type="submit" class="btn btn-secondary btn-full">Update Station Metadata</button>
                    </form>
                </div>
            </div>
            ` : `
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">Station Metadata</h3>
                </div>
                <div class="card-body">
                    <p><strong>Registered Voters:</strong> ${registeredVoters.toLocaleString()}</p>
                    <p><strong>Blank Ballots:</strong> ${blankBallots.toLocaleString()}</p>
                    <p><strong>Spoiled Ballots:</strong> ${spoiledBallots.toLocaleString()}</p>
                    ${hasIssue || issueComment ? `
                        <div style="margin-top: 1.5rem; padding: 1rem; background: ${hasIssue ? '#fff3cd' : '#e7f3ff'}; border-left: 4px solid ${hasIssue ? '#ffc107' : '#2196F3'}; border-radius: 4px;">
                            ${hasIssue ? `<div style="color: #856404; font-weight: 600; margin-bottom: 0.5rem;">⚠️ Issue Reported</div>` : ''}
                            ${issueComment ? `
                                <div>
                                    <strong>Comments:</strong>
                                    <p style="margin-top: 0.5rem; white-space: pre-wrap; color: #495057;">${issueComment}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
            `}
            
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">Enter Vote Counts</h3>
                </div>
                <div class="card-body">
                    <form id="submitResultsForm">
                        ${participants.map(p => `
                            <div class="form-group">
                                <label class="form-label">
                                    ${p.name} 
                                    <span class="text-muted">(${p.category_name})</span>
                                </label>
                                <input type="number" 
                                       class="form-control" 
                                       name="participant_${p.id}" 
                                       min="0" 
                                       value="${resultsMap[p.id] || 0}"
                                       required>
                            </div>
                        `).join('')}
                        <button type="submit" class="btn btn-primary btn-full mt-2">Submit Results</button>
                    </form>
                </div>
            </div>
            
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">Procès Verbal Photo</h3>
                </div>
                <div class="card-body">
                    ${recentAttachment ? `
                        <div class="mb-2">
                            <p class="text-muted">Current Photo:</p>
                            <img src="${recentAttachment.file_path}" 
                                 alt="Procès Verbal" 
                                 style="max-width: 100%; border-radius: 8px; cursor: pointer;"
                                 onclick="window.open('${recentAttachment.file_path}', '_blank')">
                            <p class="text-muted mt-1" style="font-size: 0.875rem;">
                                Uploaded: ${new Date(recentAttachment.uploaded_at).toLocaleString()}<br>
                                By: ${recentAttachment.uploaded_by_name || 'Unknown'}
                            </p>
                        </div>
                    ` : '<p class="text-muted">No photo uploaded yet</p>'}
                    
                    <form id="uploadPhotoForm" enctype="multipart/form-data">
                        <div class="form-group">
                            <label class="form-label">Upload New Photo</label>
                            <input type="file" 
                                   class="form-control" 
                                   id="photoFile" 
                                   accept="image/*,application/pdf"
                                   capture="environment"
                                   required>
                            <small class="text-muted">Accepts: JPG, PNG, PDF (Max 10MB)</small>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-full">Upload Photo</button>
                    </form>
                </div>
            </div>
        `;
        
        // Handle results submission
        document.getElementById('submitResultsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const results = [];
            
            participants.forEach(p => {
                const voteCount = parseInt(formData.get(`participant_${p.id}`)) || 0;
                results.push({
                    participant_id: p.id,
                    vote_count: voteCount
                });
            });
            
            try {
                await api.post('/results', {
                    station_id: parseInt(stationId),
                    results
                });
                
                showToast('Results submitted successfully!', 'success');
            } catch (error) {
                showToast(error.message || 'Failed to submit results', 'error');
            }
        });
        
        // Handle station metadata update (admin, manager, member)
        if (canEdit) {
            // Handle checkbox change to toggle required state
            const hasIssueCheckbox = document.getElementById('hasIssueCheckbox');
            const issueCommentInput = document.getElementById('issueCommentInput');
            const commentRequiredLabel = document.getElementById('commentRequiredLabel');
            const commentHelpText = document.getElementById('commentHelpText');
            
            hasIssueCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                commentRequiredLabel.style.display = isChecked ? 'inline' : 'none';
                commentHelpText.textContent = isChecked 
                    ? 'Comment is required when an issue is reported'
                    : 'Optional: Add any observations, notes, or comments about the voting process';
            });
            
            document.getElementById('updateMetadataForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const registeredVotersInput = document.getElementById('registeredVotersInput');
                const blankBallotsInput = document.getElementById('blankBallotsInput');
                const spoiledBallotsInput = document.getElementById('spoiledBallotsInput');
                
                const newRegisteredVoters = parseInt(registeredVotersInput.value);
                const newBlankBallots = parseInt(blankBallotsInput.value);
                const newSpoiledBallots = parseInt(spoiledBallotsInput.value);
                const newHasIssue = hasIssueCheckbox.checked;
                const newIssueComment = issueCommentInput.value.trim();
                
                if (newRegisteredVoters < 0 || newBlankBallots < 0 || newSpoiledBallots < 0) {
                    showToast('Values cannot be negative', 'warning');
                    return;
                }
                
                // Validation: If issue is checked, comment is required
                if (newHasIssue && !newIssueComment) {
                    showToast('Please provide a comment describing the issue', 'warning');
                    issueCommentInput.focus();
                    return;
                }
                
                try {
                    showLoader();
                    await api.put(`/results/station/${stationId}/metadata`, {
                        registered_voters: newRegisteredVoters,
                        blank_ballots: newBlankBallots,
                        spoiled_ballots: newSpoiledBallots,
                        has_issue: newHasIssue,
                        issue_comment: newIssueComment || null
                    });
                    hideLoader();
                    showToast('Station metadata updated successfully!', 'success');
                    loadStationForm(); // Reload to show updated values
                } catch (error) {
                    hideLoader();
                    showToast(error.message || 'Failed to update station metadata', 'error');
                }
            });
        }
        
        // Handle photo upload
        document.getElementById('uploadPhotoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('photoFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showToast('Please select a file', 'warning');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('station_id', stationId);
            
            try {
                showLoader();
                const response = await fetch('/api/attachments/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: formData
                });
                
                hideLoader();
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Upload failed');
                }
                
                showToast('Photo uploaded successfully!', 'success');
                loadStationForm(); // Reload to show new photo
            } catch (error) {
                hideLoader();
                showToast(error.message || 'Failed to upload photo', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load form', 'error');
    }
}

// Participants View (Admin only)
async function showParticipantsView() {
    try {
        const [participantsRes, categoriesRes] = await Promise.all([
            api.get('/participants'),
            api.get('/participants/categories')
        ]);
        
        const participants = participantsRes.data.participants;
        const categories = categoriesRes.data.categories;
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2 class="mb-2">Participants Management</h2>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Add New Participant</h3>
                </div>
                <div class="card-body">
                    <form id="addParticipantForm">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select class="form-control form-select" name="category_id" required>
                                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-control" name="name" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Short Name (Optional)</label>
                            <input type="text" class="form-control" name="short_name">
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">Add Participant</button>
                    </form>
                </div>
            </div>
            
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">Existing Participants</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-mobile-cards">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Short Name</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participants.map(p => `
                                    <tr>
                                        <td data-label="Name">${p.name}</td>
                                        <td data-label="Category">${p.category_name}</td>
                                        <td data-label="Short Name">${p.short_name || '-'}</td>
                                        <td data-label="Status">
                                            <span class="badge ${p.is_active ? 'badge-success' : ''}">
                                                ${p.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('addParticipantForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                await api.post('/participants', {
                    category_id: parseInt(formData.get('category_id')),
                    name: formData.get('name'),
                    short_name: formData.get('short_name') || null
                });
                
                showToast('Participant added successfully!', 'success');
                showParticipantsView(); // Reload
            } catch (error) {
                showToast(error.message || 'Failed to add participant', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load participants', 'error');
    }
}

// Users View (Admin only)
async function showUsersView() {
    try {
        const response = await api.get('/users');
        const users = response.data.users;
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2 class="mb-2">User Management</h2>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Create New User</h3>
                </div>
                <div class="card-body">
                    <form id="createUserForm">
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-control" name="full_name" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" name="email" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <div style="position: relative;">
                                <input type="password" class="form-control" name="password" id="createUserPassword" required minlength="6" style="padding-right: 2.5rem;">
                                <button type="button" onclick="togglePasswordVisibility('createUserPassword', 'createUserPasswordToggle')" 
                                        id="createUserPasswordToggle"
                                        style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); 
                                               border: none; background: none; cursor: pointer; padding: 0.25rem; font-size: 1.2rem;">
                                    👁️
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Role</label>
                            <select class="form-control form-select" name="role" required>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="member" selected>Member</option>
                                <option value="reader">Reader</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">Create User</button>
                    </form>
                </div>
            </div>
            
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">All Users</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-mobile-cards">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => {
                                    const isCurrentUser = u.id === state.user.id;
                                    const username = u.email.split('@')[0]; // Extract username before @
                                    return `
                                    <tr>
                                        <td data-label="Name">${u.full_name}</td>
                                        <td data-label="Username">${username}</td>
                                        <td data-label="Role">
                                            <span class="badge badge-${u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'primary' : 'success'}">${u.role}</span>
                                        </td>
                                        <td data-label="Status">
                                            <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                                                ${u.is_active ? '✓ Active' : '✗ Inactive'}
                                            </span>
                                        </td>
                                        <td data-label="Actions">
                                            ${isCurrentUser ? '-' : `
                                                <button class="btn btn-${u.is_active ? 'danger' : 'success'} btn-sm" 
                                                        onclick="toggleUserStatus(${u.id}, ${u.is_active}, '${u.full_name}')"
                                                        style="margin-right: 0.5rem; margin-bottom: 0.5rem;">
                                                    ${u.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                                                </button>
                                                ${state.user.role === 'admin' ? `
                                                    <button class="btn btn-warning btn-sm" 
                                                            onclick="showResetPasswordModal(${u.id}, '${u.full_name}')"
                                                            style="margin-right: 0.5rem; margin-bottom: 0.5rem;">
                                                        RESET PASSWORD
                                                    </button>
                                                ` : ''}
                                                ${u.role === 'member' ? `
                                                    <button class="btn btn-outline btn-sm" 
                                                            onclick="showAssignMemberModal(${u.id}, '${u.full_name}')"
                                                            style="margin-bottom: 0.5rem;">
                                                        ASSIGN AREA
                                                    </button>
                                                ` : ''}
                                            `}
                                        </td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Handle create user form
        document.getElementById('createUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                await api.post('/auth/register', {
                    email: formData.get('email'),
                    password: formData.get('password'),
                    full_name: formData.get('full_name'),
                    role: formData.get('role')
                });
                
                showToast('User created successfully!', 'success');
                showUsersView(); // Reload
            } catch (error) {
                showToast(error.message || 'Failed to create user', 'error');
            }
        });
        
    } catch (error) {
        showToast('Failed to load users', 'error');
    }
}

// Toggle password visibility
function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈'; // Hide icon
    } else {
        input.type = 'password';
        button.textContent = '👁️'; // Show icon
    }
}

// Show reset password modal
function showResetPasswordModal(userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title">Reset Password: ${userName}</h3>
                <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">×</button>
            </div>
            <div class="modal-body">
                <form id="resetPasswordForm">
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <div style="position: relative;">
                            <input type="password" class="form-control" id="resetNewPassword" name="newPassword" 
                                   required minlength="6" placeholder="Enter new password"
                                   style="padding-right: 2.5rem;">
                            <button type="button" onclick="togglePasswordVisibility('resetNewPassword', 'resetPasswordToggle')" 
                                    id="resetPasswordToggle"
                                    style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); 
                                           border: none; background: none; cursor: pointer; padding: 0.25rem; font-size: 1.2rem;">
                                👁️
                            </button>
                        </div>
                        <small class="form-text text-muted">Minimum 6 characters</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <div style="position: relative;">
                            <input type="password" class="form-control" id="resetConfirmPassword" name="confirmPassword" 
                                   required minlength="6" placeholder="Confirm new password"
                                   style="padding-right: 2.5rem;">
                            <button type="button" onclick="togglePasswordVisibility('resetConfirmPassword', 'resetConfirmPasswordToggle')" 
                                    id="resetConfirmPasswordToggle"
                                    style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); 
                                           border: none; background: none; cursor: pointer; padding: 0.25rem; font-size: 1.2rem;">
                                👁️
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Reset Password</button>
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal-backdrop').remove()" style="flex: 1;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('resetNewPassword').value;
        const confirmPassword = document.getElementById('resetConfirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }
        
        try {
            await api.put(`/users/${userId}/reset-password`, { newPassword });
            showToast('Password reset successfully!', 'success');
            modal.remove();
            showUsersView(); // Reload users
        } catch (error) {
            showToast(error.message || 'Failed to reset password', 'error');
        }
    });
    
    // Focus on first input
    setTimeout(() => document.getElementById('resetNewPassword').focus(), 100);
}

// Toggle user active/inactive status
async function toggleUserStatus(userId, currentStatus, userName) {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = currentStatus 
        ? `Are you sure you want to DEACTIVATE "${userName}"?\n\nThis user will be immediately logged out and unable to access the system.`
        : `Are you sure you want to ACTIVATE "${userName}"?\n\nThis user will be able to log in and access the system.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        await api.put(`/users/${userId}/status`, {
            is_active: !currentStatus
        });
        
        showToast(`User ${action}d successfully!`, 'success');
        showUsersView(); // Reload the users list
    } catch (error) {
        showToast(error.message || `Failed to ${action} user`, 'error');
    }
}

// Show assignment modal
async function showAssignMemberModal(userId, userName) {
    // Load geography data first
    await loadGeographyData();
    
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2 class="mb-2">Assign Member: ${userName}</h2>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Assign Geographic Area</h3>
            </div>
            <div class="card-body">
                <form id="assignMemberForm">
                    <div class="form-group">
                        <label class="form-label">Access Level</label>
                        <select class="form-control form-select" id="accessLevel" required>
                            <option value="">-- Select Level --</option>
                            <option value="1">Level 1 - Specific Station</option>
                            <option value="2">Level 2 - All Stations in Constituency</option>
                            <option value="3">Level 3 - All Stations in Region</option>
                        </select>
                    </div>
                    
                    <div class="form-group hidden" id="regionGroup">
                        <label class="form-label">Select Region</label>
                        <select class="form-control form-select" id="regionSelect">
                            <option value="">-- Select Region --</option>
                            ${state.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group hidden" id="constituencyGroup">
                        <label class="form-label">Select Constituency</label>
                        <select class="form-control form-select" id="constituencySelect">
                            <option value="">-- Select Constituency --</option>
                        </select>
                    </div>
                    
                    <div class="form-group hidden" id="stationGroup">
                        <label class="form-label">Search Station</label>
                        <input type="text" class="form-control" id="stationSearch" placeholder="Type to search...">
                        <label class="form-label mt-1">Select Station</label>
                        <select class="form-control form-select" id="stationSelect" size="8" style="height: auto;">
                            <option value="">-- Select Station --</option>
                        </select>
                    </div>
                    
                    <div class="mt-2">
                        <button type="submit" class="btn btn-primary btn-full">Assign Member</button>
                        <button type="button" class="btn btn-outline btn-full mt-1" onclick="showUsersView()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="card mt-2" id="currentAssignmentsCard" style="display: none;">
            <div class="card-header">
                <h3 class="card-title">Current Assignments</h3>
            </div>
            <div class="card-body" id="currentAssignmentsList">
            </div>
        </div>
    `;
    
    // Load current assignments
    try {
        const userRes = await api.get(`/users/${userId}`);
        const assignments = userRes.data.user.assignments || [];
        
        if (assignments.length > 0) {
            document.getElementById('currentAssignmentsCard').style.display = 'block';
            document.getElementById('currentAssignmentsList').innerHTML = assignments.map(a => {
                let location = '';
                if (a.level === 1) location = `Station: ${a.station_name}`;
                else if (a.level === 2) location = `Constituency: ${a.constituency_name}`;
                else if (a.level === 3) location = `Region: ${a.region_name}`;
                
                return `
                    <div style="padding: 12px; background: var(--bg-color); border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>Level ${a.level}</strong><br>
                            <span class="text-muted">${location}</span>
                        </div>
                        <button class="btn btn-danger" onclick="removeAssignment(${a.id}, ${userId})">Remove</button>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load assignments:', error);
    }
    
    // Setup form interactions
    const levelSelect = document.getElementById('accessLevel');
    const regionSelect = document.getElementById('regionSelect');
    const constituencySelect = document.getElementById('constituencySelect');
    const stationSelect = document.getElementById('stationSelect');
    const stationSearch = document.getElementById('stationSearch');
    
    levelSelect.addEventListener('change', (e) => {
        const level = parseInt(e.target.value);
        
        document.getElementById('regionGroup').classList.toggle('hidden', level !== 3);
        document.getElementById('constituencyGroup').classList.toggle('hidden', level !== 2 && level !== 1);
        document.getElementById('stationGroup').classList.toggle('hidden', level !== 1);
        
        if (level === 2 || level === 1) {
            populateConstituencySelectForAssignment();
        }
    });
    
    regionSelect.addEventListener('change', () => {
        // For level 3, region is enough
    });
    
    constituencySelect.addEventListener('change', (e) => {
        const level = parseInt(levelSelect.value);
        if (level === 1 && e.target.value) {
            populateStationSelectForAssignment(e.target.value);
        }
    });
    
    // Station search
    let allStationOptions = [];
    stationSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        stationSelect.innerHTML = '<option value="">-- Select Station --</option>';
        
        const filtered = allStationOptions.filter(option => 
            option.text.toLowerCase().includes(searchTerm)
        );
        
        filtered.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            stationSelect.appendChild(opt);
        });
    });
    
    function populateConstituencySelectForAssignment() {
        constituencySelect.innerHTML = '<option value="">-- Select Constituency --</option>' + 
            state.constituencies.map(c => `<option value="${c.id}">${c.region_name} > ${c.name}</option>`).join('');
    }
    
    function populateStationSelectForAssignment(constituencyId) {
        const stations = state.stations.filter(s => s.constituency_id == constituencyId);
        allStationOptions = stations.map(s => ({
            value: s.id,
            text: `${s.region_name} > ${s.constituency_name} > ${s.name}`
        }));
        
        stationSelect.innerHTML = '<option value="">-- Select Station --</option>' + 
            allStationOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
    }
    
    // Handle form submission
    document.getElementById('assignMemberForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const level = parseInt(levelSelect.value);
        const data = { level };
        
        if (level === 3) {
            data.region_id = regionSelect.value;
            if (!data.region_id) {
                showToast('Please select a region', 'warning');
                return;
            }
        } else if (level === 2) {
            data.constituency_id = constituencySelect.value;
            if (!data.constituency_id) {
                showToast('Please select a constituency', 'warning');
                return;
            }
        } else if (level === 1) {
            data.station_id = stationSelect.value;
            if (!data.station_id) {
                showToast('Please select a station', 'warning');
                return;
            }
        }
        
        try {
            await api.post(`/users/${userId}/assignments`, data);
            showToast('Member assigned successfully!', 'success');
            showUsersView();
        } catch (error) {
            showToast(error.message || 'Failed to assign member', 'error');
        }
    });
}

// Remove assignment
async function removeAssignment(assignmentId, userId) {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
        await api.delete(`/users/${userId}/assignments/${assignmentId}`);
        showToast('Assignment removed successfully!', 'success');
        showAssignMemberModal(userId, 'Member');
    } catch (error) {
        showToast(error.message || 'Failed to remove assignment', 'error');
    }
}

// Make functions globally accessible
window.showAssignMemberModal = showAssignMemberModal;
window.removeAssignment = removeAssignment;

// Geography View (Admin)
async function showGeographyView() {
    await loadGeographyData();
    
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2 class="mb-2">Geographic Data</h2>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Regions</h3>
            </div>
            <div class="card-body">
                <p class="text-muted">${state.regions.length} regions loaded</p>
            </div>
        </div>
        
        <div class="card mt-2">
            <div class="card-header">
                <h3 class="card-title">Constituencies</h3>
            </div>
            <div class="card-body">
                <p class="text-muted">${state.constituencies.length} constituencies loaded</p>
            </div>
        </div>
        
        <div class="card mt-2">
            <div class="card-header">
                <h3 class="card-title">Stations</h3>
            </div>
            <div class="card-body">
                <p class="text-muted">${state.stations.length} stations loaded</p>
            </div>
        </div>
    `;
}

// My Stations View (Member)
async function showMyStationsView() {
    try {
        const response = await api.get('/results/my-stations');
        const stations = response.data.stations;
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2 class="mb-2">My Assigned Stations</h2>
            
            <div class="card">
                <div class="card-body">
                    ${stations.length === 0 ? `
                        <p class="text-muted text-center">No stations assigned</p>
                    ` : `
                        <div class="table-responsive">
                            <table class="table table-mobile-cards">
                                <thead>
                                    <tr>
                                        <th>Station</th>
                                        <th>Constituency</th>
                                        <th>Region</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stations.map(s => `
                                        <tr>
                                            <td data-label="Station">${s.name}</td>
                                            <td data-label="Constituency">${s.constituency_name}</td>
                                            <td data-label="Region">${s.region_name}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    } catch (error) {
        showToast('Failed to load stations', 'error');
    }
}

// ============================================
// Data Loading
// ============================================
async function loadGeographyData() {
    if (state.regions.length === 0) {
        const response = await api.get('/geography/regions');
        state.regions = response.data.regions;
    }
    
    if (state.constituencies.length === 0) {
        const response = await api.get('/geography/constituencies');
        state.constituencies = response.data.constituencies;
    }
    
    if (state.stations.length === 0) {
        const response = await api.get('/geography/stations');
        state.stations = response.data.stations;
    }
}

function populateRegionSelect() {
    const select = document.getElementById('regionSelect');
    select.innerHTML = '<option value="">-- Select Region --</option>' + 
        state.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
}

function populateConstituencySelect(regionId) {
    const constituencies = state.constituencies.filter(c => c.region_id == regionId);
    const select = document.getElementById('constituencySelect');
    select.innerHTML = '<option value="">-- Select Constituency --</option>' + 
        constituencies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function populateStationSelect(constituencyId) {
    const stations = state.stations.filter(s => s.constituency_id == constituencyId);
    const select = document.getElementById('stationSelect');
    select.innerHTML = '<option value="">-- Select Station --</option>' + 
        stations.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

// ============================================
// Audit Logs View (Admin only)
// ============================================
async function showAuditLogsView() {
    try {
        const content = document.getElementById('content');
        content.innerHTML = '<div class="text-center"><p>Loading audit logs...</p></div>';
        
        const response = await api.get('/audit/logs?limit=50');
        const logs = response.data.logs;
        
        content.innerHTML = `
            <h2 class="mb-2">Audit Logs</h2>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity (Last 50 records)</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-mobile-cards">
                            <thead>
                                <tr>
                                    <th>Date/Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.length === 0 ? '<tr><td colspan="5" class="text-center text-muted">No audit logs available</td></tr>' : ''}
                                ${logs.map(log => `
                                    <tr>
                                        <td data-label="Date/Time">${new Date(log.created_at).toLocaleString('en-GB', { 
                                            year: 'numeric', 
                                            month: '2-digit', 
                                            day: '2-digit', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}</td>
                                        <td data-label="User">
                                            <div><strong>${log.user_name || 'Unknown'}</strong></div>
                                            <div class="text-muted" style="font-size: 0.875rem;">${log.user_email || 'N/A'}</div>
                                        </td>
                                        <td data-label="Action">
                                            <span class="badge ${log.action === 'INSERT' ? 'badge-success' : log.action === 'UPDATE' ? 'badge-warning' : 'badge-danger'}">
                                                ${log.action}
                                            </span>
                                        </td>
                                        <td data-label="Entity">${log.entity_type || 'N/A'}</td>
                                        <td data-label="IP">${log.ip_address || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        showToast('Failed to load audit logs', 'error');
    }
}

// ============================================
// Active Sessions View (Admin/Manager only)
// ============================================
async function showActiveSessionsView() {
    try {
        const content = document.getElementById('content');
        content.innerHTML = '<div class="text-center"><p>Loading sessions...</p></div>';
        
        // Fetch active sessions and stats
        const [sessionsResponse, statsResponse] = await Promise.all([
            api.get('/sessions'),
            api.get('/sessions/stats')
        ]);
        
        const sessions = sessionsResponse.data.sessions;
        const stats = statsResponse.data;
        
        // Helper function to format time ago
        const formatTimeAgo = (seconds) => {
            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
            return `${Math.floor(seconds / 86400)} days ago`;
        };
        
        // Helper function to format duration
        const formatDuration = (loginTime) => {
            const login = new Date(loginTime);
            const now = new Date();
            const diff = Math.floor((now - login) / 1000);
            return formatTimeAgo(diff);
        };
        
        // Get username from email
        const getUsername = (email) => email.split('@')[0];
        
        content.innerHTML = `
            <h2 class="mb-2">👥 Active Sessions</h2>
            
            <!-- Statistics Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div class="card" style="padding: 1.5rem; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${stats.active_users || 0}
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Active Users</div>
                </div>
                <div class="card" style="padding: 1.5rem; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                    <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${stats.active_sessions || 0}
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Active Sessions</div>
                </div>
                <div class="card" style="padding: 1.5rem; text-align: center; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
                    <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${stats.total_unique_users || 0}
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Total Users (All Time)</div>
                </div>
            </div>
            
            <!-- Active Sessions Table -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Currently Active Users</h3>
                </div>
                <div class="card-body">
                    ${sessions.length === 0 ? `
                        <p class="text-muted text-center" style="padding: 2rem;">No active sessions</p>
                    ` : `
                        <div class="table-responsive">
                            <table class="table table-mobile-cards">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Login Time</th>
                                        <th>Last Activity</th>
                                        <th>IP Address</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sessions.map(session => {
                                        const idleSeconds = parseFloat(session.idle_seconds) || 0;
                                        const idleMinutes = Math.floor(idleSeconds / 60);
                                        const isIdle = idleMinutes > 5;
                                        const username = getUsername(session.email);
                                        
                                        return `
                                        <tr>
                                            <td data-label="User">${username}</td>
                                            <td data-label="Name">${session.full_name}</td>
                                            <td data-label="Role">
                                                <span class="badge badge-${session.role === 'manager' ? 'primary' : session.role === 'member' ? 'success' : 'secondary'}">
                                                    ${session.role}
                                                </span>
                                            </td>
                                            <td data-label="Login Time">
                                                ${new Date(session.login_time).toLocaleString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                                <br>
                                                <small class="text-muted">(${formatDuration(session.login_time)})</small>
                                            </td>
                                            <td data-label="Last Activity">
                                                ${formatTimeAgo(idleSeconds)}
                                            </td>
                                            <td data-label="IP Address">${session.ip_address || 'N/A'}</td>
                                            <td data-label="Status">
                                                <span class="badge ${isIdle ? 'badge-warning' : 'badge-success'}">
                                                    ${isIdle ? '⏸️ Idle' : '✅ Active'}
                                                </span>
                                            </td>
                                            <td data-label="Actions">
                                                <button class="btn btn-sm btn-outline" onclick="terminateSession(${session.user_id}, '${username}')" 
                                                        title="Terminate session">
                                                    ❌ Terminate
                                                </button>
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Active Sessions Error:', error);
        showToast('Failed to load active sessions', 'error');
    }
}

// Terminate user session
async function terminateSession(userId, username) {
    if (!confirm(`Are you sure you want to terminate all sessions for user "${username}"?`)) {
        return;
    }
    
    try {
        await api.post(`/sessions/${userId}/terminate`);
        showToast(`Sessions terminated for ${username}`, 'success');
        // Reload the view
        showActiveSessionsView();
    } catch (error) {
        showToast('Failed to terminate session', 'error');
    }
}

// ============================================
// System Settings View (Admin only)
// ============================================
async function showSystemSettingsView() {
    try {
        const content = document.getElementById('content');
        content.innerHTML = '<div class="text-center"><p>Loading settings...</p></div>';
        
        // Fetch both settings
        const lockResponse = await api.get('/audit/system-lock');
        const isLocked = lockResponse.data.locked;
        
        const auditResponse = await api.get('/audit/audit-enabled');
        const auditEnabled = auditResponse.data.enabled;
        
        content.innerHTML = `
            <h2 class="mb-2">System Settings</h2>
            
            <!-- Audit Logging Card -->
            <div class="card mb-2">
                <div class="card-header">
                    <h3 class="card-title">📋 Audit Logging</h3>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                        <p><strong>Current Status:</strong> 
                            <span class="badge ${auditEnabled ? 'badge-success' : 'badge-danger'}" id="auditStatus">
                                ${auditEnabled ? '✅ ENABLED' : '❌ DISABLED'}
                            </span>
                        </p>
                        <p class="text-muted" style="font-size: 0.875rem;">
                            ${auditEnabled 
                                ? 'All user actions are being logged to the audit trail.' 
                                : 'User actions are NOT being logged. Enable to track all system activity.'}
                        </p>
                    </div>
                    
                    <div class="mt-2">
                        <button type="button" class="btn ${auditEnabled ? 'btn-danger' : 'btn-success'}" id="toggleAuditBtn">
                            ${auditEnabled ? '❌ Disable Audit Logging' : '✅ Enable Audit Logging'}
                        </button>
                    </div>
                    
                    <div class="mt-3" style="padding: 1rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; font-size: 0.875rem;"><strong>⚠️ Important:</strong></p>
                        <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; font-size: 0.875rem;">
                            <li>When <strong>enabled</strong>, all user actions (INSERT, UPDATE, DELETE) are recorded</li>
                            <li>When <strong>disabled</strong>, no actions are logged (not recommended during elections)</li>
                            <li>The act of enabling/disabling audit is always logged for security</li>
                            <li>Use "Audit Logs" menu to view recorded actions</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- System Lock Card -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🔒 System Lock</h3>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                        <p><strong>Current Status:</strong> 
                            <span class="badge ${isLocked ? 'badge-danger' : 'badge-success'}" id="lockStatus">
                                ${isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                            </span>
                        </p>
                        <p class="text-muted" style="font-size: 0.875rem;">
                            ${isLocked 
                                ? 'System is locked. Only Admins and Managers can submit/update results.' 
                                : 'System is unlocked. All users can submit results based on their roles.'}
                        </p>
                    </div>
                    
                    <div class="mt-2">
                        <button type="button" class="btn ${isLocked ? 'btn-success' : 'btn-danger'}" id="toggleLockBtn">
                            ${isLocked ? '🔓 Unlock System' : '🔒 Lock System'}
                        </button>
                    </div>
                    
                    <div class="mt-3" style="padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                        <p style="margin: 0; font-size: 0.875rem;"><strong>What does locking do?</strong></p>
                        <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; font-size: 0.875rem;">
                            <li>Blocks <strong>Members</strong> and <strong>Readers</strong> from submitting or updating results</li>
                            <li><strong>Admins</strong> and <strong>Managers</strong> can still make changes</li>
                            <li>Use this at the end of election day to prevent unauthorized changes</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        // Handle audit toggle button
        document.getElementById('toggleAuditBtn').addEventListener('click', async () => {
            try {
                const newStatus = !auditEnabled;
                await api.post('/audit/audit-enabled', { enabled: newStatus });
                showToast(`Audit logging ${newStatus ? 'enabled' : 'disabled'} successfully!`, 'success');
                showSystemSettingsView(); // Reload
            } catch (error) {
                showToast(error.message || 'Failed to update audit logging', 'error');
            }
        });
        
        // Handle system lock toggle button
        document.getElementById('toggleLockBtn').addEventListener('click', async () => {
            try {
                const newStatus = !isLocked;
                await api.post('/audit/system-lock', { locked: newStatus });
                showToast(`System ${newStatus ? 'locked' : 'unlocked'} successfully!`, 'success');
                showSystemSettingsView(); // Reload
            } catch (error) {
                showToast(error.message || 'Failed to update system lock', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load system settings', 'error');
    }
}

// ============================================
// Projection Views
// ============================================

// Projection Results View (All users)
async function showProjectionResultsView() {
    try {
        const content = document.getElementById('content');
        content.innerHTML = '<div class="text-center"><p>Loading projection...</p></div>';
        
        const response = await api.get('/projections/results');
        const data = response.data;
        
        const { projection, summary, regions } = data;
        
        // Calculate reliability indicator
        const coverage = summary.reported_sample_stations / summary.sample_stations;
        let reliabilityClass = 'badge-danger';
        let reliabilityText = 'LOW';
        let reliabilityIcon = '❌';
        
        if (coverage >= 0.9) {
            reliabilityClass = 'badge-success';
            reliabilityText = 'HIGH';
            reliabilityIcon = '✅';
        } else if (coverage >= 0.7) {
            reliabilityClass = 'badge-warning';
            reliabilityText = 'MODERATE';
            reliabilityIcon = '⚠️';
        }
        
        // Check if leader has confident margin
        let winnerText = '';
        if (projection.length >= 2) {
            const leader = projection[0];
            const second = projection[1];
            const gap = parseFloat(leader.percentage) - parseFloat(second.percentage);
            const combinedMoE = parseFloat(leader.margin_of_error) + parseFloat(second.margin_of_error);
            
            if (gap > 2 * combinedMoE && coverage >= 0.9) {
                winnerText = `<div class="mt-2" style="padding: 1rem; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                    <strong style="color: #155724;">🏆 Projected Winner: ${leader.participant_name}</strong><br>
                    <span style="font-size: 0.875rem; color: #155724;">High confidence (gap: ${gap.toFixed(1)}% > 2× MoE: ${(2 * combinedMoE).toFixed(1)}%)</span>
                </div>`;
            } else if (gap <= combinedMoE) {
                winnerText = `<div class="mt-2" style="padding: 1rem; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <strong style="color: #856404;">⚠️ Too Close to Call</strong><br>
                    <span style="font-size: 0.875rem; color: #856404;">Gap (${gap.toFixed(1)}%) within margin of error (${combinedMoE.toFixed(1)}%)</span>
                </div>`;
            }
        }
        
        content.innerHTML = `
            <h2 class="mb-2">📊 Election Projection</h2>
            
            <div class="card mb-2">
                <div class="card-header">
                    <h3 class="card-title">Projection Summary</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <strong>Sample Coverage:</strong><br>
                            <span style="font-size: 1.2rem;">${summary.reported_sample_stations}/${summary.sample_stations} stations (${summary.sample_percentage}%)</span>
                        </div>
                        <div>
                            <strong>Confidence Level:</strong><br>
                            <span style="font-size: 1.2rem;">${summary.confidence_level}%</span>
                        </div>
                        <div>
                            <strong>Reliability:</strong><br>
                            <span class="badge ${reliabilityClass}">${reliabilityIcon} ${reliabilityText}</span>
                        </div>
                        <div>
                            <strong>Projected Turnout:</strong><br>
                            <span style="font-size: 1.2rem;">${summary.projected_turnout}%</span>
                        </div>
                    </div>
                    
                    <div style="padding: 0.75rem; background: #f8f9fa; border-radius: 4px; font-size: 0.875rem;">
                        <strong>Note:</strong> This is a <strong>projection</strong> based on a representative sample of stations. 
                        Final results may vary slightly. ${coverage < 0.9 ? 'Wait for more stations to report for higher confidence.' : ''}
                    </div>
                </div>
            </div>
            
            <div class="card mb-2">
                <div class="card-header">
                    <h3 class="card-title">Projected National Results</h3>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span><strong>Total Projected Votes:</strong></span>
                            <span style="font-size: 1.1rem;">${summary.total_projected_votes.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span><strong>Registered Voters:</strong></span>
                            <span style="font-size: 1.1rem;">${summary.total_registered_voters.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span><strong>Blank Ballots:</strong></span>
                            <span>${summary.projected_blank_ballots.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>Spoiled Ballots:</strong></span>
                            <span>${summary.projected_spoiled_ballots.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    ${projection.map((result, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        return `
                            <div style="margin-bottom: 1.5rem; padding: 1rem; background: ${index === 0 ? '#f0f8ff' : '#fff'}; border: ${index === 0 ? '2px solid #4CAF50' : '1px solid #ddd'}; border-radius: 4px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <div>
                                        <span style="font-size: 1.5rem; margin-right: 0.5rem;">${medal}</span>
                                        <strong style="font-size: 1.1rem;">${result.participant_name}</strong>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.5rem; font-weight: bold; color: ${index === 0 ? '#4CAF50' : '#333'};">
                                            ${result.percentage}%
                                        </div>
                                        <div style="font-size: 0.75rem; color: #666;">
                                            ±${result.margin_of_error}%
                                        </div>
                                    </div>
                                </div>
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="background: #e0e0e0; border-radius: 4px; height: 30px; overflow: hidden;">
                                        <div style="background: ${index === 0 ? '#4CAF50' : index === 1 ? '#2196F3' : '#FF9800'}; width: ${result.percentage}%; height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 0.5rem; color: white; font-weight: bold; font-size: 0.875rem;">
                                            ${parseFloat(result.percentage) > 5 ? result.percentage + '%' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: #666;">
                                    <span>Projected Votes: ${parseInt(result.projected_votes).toLocaleString()}</span>
                                    <span>95% CI: [${result.confidence_interval_lower}%, ${result.confidence_interval_upper}%]</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    
                    ${winnerText}
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Regional Breakdown</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Region</th>
                                    <th>Sample</th>
                                    <th>Reported</th>
                                    <th>Coverage</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${regions.map(region => {
                                    const coverage = region.sample_stations > 0 ? 
                                        ((region.sample_stations_reported / region.sample_stations) * 100).toFixed(0) : 0;
                                    const statusIcon = coverage >= 100 ? '✓' : coverage >= 90 ? '⚠️' : '❌';
                                    const statusText = coverage >= 100 ? 'Complete' : coverage >= 90 ? `${coverage}%` : `${coverage}%`;
                                    return `
                                        <tr>
                                            <td data-label="Region"><strong>${region.region_name}</strong></td>
                                            <td data-label="Sample">${region.sample_stations}</td>
                                            <td data-label="Reported">${region.sample_stations_reported}</td>
                                            <td data-label="Coverage">${coverage}%</td>
                                            <td data-label="Status">${statusIcon} ${statusText}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Projection error:', error);
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2 class="mb-2">📊 Election Projection</h2>
            <div class="card">
                <div class="card-body text-center">
                    <p class="text-muted">Projection is not available yet.</p>
                    <p class="text-muted">Sample stations must report results first, or projection has not been activated.</p>
                    ${state.user.role === 'admin' ? '<p><button class="btn btn-primary mt-2" onclick="navigateTo(\'projection-setup\')">Setup Projection</button></p>' : ''}
                </div>
            </div>
        `;
    }
}

// Projection Setup View (Admin only)
async function showProjectionSetupView() {
    try {
        const content = document.getElementById('content');
        content.innerHTML = '<div class="text-center"><p>Loading...</p></div>';
        
        // Fetch current settings and stations
        const [settingsResponse, stationsResponse] = await Promise.all([
            api.get('/projections/settings'),
            api.get('/projections/stations')
        ]);
        
        const settings = settingsResponse.data;
        const regions = stationsResponse.data.regions;
        
        // Calculate totals
        const totalStations = regions.reduce((sum, r) => sum + parseInt(r.total_stations), 0);
        const totalSelected = regions.reduce((sum, r) => sum + parseInt(r.projection_stations), 0);
        
        content.innerHTML = `
            <h2 class="mb-2">🎯 Projection Setup</h2>
            
            <div class="card mb-2">
                <div class="card-header">
                    <h3 class="card-title">Quick Setup</h3>
                </div>
                <div class="card-body">
                    <p>Use stratified random sampling to automatically select representative sample stations.</p>
                    
                    <div class="form-group">
                        <label class="form-label">Target Sample Size</label>
                        <input type="number" class="form-control" id="sampleSizeInput" value="${settings.target_sample_size || 74}" min="30" max="200">
                        <small class="text-muted">Recommended: 74 stations (10% of 730) for ±3-4% accuracy</small>
                    </div>
                    
                    <div class="mt-2">
                        <button class="btn btn-primary" id="autoSelectBtn">
                            🎲 Auto-Select Sample Stations (Stratified)
                        </button>
                        <button class="btn btn-outline ml-1" id="clearSelectionBtn">
                            Clear All
                        </button>
                    </div>
                    
                    <div class="mt-2" style="padding: 0.75rem; background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 4px;">
                        <strong>Current Selection:</strong> ${totalSelected} of ${totalStations} stations selected (${((totalSelected/totalStations)*100).toFixed(1)}%)
                    </div>
                </div>
            </div>
            
            <div class="card mb-2">
                <div class="card-header">
                    <h3 class="card-title">Manual Selection by Region</h3>
                </div>
                <div class="card-body">
                    <p class="text-muted">You can also manually select or deselect stations if needed.</p>
                    
                    <div id="regionsAccordion">
                        ${regions.map((region, index) => {
                            const percentage = region.total_stations > 0 ? 
                                ((region.projection_stations / region.total_stations) * 100).toFixed(1) : 0;
                            
                            return `
                                <div class="card mt-1" style="border: 1px solid #ddd;">
                                    <div class="card-header" style="cursor: pointer; background: #f8f9fa;" onclick="toggleRegionStations(${index})">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <strong>${region.region_name}</strong>
                                            <span class="badge ${region.projection_stations > 0 ? 'badge-success' : 'badge-secondary'}">
                                                ${region.projection_stations}/${region.total_stations} (${percentage}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div id="region-${index}-stations" class="card-body hidden" style="max-height: 400px; overflow-y: auto;">
                                        <div class="table-responsive">
                                            <table class="table">
                                                <thead>
                                                    <tr>
                                                        <th>Sample Station</th>
                                                        <th>Station Name</th>
                                                        <th>Constituency</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${region.stations.map(station => `
                                                        <tr>
                                                            <td>
                                                                <input type="checkbox" 
                                                                       ${station.is_projection_station ? 'checked' : ''} 
                                                                       onchange="toggleStation(${station.id}, this.checked)"
                                                                       style="width: 20px; height: 20px; cursor: pointer;">
                                                            </td>
                                                            <td>${station.name}</td>
                                                            <td>${station.constituency_name}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Auto-select button handler
        document.getElementById('autoSelectBtn').addEventListener('click', async () => {
            if (!confirm('This will replace current selection with a new stratified random sample. Continue?')) {
                return;
            }
            
            const sampleSize = parseInt(document.getElementById('sampleSizeInput').value);
            
            try {
                showLoader();
                await api.post('/projections/auto-select', { target_sample_size: sampleSize });
                showToast('Sample stations selected successfully!', 'success');
                showProjectionSetupView(); // Reload
            } catch (error) {
                showToast(error.message || 'Failed to select stations', 'error');
            }
        });
        
        // Clear selection button handler
        document.getElementById('clearSelectionBtn').addEventListener('click', async () => {
            if (!confirm('Clear all selected sample stations?')) {
                return;
            }
            
            try {
                showLoader();
                // TODO: Add clear all endpoint or loop through and unset all
                showToast('Selection cleared', 'success');
                showProjectionSetupView(); // Reload
            } catch (error) {
                showToast(error.message || 'Failed to clear selection', 'error');
            }
        });
        
    } catch (error) {
        console.error('Projection Setup Error:', error);
        showToast('Failed to load projection setup', 'error');
    }
}

// Toggle region stations accordion
function toggleRegionStations(index) {
    const element = document.getElementById(`region-${index}-stations`);
    element.classList.toggle('hidden');
}

// Toggle individual station
async function toggleStation(stationId, isSelected) {
    try {
        await api.put(`/projections/stations/${stationId}/toggle`, {
            is_projection_station: isSelected
        });
        showToast(isSelected ? 'Station added to sample' : 'Station removed from sample', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to update station', 'error');
        // Reload to reset checkbox
        showProjectionSetupView();
    }
}

// ============================================
// SVG Icons
// ============================================
function iconDashboard() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
    </svg>`;
}

function iconChart() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>`;
}

function iconUsers() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>`;
}

function iconUser() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>`;
}

function iconMap() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
        <line x1="8" y1="2" x2="8" y2="18"></line>
        <line x1="16" y1="6" x2="16" y2="22"></line>
    </svg>`;
}

function iconList() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>`;
}

function iconSettings() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m0-6h6m-6 0H6m3.636-9.364l4.243 4.243m0 6.243l4.243 4.243M6.878 6.879l4.243 4.243m0 0l-4.243 4.243"></path>
    </svg>`;
}

function iconTrendUp() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>`;
}

function iconTarget() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
    </svg>`;
}

function iconEdit() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>`;
}

// ============================================
// App Initialization
// ============================================
async function initializeApp() {
    try {
        // Verify user is still active by fetching current user info
        const response = await api.get('/auth/me');
        
        // Update user info with latest from server
        state.user = response.data.user;
        localStorage.setItem('user', JSON.stringify(state.user));
        
        // Check if user is active
        if (!state.user.is_active) {
            showAccountDeactivatedPage();
            return;
        }
        
        // User is active, proceed normally
        document.getElementById('header').style.display = 'block';
        initializeNavigation();
        navigateTo('dashboard');
    } catch (error) {
        // If verification fails, logout
        console.error('Failed to verify user status:', error);
        if (error.message && error.message.toLowerCase().includes('deactivated')) {
            // Already handled by API error handler
            return;
        }
        logout();
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        initializeApp();
    } else {
        showLoginView();
    }
});

