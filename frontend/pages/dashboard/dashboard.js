document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});

function loadDashboard() {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    
    // Update stats
    const totalQuizzes = history.length;
    const totalCorrect = history.reduce((sum, item) => sum + (item.correct || 0), 0);
    const avgTheta = totalQuizzes > 0 
        ? history.reduce((sum, item) => sum + item.theta, 0) / totalQuizzes 
        : 0;

    if (el('dash-total-quizzes')) el('dash-total-quizzes').textContent = totalQuizzes;
    if (el('dash-avg-theta')) el('dash-avg-theta').textContent = avgTheta.toFixed(2);
    if (el('dash-total-correct')) el('dash-total-correct').textContent = totalCorrect;

    // Update activity list
    const activityList = el('activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    if (history.length === 0) {
        activityList.innerHTML = '<div class="empty-state">Chưa có dữ liệu bài thi nào.</div>';
        return;
    }

    history.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="activity-info">
                <span class="activity-date">${date}</span>
                <span class="activity-score">Đúng ${item.correct}/${item.total} câu</span>
            </div>
            <div class="activity-theta">θ: ${item.theta.toFixed(2)}</div>
        `;
        activityList.appendChild(div);
    });
}
