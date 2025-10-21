// Load YAML configuration
async function loadConfig() {
    try {
        console.log("Starting to load configuration file...");
        const response = await fetch('config.yml');
        if (!response.ok) {
            throw new Error('config.yml fetch failed: ' + response.status);
        }
        const yamlText = await response.text();
        console.log("Configuration file loaded successfully, parsing now...");
        return jsyaml.load(yamlText);
    } catch (error) {
        console.error('Failed to load configuration file:', error);
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
            alert('Unable to load configuration file. Please make sure you are running the website on a local server instead of directly opening the HTML file.\n\nRecommended methods:\n1. Using Python: python -m http.server\n2. Using Node.js: npx http-server');
        } else {
            alert('Configuration file loading failed: ' + error.message);
        }
        return null;
    }
}

// Initialize page content – simplified since most content is embedded in HTML
async function initializeContent() {
    console.log('Page content is already embedded in HTML, skipping dynamic loading...');
    
    // Only keep minimal initialization logic
    await initializeNavigation();
    await loadAndRenderGitHubRepos();
    
    // Set footer update date
    const footerUpdateDate = document.getElementById('footer-update-date');
    if (footerUpdateDate) {
        footerUpdateDate.textContent = new Date().toLocaleDateString();
    }
}

// Theme switching configuration
const themes = ['auto', 'light', 'dark'];
let currentThemeIndex = 0;

let mediaQueryDark = window.matchMedia('(prefers-color-scheme: dark)');
let autoThemeListener = null;

function setTheme(theme) {
    const html = document.documentElement;
    if (theme === 'auto') {
        html.removeAttribute('data-theme');
        // Listen for system theme changes
        if (!autoThemeListener) {
            autoThemeListener = (e) => {
                html.removeAttribute('data-theme');
            };
            mediaQueryDark.addEventListener('change', autoThemeListener);
        }
    } else {
        html.setAttribute('data-theme', theme);
        // Remove listener if theme is manually set
        if (autoThemeListener) {
            mediaQueryDark.removeEventListener('change', autoThemeListener);
            autoThemeListener = null;
        }
    }
    localStorage.setItem('theme', theme);
}

function updateThemeBtnIcon() {
    const themeBtn = document.querySelector('.theme-btn');
    if (!themeBtn) return;
    const icon = themeBtn.querySelector('i');
    if (!icon) return;
    // Switch icon based on theme
    icon.className = 'fas ' + (
        themes[currentThemeIndex] === 'auto' ? 'fa-circle-half-stroke' :
        themes[currentThemeIndex] === 'light' ? 'fa-sun' :
        'fa-moon'
    );
    themeBtn.title = 'Current theme: ' + (
        themes[currentThemeIndex] === 'auto' ? 'Auto' :
        themes[currentThemeIndex] === 'light' ? 'Light' : 'Dark'
    );
}

function handleThemeBtnClick() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    setTheme(themes[currentThemeIndex]);
    updateThemeBtnIcon();
}

// Apply saved theme or auto mode based on local time
const savedTheme = localStorage.getItem('theme');
if (savedTheme && savedTheme !== 'auto') {
    currentThemeIndex = themes.indexOf(savedTheme);
    if (currentThemeIndex === -1) currentThemeIndex = 0;
    setTheme(themes[currentThemeIndex]);
} else {
    // Default auto theme
    currentThemeIndex = 0;
    // Auto theme adjusts to local time
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
        document.documentElement.removeAttribute('data-theme'); // Light mode
    } else {
        document.documentElement.setAttribute('data-theme', 'dark'); // Dark mode
    }
    localStorage.setItem('theme', 'auto');
}

// Initialize navigation links and social icons
async function initializeNavigation() {
    const config = await loadConfig();
    console.log('config:', config);
    if (!config) return;

    // Update profile information
    const profileInfo = document.querySelector('.profile-info');
    if (profileInfo) {
        profileInfo.querySelector('h2').textContent = config.profile.name;
        profileInfo.querySelector('.title').textContent = config.profile.title;
        profileInfo.querySelector('.department').textContent = config.profile.department;
        profileInfo.querySelector('.university').textContent = config.profile.university;
    }

    // Update profile image
    const profileImage = document.querySelector('.profile-image img');
    if (profileImage) {
        profileImage.src = config.profile.image;
        profileImage.alt = config.profile.name;
    }

    // Update navigation and social links
    const navLinks = document.querySelector('.nav-links');
    const socialLinks = document.querySelector('.social-links');
    
    // Clear existing links
    navLinks.innerHTML = '';
    socialLinks.innerHTML = '';
    
    // Add navigation links
    Object.values(config.navigation).forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.url;
        a.innerHTML = `<i class="${link.icon}"></i> ${link.title}`;
        li.appendChild(a);
        navLinks.appendChild(li);
    });
    
    // Add theme switch button
    const themeLi = document.createElement('li');
    themeLi.className = 'theme-btn-wrapper';
    themeLi.innerHTML = `
        <button class="theme-btn" title="Toggle Theme">
            <i class="fas fa-circle-half-stroke"></i>
        </button>
    `;
    navLinks.appendChild(themeLi);
    
    // Add social media links
    Object.values(config.social).forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.title = link.title;
        if (link.icon === 'cv-svg-icon') {
            a.innerHTML = '<img src="images/CV.svg" alt="CV" style="width: 60%; height: 60%; display: block; margin: 0 auto; filter: grayscale(1) brightness(0.2);" />';
        } else {
            a.innerHTML = `<i class="${link.icon}"></i>`;
        }
        socialLinks.appendChild(a);
    });

    setAllLinksBlank();
}

// Fetch and render GitHub repositories
async function loadAndRenderGitHubRepos() {
    const username = 'DripNowhy';
    const repoSection = document.querySelector('.github-repo-section');
    if (!repoSection) return;
    repoSection.innerHTML = '<p>Loading repositories...</p>';
    try {
        const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
        if (!res.ok) throw new Error('GitHub API error');
        const repos = await res.json();
        if (!Array.isArray(repos)) throw new Error('Invalid repository data');
        // Filter: only non-forked public repos, sorted by stars, top 3
        const filtered = repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
        if (filtered.length === 0) {
            repoSection.innerHTML = '<p>No public repositories found.</p>';
            return;
        }
        repoSection.innerHTML = `<div class="github-repo-grid">${filtered.map(repo => `
            <div class="github-repo-card">
                <div class="repo-title"><a href="${repo.html_url}" target="_blank"><i class="fas fa-book"></i> ${repo.name}</a></div>
                <div class="repo-desc">${repo.description ? repo.description : ''}</div>
                <div class="repo-meta">
                    ${repo.language ? `<span class="repo-lang"><span class="repo-dot"></span>${repo.language}</span>` : ''}
                    <span class="repo-stars"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                    <span class="repo-forks"><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
                </div>
            </div>
        `).join('')}</div>`;
    } catch (e) {
        repoSection.innerHTML = '<p>Failed to load repositories.</p>';
    }

    setAllLinksBlank();
}

// Open external links in new tabs, except internal anchors
function setAllLinksBlank() {
    document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !a.hasAttribute('target')) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        } else if (href && href.startsWith('#')) {
            a.removeAttribute('target');
            a.removeAttribute('rel');
        }
    });
}

// Initialize page after DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await initializeNavigation();
    await initializeContent();
    // Bind theme button event
    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', handleThemeBtnClick);
        updateThemeBtnIcon();
    }
});
