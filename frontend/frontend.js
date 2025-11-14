(() => {
  const API_BASE = window.ADAPTER_API_BASE || 'http://localhost:8000';

  const el = (id) => document.getElementById(id);

  // Elements
  const startScreen = el('start-screen');
  const quizScreen = el('quiz-screen');
  const resultScreen = el('result-screen');
  const btnStart = el('btn-start');
  const btnSubmit = el('btn-submit');
  const btnSkip = el('btn-skip');
  const btnRestart = el('btn-restart');
  const stemEl = el('stem');
  const choicesEl = el('choices');
  const categorySelect = el('category-select');
  const thetaDisplay = el('theta-display');
  const seDisplay = el('se-display');
  const progressDisplay = el('progress-display');
  const progressFill = el('progress-fill');
  const progressBar = el('progress-bar');
  const finalTheta = el('final-theta');
  const finalSe = el('final-se');
  const finalCorrect = el('final-correct');
  const finalCorrectDesc = el('final-correct-desc');
  const finalTotal = el('final-total');
  const finalTotalDesc = el('final-total-desc');
  const reportEl = el('report');
  const questionNumEl = el('question-num');
  const loadingOverlay = el('loading-overlay');
  const thetaIndicator = el('theta-indicator');
  const thetaBarFill = el('theta-bar-fill');
  const questionGrid = el('question-grid');

  // State
  const state = {
    sessionId: null,
    currentQuestion: null,
    theta: 0,
    se: null,
    qCount: 0,
    answeredCount: 0,
    finished: false,
    maxQuestions: null,
    correctCount: 0,
    totalQuestions: 0,
    questionStates: {}, // Track state of each question: {questionNum: 'pending'|'correct'|'incorrect'|'skipped'|'current'}
    currentQuestionNum: 0,
    category: null,
  };

  // Utility Functions
  function show(section) {
    startScreen.classList.add('hidden');
    quizScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    section.classList.remove('hidden');
  }

  function showLoading() {
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  function formatTheta(theta) {
    return Number.isFinite(theta) ? theta.toFixed(2) : '0.00';
  }

  function formatSE(se) {
    if (se === null || se === undefined) return '-';
    return Number.isFinite(se) ? se.toFixed(3) : '-';
  }

  function updateProgress() {
    const maxQ = state.maxQuestions ?? 10;
    // Progress based on total questions shown/processed
    const totalShown = state.qCount + (state.currentQuestion ? 1 : 0);
    const progress = maxQ > 0 ? (totalShown / maxQ) * 100 : 0;
    progressDisplay.textContent = `${totalShown}/${maxQ}`;
    progressFill.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
    
    // Update question number (current question being shown)
    // q_count is number of questions already processed, current question is q_count + 1
    if (questionNumEl) {
      const currentQuestionNum = state.currentQuestionNum || (state.currentQuestion ? state.qCount + 1 : state.qCount);
      questionNumEl.textContent = currentQuestionNum || 1;
    }
  }

  function updateStatus() {
    thetaDisplay.textContent = formatTheta(state.theta);
    seDisplay.textContent = formatSE(state.se);
    updateProgress();
  }

  function renderQuestion(question) {
    if (!question) {
      stemEl.textContent = '';
      choicesEl.innerHTML = '';
      return;
    }

    // Animate question appearance
    stemEl.style.opacity = '0';
    setTimeout(() => {
      // Insert stem as HTML so math delimiters ($...$) are preserved for MathJax
      stemEl.innerHTML = question.stem;
      stemEl.style.opacity = '1';
    }, 150);

    choicesEl.innerHTML = '';
    
    question.choices.forEach((choice, idx) => {
      const choiceItem = document.createElement('div');
      choiceItem.className = 'choice-item';
      choiceItem.style.opacity = '0';
      choiceItem.style.transform = 'translateY(10px)';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'choice';
      input.value = String(idx);
      input.id = `choice_${idx}`;

      const radio = document.createElement('div');
      radio.className = 'choice-radio';
      
  const label = document.createElement('label');
  label.className = 'choice-label';
  label.setAttribute('for', input.id);
  // Use innerHTML so math delimiters inside choice strings are preserved for MathJax
  label.innerHTML = choice;

      input.addEventListener('change', () => {
        // Remove selected class from all choices
        document.querySelectorAll('.choice-item').forEach(item => {
          item.classList.remove('selected');
        });
        // Add selected class to current choice
        choiceItem.classList.add('selected');
        btnSubmit.disabled = false;
      });

      choiceItem.appendChild(input);
      choiceItem.appendChild(radio);
      choiceItem.appendChild(label);
  choicesEl.appendChild(choiceItem);
      
      // Animate choice appearance
      setTimeout(() => {
        choiceItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        choiceItem.style.opacity = '1';
        choiceItem.style.transform = 'translateY(0)';
      }, 200 + idx * 50);
    });

    btnSubmit.disabled = true;

    // If MathJax is loaded, typeset the newly inserted math in stem and choices
    if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
      try {
        // typesetPromise accepts an array of elements to typeset
        MathJax.typesetPromise([stemEl, choicesEl]).catch((e) => {
          // swallow mathjax errors but log to console for debugging
          console.warn('MathJax typeset error:', e);
        });
      } catch (e) {
        console.warn('MathJax typeset invocation failed:', e);
      }
    }
  }

  function getSelectedChoice() {
    const checked = choicesEl.querySelector('input[name="choice"]:checked');
    return checked ? Number(checked.value) : null;
  }

  function createQuestionGrid(maxQuestions) {
    if (!questionGrid) return;
    
    questionGrid.innerHTML = '';
    
    for (let i = 1; i <= maxQuestions; i++) {
      const item = document.createElement('div');
      item.className = 'question-grid-item pending';
      item.dataset.questionNum = i;
      item.textContent = String(i).padStart(2, '0');
      questionGrid.appendChild(item);
    }
  }

  function updateQuestionGrid(questionNum, status) {
    if (!questionGrid || !questionNum) return;
    
    // Update the specific question
    const item = questionGrid.querySelector(`[data-question-num="${questionNum}"]`);
    if (item) {
      // Remove all status classes
      item.classList.remove('pending', 'correct', 'incorrect', 'skipped', 'current', 'answered');
      
      // Add new status
      item.classList.add(status);
      if (status !== 'pending') {
        item.classList.add('answered');
      }
      
      // Store state
      state.questionStates[questionNum] = status;
    }
  }

  function setCurrentQuestion(questionNum) {
    if (!questionGrid || !questionNum) return;
    
    // Remove current class from all items
    questionGrid.querySelectorAll('.question-grid-item').forEach(item => {
      item.classList.remove('current');
    });
    
    // Add current class to the current question
    const item = questionGrid.querySelector(`[data-question-num="${questionNum}"]`);
    if (item && !item.classList.contains('answered')) {
      item.classList.add('current');
      
      // Scroll to current question if needed
      const container = questionGrid.parentElement;
      if (container) {
        const itemLeft = item.offsetLeft;
        const itemWidth = item.offsetWidth;
        const containerWidth = container.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const itemRight = itemLeft + itemWidth;
        const visibleLeft = scrollLeft;
        const visibleRight = scrollLeft + containerWidth;
        
        // If item is not fully visible, scroll to center it
        if (itemLeft < visibleLeft || itemRight > visibleRight) {
          const scrollTo = itemLeft - (containerWidth / 2) + (itemWidth / 2);
          container.scrollTo({
            left: Math.max(0, scrollTo),
            behavior: 'smooth'
          });
        }
      }
    }
  }

  function updateThetaVisualization(theta) {
    if (!thetaIndicator || !thetaBarFill) return;
    
    // Convert theta from range [-3, 3] to percentage [0, 100]
    // Clamp theta to [-3, 3] range
    const clampedTheta = Math.max(-3, Math.min(3, theta));
    const percentage = ((clampedTheta + 3) / 6) * 100;
    
    thetaIndicator.style.left = `${percentage}%`;
  }

  async function loadCategories() {
    if (!categorySelect) return;

    try {
      categorySelect.disabled = true;
      categorySelect.innerHTML = '';
      const loadingOption = document.createElement('option');
      loadingOption.value = '';
      loadingOption.textContent = 'Đang tải danh mục...';
      loadingOption.disabled = true;
      loadingOption.selected = true;
      categorySelect.appendChild(loadingOption);
      state.category = null;

      const response = await fetch(`${API_BASE}/api/categories`);
      if (!response.ok) {
        throw new Error(`Không thể tải danh mục: ${response.statusText}`);
      }

      const categories = await response.json();
      categorySelect.innerHTML = '';

      categories.forEach((cat, index) => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        if (index === 0) {
          option.selected = true;
          state.category = cat.id;
        }
        categorySelect.appendChild(option);
      });

      if (!categories.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Không có danh mục khả dụng';
        option.disabled = true;
        option.selected = true;
        categorySelect.appendChild(option);
        state.category = null;
      }

      if (btnStart) {
        btnStart.disabled = !categories.length;
      }
    } catch (err) {
      console.error(err);
      categorySelect.innerHTML = '';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Lỗi tải danh mục';
      option.disabled = true;
      option.selected = true;
      categorySelect.appendChild(option);
      state.category = null;
      if (btnStart) {
        btnStart.disabled = true;
      }
    } finally {
      categorySelect.disabled = false;
    }
  }

  // API Functions
  async function startQuiz() {
    const maxQuestions = Number(document.getElementById('max-questions').value);
    const stopSE = Number(document.getElementById('stop-se').value);
    const selectedCategory = categorySelect ? categorySelect.value : state.category;

    if (!selectedCategory) {
      alert('Vui lòng chọn danh mục câu hỏi hợp lệ.');
      return;
    }

    const payload = {
      category: selectedCategory,
      config: {
        max_questions: Math.max(3, Math.min(50, Number.isFinite(maxQuestions) ? maxQuestions : 10)),
        stop_se: Math.max(0.05, Math.min(1.5, Number.isFinite(stopSE) ? stopSE : 0.35)),
      },
    };

    try {
      btnStart.disabled = true;
      showLoading();
      
      const response = await fetch(`${API_BASE}/api/quiz/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Start quiz failed: ${errorText || response.status}`);
      }

      const data = await response.json();
      state.sessionId = data.session_id;
      state.currentQuestion = data.question;
      state.category = data.category || selectedCategory;
      state.theta = data.theta ?? 0;
      state.se = data.se ?? null;
      state.qCount = data.q_count ?? 0;
      state.answeredCount = data.answered_count ?? 0;
      state.finished = false;
      state.maxQuestions = payload.config.max_questions;
      state.correctCount = 0;
      state.totalQuestions = 0;
      state.questionStates = {};
      state.currentQuestionNum = 1;

      // Create question grid
      createQuestionGrid(state.maxQuestions);
      setCurrentQuestion(1);

      renderQuestion(state.currentQuestion);
      updateStatus();
      updateThetaVisualization(state.theta);
      
      // Set initial question number to 1
      if (questionNumEl) {
        questionNumEl.textContent = '1';
      }
      
      show(quizScreen);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể bắt đầu bài quiz.');
    } finally {
      btnStart.disabled = false;
      hideLoading();
    }
  }

  async function submitAnswer(skipped = false) {
    if (!state.sessionId) return;

    const choice = skipped ? null : getSelectedChoice();
    if (!skipped && choice === null) {
      alert('Vui lòng chọn một đáp án.');
      return;
    }

    btnSubmit.disabled = true;
    btnSkip.disabled = true;
    showLoading();

    try {
      const payload = {
        session_id: state.sessionId,
        choice_index: choice,
        skipped,
      };

      const response = await fetch(`${API_BASE}/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Submit answer failed: ${errorText || response.status}`);
      }

      const data = await response.json();
      const wasCorrect = data.correct;
      
      // Get the question number that was just answered (before updating state)
      const answeredQuestionNum = state.currentQuestionNum || state.qCount + 1;
      
      // Update question grid based on answer for the question that was just answered
      if (skipped) {
        updateQuestionGrid(answeredQuestionNum, 'skipped');
      } else if (wasCorrect !== null) {
        if (wasCorrect) {
          updateQuestionGrid(answeredQuestionNum, 'correct');
          state.correctCount++;
        } else {
          updateQuestionGrid(answeredQuestionNum, 'incorrect');
        }
        state.totalQuestions++;
      }
      
      const previousTheta = state.theta;
      state.theta = data.theta;
      state.se = data.se ?? null;
      const oldQCount = state.qCount;
      state.qCount = data.q_count;
      state.answeredCount = data.answered_count;
      state.finished = data.finished;
      state.currentQuestion = data.next_question;
      
      // Calculate new current question number
      // If there's a next question, it's the next one (q_count + 1)
      // If finished, no current question
      if (data.next_question) {
        state.currentQuestionNum = state.qCount + 1;
      } else {
        state.currentQuestionNum = null;
      }

      updateStatus();
      updateThetaVisualization(state.theta);
      
      // Update current question in grid (if there's a next question)
      if (state.currentQuestion && state.currentQuestionNum) {
        setCurrentQuestion(state.currentQuestionNum);
      }
      
      // Animate theta change if significant
      if (Math.abs(state.theta - previousTheta) > 0.1) {
        thetaDisplay.style.transition = 'transform 0.3s ease';
        thetaDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => {
          thetaDisplay.style.transform = 'scale(1)';
        }, 300);
      }

      if (state.finished) {
        hideLoading();
        await loadResult();
      } else if (state.currentQuestion) {
        hideLoading();
        // Reset choices before rendering new question
        if (choicesEl) choicesEl.innerHTML = '';
        renderQuestion(state.currentQuestion);
        // Update current question in grid
        setCurrentQuestion(state.currentQuestionNum);
      } else {
        hideLoading();
        await loadResult();
      }
    } catch (err) {
      console.error(err);
      hideLoading();
      alert(err.message || 'Không thể nộp đáp án.');
    } finally {
      btnSkip.disabled = false;
      btnSubmit.disabled = true;
    }
  }

  async function loadResult() {
    if (!state.sessionId) return;

    try {
      showLoading();
      
      const response = await fetch(`${API_BASE}/api/quiz/${state.sessionId}/result`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get result failed: ${errorText || response.status}`);
      }

      const data = await response.json();
      finalTheta.textContent = formatTheta(data.theta);
      finalSe.textContent = formatSE(data.se);
      
      // Parse report to extract correct count and total
      const reportLines = data.report.split('\n');
      let correctCount = 0;
      let totalAnswered = 0;
      
      reportLines.forEach(line => {
        if (line.includes('Số câu đúng:')) {
          const match = line.match(/(\d+)\/(\d+)/);
          if (match) {
            correctCount = parseInt(match[1]);
            totalAnswered = parseInt(match[2]);
          }
        }
      });
      
      finalCorrect.textContent = correctCount || state.correctCount || 0;
      finalCorrectDesc.textContent = `Trong ${totalAnswered || state.totalQuestions || state.answeredCount || 0} câu đã trả lời`;
      finalTotal.textContent = data.q_count || state.qCount || 0;
      finalTotalDesc.textContent = 'Tổng số câu đã hiển thị';
      
      reportEl.textContent = data.report || '';
      
      // Update theta visualization
      updateThetaVisualization(data.theta);
      
      // Animate result screen
      setTimeout(() => {
        hideLoading();
        show(resultScreen);
      }, 500);
    } catch (err) {
      console.error(err);
      hideLoading();
      alert(err.message || 'Không thể tải kết quả.');
    }
  }

  function restart() {
    state.sessionId = null;
    state.currentQuestion = null;
    state.theta = 0;
    state.se = null;
    state.qCount = 0;
    state.answeredCount = 0;
    state.finished = false;
    state.maxQuestions = null;
    state.correctCount = 0;
    state.totalQuestions = 0;
    state.questionStates = {};
    state.currentQuestionNum = 0;
    state.category = categorySelect ? categorySelect.value || null : null;
    renderQuestion(null);
    updateStatus();
    updateThetaVisualization(0);
    if (progressFill) progressFill.style.width = '0%';
    if (questionGrid) questionGrid.innerHTML = '';
    show(startScreen);
  }

  // Event Listeners
  btnStart.addEventListener('click', () => startQuiz());
  btnSubmit.addEventListener('click', () => submitAnswer(false));
  btnSkip.addEventListener('click', () => submitAnswer(true));
  btnRestart.addEventListener('click', restart);
  if (categorySelect) {
    categorySelect.addEventListener('change', (event) => {
      state.category = event.target.value || null;
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when quiz screen is visible
    if (quizScreen.classList.contains('hidden')) return;
    
    // Number keys 1-4 to select choices
    if (e.key >= '1' && e.key <= '4') {
      const choiceIndex = parseInt(e.key) - 1;
      const choiceInput = document.getElementById(`choice_${choiceIndex}`);
      if (choiceInput) {
        choiceInput.checked = true;
        choiceInput.dispatchEvent(new Event('change'));
      }
    }
    
    // Enter to submit
    if (e.key === 'Enter' && !btnSubmit.disabled) {
      btnSubmit.click();
    }
    
    // Space to skip
    if (e.key === ' ' && !btnSkip.disabled) {
      e.preventDefault();
      btnSkip.click();
    }
  });

  // Initialize
  show(startScreen);
  updateStatus();
  updateThetaVisualization(0);
  
  // Add smooth transitions
  document.addEventListener('DOMContentLoaded', () => {
    // Add entrance animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
    });
  });

  loadCategories();
})();
