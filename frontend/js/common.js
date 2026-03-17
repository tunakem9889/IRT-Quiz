window.ADAPTER_API_BASE = window.ADAPTER_API_BASE || 'http://localhost:8000';
const API_BASE = window.ADAPTER_API_BASE;

function el(id) {
    return document.getElementById(id);
}

function showLoading() {
    const overlay = el('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = el('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function formatTheta(theta) {
    return Number.isFinite(theta) ? theta.toFixed(2) : '0.00';
}

function formatSE(se) {
    if (se === null || se === undefined) return '-';
    return Number.isFinite(se) ? se.toFixed(3) : '-';
}

function saveResultToHistory(data, category) {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    
    // Calculate correct count if not provided directly
    let correctCount = 0;
    let totalAnswered = 0;
    if (data.report) {
        const reportLines = data.report.split('\n');
        reportLines.forEach(line => {
          if (line.includes('Số câu đúng:')) {
            const match = line.match(/(\d+)\/(\d+)/);
            if (match) {
              correctCount = parseInt(match[1]);
              totalAnswered = parseInt(match[2]);
            }
          }
        });
    }

    const result = {
        id: data.session_id || Date.now(), // Fallback ID
        date: new Date().toISOString(),
        theta: data.theta,
        se: data.se,
        correct: correctCount,
        total: totalAnswered || data.q_count,
        category: category
    };
    
    history.unshift(result); // Add to beginning
    localStorage.setItem('quiz_history', JSON.stringify(history.slice(0, 50))); // Keep last 50
}
