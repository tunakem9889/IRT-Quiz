(() => {
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
  const finalTheta = el('final-theta');
  const finalSe = el('final-se');
  const finalCorrect = el('final-correct');
  const finalCorrectDesc = el('final-correct-desc');
  const finalTotal = el('final-total');
  const finalTotalDesc = el('final-total-desc');
  const reportEl = el('report');
  const questionNumEl = el('question-num');
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
    questionStates: {},
    currentQuestionNum: 0,
    category: null,
  };

  function show(section) {
    [startScreen, quizScreen, resultScreen].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (section) section.classList.remove('hidden');
  }

  function updateProgress() {
    const maxQ = state.maxQuestions ?? 10;
    const totalShown = state.qCount + (state.currentQuestion ? 1 : 0);
    const progress = maxQ > 0 ? (totalShown / maxQ) * 100 : 0;
    if (progressDisplay) progressDisplay.textContent = `${totalShown}/${maxQ}`;
    if (progressFill) progressFill.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
    
    if (questionNumEl) {
      const currentQuestionNum = state.currentQuestionNum || (state.currentQuestion ? state.qCount + 1 : state.qCount);
      questionNumEl.textContent = currentQuestionNum || 1;
    }
  }

  function updateStatus() {
    if (thetaDisplay) thetaDisplay.textContent = formatTheta(state.theta);
    if (seDisplay) seDisplay.textContent = formatSE(state.se);
    updateProgress();
  }

  function renderQuestion(question) {
    if (!question) {
      if (stemEl) stemEl.textContent = '';
      if (choicesEl) choicesEl.innerHTML = '';
      return;
    }

    if (stemEl) {
        stemEl.style.opacity = '0';
        setTimeout(() => {
          stemEl.innerHTML = question.stem;
          stemEl.style.opacity = '1';
        }, 150);
    }

    if (choicesEl) {
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
          label.innerHTML = choice;

          input.addEventListener('change', () => {
            document.querySelectorAll('.choice-item').forEach(item => {
              item.classList.remove('selected');
            });
            choiceItem.classList.add('selected');
            if (btnSubmit) btnSubmit.disabled = false;
          });

          choiceItem.appendChild(input);
          choiceItem.appendChild(radio);
          choiceItem.appendChild(label);
          choicesEl.appendChild(choiceItem);
          
          setTimeout(() => {
            choiceItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            choiceItem.style.opacity = '1';
            choiceItem.style.transform = 'translateY(0)';
          }, 200 + idx * 50);
        });
    }

    if (btnSubmit) btnSubmit.disabled = true;

    if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
      try {
        MathJax.typesetPromise([stemEl, choicesEl]).catch((e) => {
          console.warn('MathJax typeset error:', e);
        });
      } catch (e) {
        console.warn('MathJax typeset invocation failed:', e);
      }
    }
  }

  function getSelectedChoice() {
    if (!choicesEl) return null;
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
    
    const item = questionGrid.querySelector(`[data-question-num="${questionNum}"]`);
    if (item) {
      item.classList.remove('pending', 'correct', 'incorrect', 'skipped', 'current', 'answered');
      item.classList.add(status);
      if (status !== 'pending') {
        item.classList.add('answered');
      }
      state.questionStates[questionNum] = status;
    }
  }

  function setCurrentQuestion(questionNum) {
    if (!questionGrid || !questionNum) return;
    
    questionGrid.querySelectorAll('.question-grid-item').forEach(item => {
      item.classList.remove('current');
    });
    
    const item = questionGrid.querySelector(`[data-question-num="${questionNum}"]`);
    if (item && !item.classList.contains('answered')) {
      item.classList.add('current');
      
      const container = questionGrid.parentElement;
      if (container) {
        const itemLeft = item.offsetLeft;
        const itemWidth = item.offsetWidth;
        const containerWidth = container.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const itemRight = itemLeft + itemWidth;
        const visibleLeft = scrollLeft;
        const visibleRight = scrollLeft + containerWidth;
        
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
      if (btnStart) btnStart.disabled = true;
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

      createQuestionGrid(state.maxQuestions);
      setCurrentQuestion(1);

      renderQuestion(state.currentQuestion);
      updateStatus();
      updateThetaVisualization(state.theta);
      
      if (questionNumEl) {
        questionNumEl.textContent = '1';
      }
      
      show(quizScreen);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể bắt đầu bài quiz.');
    } finally {
      if (btnStart) btnStart.disabled = false;
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

    if (btnSubmit) btnSubmit.disabled = true;
    if (btnSkip) btnSkip.disabled = true;
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
      
      const answeredQuestionNum = state.currentQuestionNum || state.qCount + 1;
      
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
      state.qCount = data.q_count;
      state.answeredCount = data.answered_count;
      state.finished = data.finished;
      state.currentQuestion = data.next_question;
      
      if (data.next_question) {
        state.currentQuestionNum = state.qCount + 1;
      } else {
        state.currentQuestionNum = null;
      }

      updateStatus();
      updateThetaVisualization(state.theta);
      
      if (state.currentQuestion && state.currentQuestionNum) {
        setCurrentQuestion(state.currentQuestionNum);
      }
      
      if (Math.abs(state.theta - previousTheta) > 0.1 && thetaDisplay) {
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
        if (choicesEl) choicesEl.innerHTML = '';
        renderQuestion(state.currentQuestion);
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
      if (btnSkip) btnSkip.disabled = false;
      if (btnSubmit) btnSubmit.disabled = true;
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
      
      saveResultToHistory(data, state.category);

      if (finalTheta) finalTheta.textContent = formatTheta(data.theta);
      if (finalSe) finalSe.textContent = formatSE(data.se);
      
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
      
      if (finalCorrect) finalCorrect.textContent = correctCount || state.correctCount || 0;
      if (finalCorrectDesc) finalCorrectDesc.textContent = `Trong ${totalAnswered || state.totalQuestions || state.answeredCount || 0} câu đã trả lời`;
      if (finalTotal) finalTotal.textContent = data.q_count || state.qCount || 0;
      if (finalTotalDesc) finalTotalDesc.textContent = 'Tổng số câu đã hiển thị';
      
      if (reportEl) reportEl.textContent = data.report || '';
      
      updateThetaVisualization(data.theta);
      
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
  if (btnStart) btnStart.addEventListener('click', () => startQuiz());
  if (btnSubmit) btnSubmit.addEventListener('click', () => submitAnswer(false));
  if (btnSkip) btnSkip.addEventListener('click', () => submitAnswer(true));
  if (btnRestart) btnRestart.addEventListener('click', restart);
  if (categorySelect) {
    categorySelect.addEventListener('change', (event) => {
      state.category = event.target.value || null;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (quizScreen && quizScreen.classList.contains('hidden')) return;
    
    if (e.key >= '1' && e.key <= '4') {
      const choiceIndex = parseInt(e.key) - 1;
      const choiceInput = document.getElementById(`choice_${choiceIndex}`);
      if (choiceInput) {
        choiceInput.checked = true;
        choiceInput.dispatchEvent(new Event('change'));
      }
    }
    
    if (e.key === 'Enter' && btnSubmit && !btnSubmit.disabled) {
      btnSubmit.click();
    }
    
    if (e.key === ' ' && btnSkip && !btnSkip.disabled) {
      e.preventDefault();
      btnSkip.click();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
    });
  });

  loadCategories();
  show(startScreen);
})();
