const API_BASE_URL = 'http://localhost:8000/api';

// DOM Elements
const questionsTableBody = document.querySelector('#questions-table tbody');
const categoryFilter = document.getElementById('category-filter');
const addBtn = document.getElementById('add-btn');
const modal = document.getElementById('question-modal');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.close-btn');
const questionForm = document.getElementById('question-form');
const categorySelect = document.getElementById('category');

// State
let allQuestions = [];
let isEditing = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadQuestions();
    
    // Event Listeners
    categoryFilter.addEventListener('change', filterQuestions);
    addBtn.addEventListener('click', openAddModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    questionForm.addEventListener('submit', handleFormSubmit);
});

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const categories = await response.json();
        
        // Populate filter
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });

        // Populate form select
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Không thể tải danh sách môn học.');
    }
}

async function loadQuestions() {
    try {
        const response = await fetch(`${API_BASE_URL}/questions`);
        allQuestions = await response.json();
        renderQuestions(allQuestions);
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Không thể tải danh sách câu hỏi.');
    }
}

function renderQuestions(questions) {
    questionsTableBody.innerHTML = '';
    
    if (questions.length === 0) {
        questionsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Không có câu hỏi nào.</td></tr>';
        return;
    }

    questions.forEach(q => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${q.item_id}</td>
            <td>${q.stem.substring(0, 50)}${q.stem.length > 50 ? '...' : ''}</td>
            <td>${q.category}</td>
            <td>${q.params.b}</td>
            <td>${q.params.a}</td>
            <td>${q.params.c || 0}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="editQuestion('${q.item_id}')">Sửa</button>
                <button class="btn-sm btn-delete" onclick="deleteQuestion('${q.item_id}')">Xóa</button>
            </td>
        `;
        questionsTableBody.appendChild(tr);
    });
}

function filterQuestions() {
    const category = categoryFilter.value;
    if (!category) {
        renderQuestions(allQuestions);
    } else {
        const filtered = allQuestions.filter(q => q.category === category);
        renderQuestions(filtered);
    }
}

function openAddModal() {
    isEditing = false;
    modalTitle.textContent = 'Thêm câu hỏi';
    questionForm.reset();
    document.getElementById('item_id').readOnly = false;
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}

window.editQuestion = (itemId) => {
    const question = allQuestions.find(q => q.item_id === itemId);
    if (!question) return;

    isEditing = true;
    modalTitle.textContent = 'Sửa câu hỏi';
    
    // Fill form
    document.getElementById('item_id').value = question.item_id;
    document.getElementById('item_id').readOnly = true;
    document.getElementById('category').value = question.category;
    document.getElementById('stem').value = question.stem;
    document.getElementById('params_a').value = question.params.a;
    document.getElementById('params_b').value = question.params.b;
    document.getElementById('params_c').value = question.params.c || 0;

    // Fill choices
    question.choices.forEach((choice, index) => {
        document.querySelector(`input[name="choice_${index}"]`).value = choice;
    });
    
    // Set correct answer
    const radios = document.getElementsByName('correct');
    if (radios[question.correct]) {
        radios[question.correct].checked = true;
    }

    modal.style.display = 'block';
};

window.deleteQuestion = async (itemId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/questions/${itemId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Xóa thành công!');
            loadQuestions();
        } else {
            const error = await response.json();
            alert(`Lỗi: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('Có lỗi xảy ra khi xóa câu hỏi.');
    }
};

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(questionForm);
    const choices = [
        formData.get('choice_0'),
        formData.get('choice_1'),
        formData.get('choice_2'),
        formData.get('choice_3')
    ];

    const questionData = {
        item_id: formData.get('item_id') || crypto.randomUUID(),
        stem: formData.get('stem'),
        choices: choices,
        correct: parseInt(formData.get('correct')),
        params: {
            a: parseFloat(formData.get('params_a')),
            b: parseFloat(formData.get('params_b')),
            c: parseFloat(formData.get('params_c'))
        },
        category: formData.get('category'),
        language: 'vi'
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing 
        ? `${API_BASE_URL}/questions/${questionData.item_id}`
        : `${API_BASE_URL}/questions`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(questionData)
        });

        if (response.ok) {
            alert(isEditing ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
            closeModal();
            loadQuestions();
        } else {
            const error = await response.json();
            alert(`Lỗi: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error saving question:', error);
        alert('Có lỗi xảy ra khi lưu câu hỏi.');
    }
}
