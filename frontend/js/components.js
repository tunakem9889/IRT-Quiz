/**
 * Component Loader
 * Loads header and footer components dynamically into pages
 */

// Get the current page name from the URL
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('/home/')) return 'home';
    if (path.includes('/dashboard/')) return 'dashboard';
    if (path.includes('/quiz/')) return 'quiz';
    if (path.includes('/admin/')) return 'admin';
    return '';
}

// Load a component from a file
async function loadComponent(componentPath, targetSelector) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${componentPath}`);
        }
        const html = await response.text();
        const target = document.querySelector(targetSelector);
        if (target) {
            target.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Initialize components when DOM is loaded
async function initComponents() {
    // Determine the correct path to components based on current location
    const basePath = getComponentBasePath();
    
    // Load header
    await loadComponent(`${basePath}/components/header.html`, '#header-placeholder');
    
    // Load footer
    await loadComponent(`${basePath}/components/footer.html`, '#footer-placeholder');
    
    // Set active navigation link after header is loaded
    setActiveNavLink();
}

// Get the base path to components directory
function getComponentBasePath() {
    const path = window.location.pathname;
    // If we're in a page directory (home, dashboard, quiz, admin), go up two levels
    if (path.includes('/pages/')) {
        return '../..';
    }
    // Default fallback
    return '/frontend';
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    initComponents();
}
