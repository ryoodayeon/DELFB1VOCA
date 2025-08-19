// 전역 변수
let vocabularyData = null;
let currentLevel = 1;
let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let isAnswered = false;
let userProgress = {};

// 로컬 스토리지 키
const PROGRESS_KEY = 'delf_b1_progress';

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    loadVocabulary();
});

// 단어 데이터 로드
async function loadVocabulary() {
    try {
        const response = await fetch('vocabulary.json');
        vocabularyData = await response.json();
        hideLoading();
        updateProgressStats();
        generateLevelGrid();
    } catch (error) {
        console.error('단어 데이터 로드 실패:', error);
        hideLoading();
        alert('단어 데이터를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
    }
}

// 로딩 화면 숨기기
function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// 진행 상황 로드
function loadProgress() {
    const savedProgress = localStorage.getItem(PROGRESS_KEY);
    if (savedProgress) {
        userProgress = JSON.parse(savedProgress);
    } else {
        userProgress = {};
        for (let i = 1; i <= 20; i++) {
            userProgress[i] = {
                completed: false,
                bestScore: 0,
                attempts: 0,
                totalCorrect: 0
            };
        }
    }
}

// 진행 상황 저장
function saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(userProgress));
    updateProgressStats();
}

// 진행 상황 통계 업데이트
function updateProgressStats() {
    const completedLevels = Object.values(userProgress).filter(p => p.completed).length;
    const totalCorrect = Object.values(userProgress).reduce((sum, p) => sum + p.totalCorrect, 0);
    const totalAttempts = Object.values(userProgress).reduce((sum, p) => sum + p.attempts, 0);
    const averageScore = totalAttempts > 0 ? Math.round((totalCorrect / (totalAttempts * 50)) * 100) : 0;

    // 홈 화면 통계 업데이트
    const progressStat = document.getElementById('progress-stat');
    if (progressStat) {
        progressStat.textContent = completedLevels;
    }

    // 학습 현황 화면 통계 업데이트
    const overallPercentage = document.getElementById('overall-percentage');
    const completedLevelsSpan = document.getElementById('completed-levels');
    const totalCorrectSpan = document.getElementById('total-correct');
    const averageScoreSpan = document.getElementById('average-score');

    if (overallPercentage) {
        overallPercentage.textContent = Math.round((completedLevels / 20) * 100) + '%';
    }
    if (completedLevelsSpan) {
        completedLevelsSpan.textContent = `${completedLevels} / 20`;
    }
    if (totalCorrectSpan) {
        totalCorrectSpan.textContent = totalCorrect;
    }
    if (averageScoreSpan) {
        averageScoreSpan.textContent = averageScore + '%';
    }
}

// 화면 전환 함수들
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showHome() {
    showScreen('home-screen');
    updateProgressStats();
}

function showLevelSelect() {
    showScreen('level-select-screen');
    generateLevelGrid();
}

function showProgress() {
    showScreen('progress-screen');
    generateProgressList();
}

// 단계 그리드 생성
function generateLevelGrid() {
    if (!vocabularyData) return;

    const levelGrid = document.getElementById('level-grid');
    levelGrid.innerHTML = '';

    vocabularyData.levels.forEach((level, index) => {
        const levelCard = document.createElement('div');
        levelCard.className = 'level-card';
        
        const progress = userProgress[level.level] || { completed: false, bestScore: 0 };
        const isLocked = level.level > 1 && !userProgress[level.level - 1]?.completed;
        
        if (progress.completed) {
            levelCard.classList.add('completed');
        }
        if (isLocked) {
            levelCard.classList.add('locked');
        }

        const badge = progress.completed ? '✅' : isLocked ? '🔒' : '📝';
        const scoreText = progress.completed ? `최고 점수: ${progress.bestScore}점` : '미완료';

        levelCard.innerHTML = `
            <div class="level-badge">${badge}</div>
            <div class="level-number">단계 ${level.level}</div>
            <div class="level-title">${level.theme}</div>
            <div class="level-stats">
                <span>50개 단어</span>
                <span>${scoreText}</span>
            </div>
        `;

        if (!isLocked) {
            levelCard.addEventListener('click', () => startQuiz(level.level));
        }

        levelGrid.appendChild(levelCard);
    });
}

// 학습 현황 리스트 생성
function generateProgressList() {
    if (!vocabularyData) return;

    const progressList = document.getElementById('level-progress-list');
    progressList.innerHTML = '<h3 style="margin-bottom: 20px; text-align: center;">단계별 학습 현황</h3>';

    vocabularyData.levels.forEach(level => {
        const progress = userProgress[level.level] || { completed: false, bestScore: 0, attempts: 0 };
        
        const progressItem = document.createElement('div');
        progressItem.className = 'level-progress-item';
        
        const status = progress.completed ? '완료' : progress.attempts > 0 ? '진행중' : '미시작';
        const statusColor = progress.completed ? '#4CAF50' : progress.attempts > 0 ? '#ff9800' : '#999';
        
        progressItem.innerHTML = `
            <div class="level-progress-info">
                <div class="level-progress-title">단계 ${level.level}: ${level.theme}</div>
                <div class="level-progress-subtitle">${status} • ${progress.attempts}회 시도</div>
            </div>
            <div class="level-progress-score" style="color: ${statusColor}">
                ${progress.bestScore}/50
            </div>
        `;
        
        progressList.appendChild(progressItem);
    });
}

// 퀴즈 시작
function startQuiz(levelNumber) {
    currentLevel = levelNumber;
    const levelData = vocabularyData.levels.find(l => l.level === levelNumber);
    
    if (!levelData) return;

    // 이전 단계들의 단어도 포함 (누적 학습)
    currentQuiz = [];
    for (let i = 1; i <= levelNumber; i++) {
        const level = vocabularyData.levels.find(l => l.level === i);
        if (level) {
            currentQuiz.push(...level.words);
        }
    }

    // 현재 단계 단어를 더 많이 포함하도록 가중치 적용
    const currentLevelWords = levelData.words;
    for (let i = 0; i < 2; i++) { // 현재 단계 단어를 2번 더 추가
        currentQuiz.push(...currentLevelWords);
    }

    // 랜덤하게 50개 선택
    currentQuiz = shuffleArray(currentQuiz).slice(0, 50);
    
    currentQuestionIndex = 0;
    score = 0;
    
    // 퀴즈 화면 설정
    document.getElementById('quiz-level-title').textContent = `단계 ${levelNumber}: ${levelData.theme}`;
    document.getElementById('quiz-total').textContent = currentQuiz.length;
    
    showScreen('quiz-screen');
    showQuestion();
}

// 배열 섞기 함수
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 문제 출제
function showQuestion() {
    if (currentQuestionIndex >= currentQuiz.length) {
        showResults();
        return;
    }

    const currentWord = currentQuiz[currentQuestionIndex];
    isAnswered = false;
    selectedAnswer = null;

    // 문제 표시
    document.getElementById('word-display').textContent = currentWord.french;
    document.getElementById('quiz-current').textContent = currentQuestionIndex + 1;

    // 정답과 오답 선택지 생성
    const correctAnswer = currentWord.korean;
    const wrongAnswers = getWrongAnswers(correctAnswer);
    const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

    // 선택지 표시
    const answerContainer = document.getElementById('answer-options');
    answerContainer.innerHTML = '';

    allAnswers.forEach((answer, index) => {
        const option = document.createElement('div');
        option.className = 'answer-option';
        option.textContent = answer;
        option.addEventListener('click', () => selectAnswer(option, answer, correctAnswer));
        answerContainer.appendChild(option);
    });

    // 다음 버튼 비활성화
    document.getElementById('next-btn').disabled = true;

    // 진행률 업데이트
    updateQuizProgress();
}

// 오답 선택지 생성
function getWrongAnswers(correctAnswer) {
    const allWords = vocabularyData.levels.flatMap(level => level.words);
    const wrongAnswers = allWords
        .filter(word => word.korean !== correctAnswer)
        .map(word => word.korean);
    
    return shuffleArray(wrongAnswers).slice(0, 3);
}

// 답안 선택
function selectAnswer(optionElement, selectedAnswer, correctAnswer) {
    if (isAnswered) return;

    // 모든 선택지에서 선택 상태 제거
    document.querySelectorAll('.answer-option').forEach(option => {
        option.classList.remove('selected');
    });

    // 선택된 옵션 표시
    optionElement.classList.add('selected');
    this.selectedAnswer = selectedAnswer;

    // 다음 버튼 활성화
    document.getElementById('next-btn').disabled = false;
}

// 다음 문제
function nextQuestion() {
    if (!selectedAnswer) return;

    const correctAnswer = currentQuiz[currentQuestionIndex].korean;
    const isCorrect = selectedAnswer === correctAnswer;

    // 정답 표시
    document.querySelectorAll('.answer-option').forEach(option => {
        if (option.textContent === correctAnswer) {
            option.classList.add('correct');
        } else if (option.textContent === selectedAnswer && !isCorrect) {
            option.classList.add('incorrect');
        }
    });

    if (isCorrect) {
        score++;
    }

    isAnswered = true;

    // 잠시 후 다음 문제로
    setTimeout(() => {
        currentQuestionIndex++;
        updateQuizProgress();
        showQuestion();
    }, 1500);
}

// 퀴즈 진행률 업데이트
function updateQuizProgress() {
    const progress = (currentQuestionIndex / currentQuiz.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-text').textContent = Math.round(progress) + '%';
    document.getElementById('current-score').textContent = `${score} / ${currentQuestionIndex}`;
}

// 결과 표시
function showResults() {
    const percentage = Math.round((score / currentQuiz.length) * 100);
    
    // 결과 화면 업데이트
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-total').textContent = currentQuiz.length;
    document.getElementById('result-percentage').textContent = percentage + '%';

    // 피드백 메시지
    const feedback = document.getElementById('result-feedback');
    let feedbackClass = '';
    let feedbackMessage = '';

    if (percentage >= 90) {
        feedbackClass = 'success';
        feedbackMessage = '🎉 완벽합니다! 훌륭한 성취입니다!';
    } else if (percentage >= 80) {
        feedbackClass = 'success';
        feedbackMessage = '👏 잘했습니다! 거의 완벽한 수준입니다!';
    } else if (percentage >= 70) {
        feedbackClass = 'warning';
        feedbackMessage = '👍 좋습니다! 조금만 더 노력하면 완벽해질 거예요!';
    } else if (percentage >= 60) {
        feedbackClass = 'warning';
        feedbackMessage = '📚 괜찮습니다! 복습을 통해 더 향상시켜 보세요!';
    } else {
        feedbackClass = 'danger';
        feedbackMessage = '💪 다시 도전해보세요! 연습을 통해 실력을 키워보세요!';
    }

    feedback.className = `result-feedback ${feedbackClass}`;
    feedback.textContent = feedbackMessage;

    // 결과 색상 설정
    const resultPercentage = document.getElementById('result-percentage');
    if (percentage >= 80) {
        resultPercentage.style.background = '#4CAF50';
        resultPercentage.style.color = 'white';
    } else if (percentage >= 60) {
        resultPercentage.style.background = '#ff9800';
        resultPercentage.style.color = 'white';
    } else {
        resultPercentage.style.background = '#f44336';
        resultPercentage.style.color = 'white';
    }

    // 진행 상황 업데이트
    updateUserProgress(currentLevel, score, percentage >= 70);

    showScreen('result-screen');
}

// 사용자 진행 상황 업데이트
function updateUserProgress(level, score, passed) {
    if (!userProgress[level]) {
        userProgress[level] = {
            completed: false,
            bestScore: 0,
            attempts: 0,
            totalCorrect: 0
        };
    }

    userProgress[level].attempts++;
    userProgress[level].totalCorrect += score;
    
    if (score > userProgress[level].bestScore) {
        userProgress[level].bestScore = score;
    }

    if (passed && !userProgress[level].completed) {
        userProgress[level].completed = true;
    }

    saveProgress();
}

// 퀴즈 재시도
function retryQuiz() {
    startQuiz(currentLevel);
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', function(event) {
    const activeScreen = document.querySelector('.screen.active');
    
    if (activeScreen && activeScreen.id === 'quiz-screen') {
        // 숫자 키 1-4로 답안 선택
        if (event.key >= '1' && event.key <= '4') {
            const optionIndex = parseInt(event.key) - 1;
            const options = document.querySelectorAll('.answer-option');
            if (options[optionIndex] && !isAnswered) {
                options[optionIndex].click();
            }
        }
        
        // Enter 키로 다음 문제
        if (event.key === 'Enter' && !document.getElementById('next-btn').disabled) {
            nextQuestion();
        }
    }
});

// 터치 이벤트 지원
document.addEventListener('touchstart', function() {}, {passive: true});

// 반응형 처리
function handleResize() {
    // 필요시 반응형 관련 처리
}

window.addEventListener('resize', handleResize);

// 오프라인 지원을 위한 서비스 워커 등록 (선택사항)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// 인쇄 방지 (선택사항)
window.addEventListener('beforeprint', function(event) {
    event.preventDefault();
    alert('이 페이지는 인쇄할 수 없습니다.');
});

// 개발자 도구 단축키 비활성화 (선택사항)
document.addEventListener('keydown', function(event) {
    if (event.key === 'F12' || 
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.ctrlKey && event.shiftKey && event.key === 'C') ||
        (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
    }
});

// 우클릭 방지 (선택사항)
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

// 성능 모니터링
const performanceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
            console.log('페이지 로드 시간:', entry.loadEventEnd - entry.loadEventStart, 'ms');
        }
    });
});

if (typeof PerformanceObserver !== 'undefined') {
    performanceObserver.observe({entryTypes: ['navigation']});
}
