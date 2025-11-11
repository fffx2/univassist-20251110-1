// ============================================
// 전역 상태 관리
// - 모든 탭 간 데이터 공유를 위한 중앙 저장소
// ============================================

let appState = {
    service: '',           // 서비스 목적
    platform: '',          // OS/플랫폼
    mood: { soft: 50, static: 50 },  // 무드 슬라이더 값
    keyword: '',           // 선택된 키워드
    primaryColor: '',      // 주조 색상
    generatedResult: null, // AI 생성 결과 (색상 시스템)
    labColors: {           // 유니버설 컬러시스템에서 설정한 색상
        bgColor: '#F5F5F5',
        textColor: '#333333'
    }
};

let knowledgeBase = {};  // knowledge_base.json 데이터
let typingTimeout;       // 타이핑 효과 타이머
let reportData = null;   // AI 리포트 데이터
let currentCodeTab = 'css';  // 현재 선택된 코드 탭

// ============================================
// 앱 초기화
// ============================================

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        // knowledge_base.json 로드
        const response = await fetch('./knowledge_base.json');
        if (!response.ok) throw new Error('Network response was not ok');
        knowledgeBase = await response.json();
        
        // 각 페이지 초기화
        setupNavigation();
        initializeMainPage();
        initializeLabPage();
        initializeReportPage();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateAIMessage("시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.");
    }
}

// ============================================
// 네비게이션 관리
// - 탭 전환 및 데이터 전달
// ============================================

function setupNavigation() {
    document.querySelectorAll('.nav-link, .interactive-button').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            
            // 모든 페이지 숨기고 타겟만 표시
            document.querySelectorAll('.main-page, .lab-page, .report-page').forEach(page => {
                page.classList.toggle('active', page.id === targetId);
                page.classList.toggle('hidden', page.id !== targetId);
            });
            
            // 네비게이션 링크 활성화 상태 업데이트
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.toggle('active', nav.dataset.target === targetId);
            });

            // 탭별 데이터 전달 처리
            if (targetId === 'lab-page' && appState.generatedResult) {
                // 메인 -> 유니버설 컬러시스템: Primary color 전달
                const { bgColor } = appState.generatedResult;
                updateLabPageWithData(bgColor, appState.labColors.textColor);
            }

            if (targetId === 'report-page') {
                // 유니버설 컬러시스템 -> AI 리포트: 모든 데이터 전달
                generateAIReport();
            }
        });
    });
}

// ============================================
// 메인 페이지 (첫 번째 탭)
// - AI 컬러시스템 추천
// ============================================

function initializeMainPage() {
    initializeDropdowns();
    initializeSliders();
    document.getElementById('generate-btn').addEventListener('click', generateGuide);
    updateAIMessage("안녕하세요! UNIVASSIST AI Design Assistant입니다. 어떤 프로젝트를 위한 디자인 가이드를 찾으시나요?");
}

// 드롭다운 메뉴 초기화
function initializeDropdowns() {
    const services = ['포트폴리오', '브랜드 홍보', '제품 판매', '정보 전달', '학습', '엔터테인먼트'];
    const platforms = ['iOS', 'Android', 'Web', 'Desktop', 'Tablet', 'Wearable', 'VR'];
    
    populateDropdown('service', services);
    populateDropdown('platform', platforms);

    document.getElementById('service-dropdown').addEventListener('click', () => toggleDropdown('service'));
    document.getElementById('platform-dropdown').addEventListener('click', () => toggleDropdown('platform'));
}

function populateDropdown(type, options) {
    const menu = document.getElementById(`${type}-menu`);
    menu.innerHTML = '';
    options.forEach(optionText => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = optionText;
        option.onclick = () => selectOption(type, optionText);
        menu.appendChild(option);
    });
}

function toggleDropdown(type) {
    const menu = document.getElementById(`${type}-menu`);
    const otherMenuType = type === 'service' ? 'platform' : 'service';
    document.getElementById(`${otherMenuType}-menu`).classList.remove('show');
    menu.classList.toggle('show');
}

function selectOption(type, value) {
    document.getElementById(`${type}-text`).textContent = value;
    document.getElementById(`${type}-dropdown`).classList.add('selected');
    appState[type] = value;
    toggleDropdown(type);

    // 두 드롭다운 모두 선택되면 다음 단계 표시
    if (appState.service && appState.platform) {
        document.getElementById('step02').classList.remove('hidden');
        updateAIMessage("훌륭해요! 이제 서비스의 핵심 분위기를 정해볼까요? 두 개의 슬라이더를 조절하여 원하는 무드를 찾아주세요.");
    }
}

// 무드 슬라이더 초기화
function initializeSliders() {
    const softHardSlider = document.getElementById('soft-hard-slider');
    const staticDynamicSlider = document.getElementById('static-dynamic-slider');
    
    const updateMoodAndKeywords = () => {
        appState.mood.soft = parseInt(softHardSlider.value);
        appState.mood.static = parseInt(staticDynamicSlider.value);
        
        // 슬라이더를 일정 이상 움직이면 키워드 표시
        if (Math.abs(appState.mood.soft - 50) > 10 || Math.abs(appState.mood.static - 50) > 10) {
            document.getElementById('step03').classList.remove('hidden');
            renderKeywords();
        }
    };
    
    softHardSlider.addEventListener('input', updateMoodAndKeywords);
    staticDynamicSlider.addEventListener('input', updateMoodAndKeywords);
}

// 무드에 따른 키워드 렌더링
function renderKeywords() {
    const { soft, static: staticMood } = appState.mood;
    
    // 무드 값에 따라 IRI 색상 그룹 선택
    let groupKey = (soft < 40 && staticMood >= 60) ? 'group1' :
                     (soft < 40 && staticMood < 40) ? 'group2' :
                     (soft >= 60 && staticMood < 40) ? 'group3' :
                     (soft >= 60 && staticMood >= 60) ? 'group4' : 'group5';
    
    const { keywords, description } = knowledgeBase.iri_colors[groupKey];
    const keywordContainer = document.getElementById('keyword-tags');
    keywordContainer.innerHTML = '';
    
    keywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = keyword;
        tag.onclick = () => selectKeyword(keyword, groupKey);
        keywordContainer.appendChild(tag);
    });
    
    updateAIMessage(`'${description}' 분위기를 선택하셨군요. 이와 관련된 키워드들을 제안합니다.`);
}

// 키워드 선택 처리
function selectKeyword(keyword, groupKey) {
    appState.keyword = keyword;
    
    // 선택된 키워드 하이라이트
    document.querySelectorAll('#keyword-tags .tag').forEach(tag => {
        tag.classList.toggle('selected', tag.textContent === keyword);
    });

    // 키워드에 맞는 색상 표시
    const { key_colors } = knowledgeBase.iri_colors[groupKey];
    const colorContainer = document.getElementById('color-selection');
    colorContainer.innerHTML = '';

    key_colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.onclick = () => selectColor(color);
        colorContainer.appendChild(swatch);
    });
    
    document.getElementById('color-selection-wrapper').style.display = 'block';
    updateAIMessage(`'${keyword}' 키워드에 어울리는 대표 색상들입니다. 마음에 드는 주조 색상을 선택해주세요.`);
}

// 주조 색상 선택 처리
function selectColor(color) {
    appState.primaryColor = color;
    
    // 선택된 색상 하이라이트
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.style.backgroundColor.toLowerCase() === color.toLowerCase());
    });
    
    document.getElementById('generate-btn').classList.remove('hidden');
    updateAIMessage("좋습니다! 이제 버튼을 눌러 AI 컬러시스템을 생성하세요.");
}

// AI 가이드 생성 (Color System만)
async function generateGuide() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> AI 가이드 생성 중...';

    try {
        console.log('🔍 AI 가이드 생성 API 호출...');
        
        // Netlify 함수 호출
        const response = await fetch('/.netlify/functions/generate-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: appState,
                knowledgeBase: knowledgeBase
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI 서버 오류 (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ AI 가이드 생성 성공:', data);
        displayGeneratedGuide(data);

    } catch (error) {
        console.error('❌ AI 가이드 생성 실패:', error);
        alert('AI 서버 연결에 실패했습니다.\n\n에러: ' + error.message + '\n\n해결 방법:\n1. Netlify Functions 배포 확인\n2. OPENAI_API_KEY 환경변수 확인\n3. 브라우저 콘솔(F12)에서 상세 로그 확인');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'AI 가이드 생성하기';
        btn.classList.add('hidden');
    }
}

// 생성된 가이드 표시 (Color System만)
function displayGeneratedGuide(data) {
    // appState에 결과 저장 (다른 탭으로 전달용)
    appState.generatedResult = {
        bgColor: data.colorSystem.primary.main,
        textColor: data.accessibility.textColorOnPrimary,
        colorSystem: data.colorSystem
    };

    // Color System 표시
    for (const type of ['primary', 'secondary']) {
        for (const shade of ['main', 'light', 'dark']) {
            const element = document.getElementById(`${type}-${shade}`);
            const color = data.colorSystem[type][shade];
            element.style.background = color;
            element.querySelector('.color-code').textContent = color;
            element.style.color = getContrastingTextColor(color);
        }
    }

    document.getElementById('ai-report').style.display = 'block';
    document.getElementById('guidelines').style.display = 'grid';
    updateAIMessage(`${appState.platform} 플랫폼에 최적화된 컬러시스템이 생성되었습니다!`);
}

// ============================================
// 유니버설 컬러시스템 페이지 (두 번째 탭)
// - 명도 대비 테스트 및 색약자 시뮬레이터
// ============================================

function initializeLabPage() {
    // 입력 필드 이벤트 리스너
    const inputs = ['bg-color-input', 'text-color-input', 'line-height-input', 'font-size-input-pt'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateLab);
        }
    });
    
    // 색상 피커 이벤트 리스너
    document.getElementById('bg-color-picker').addEventListener('input', (e) => {
        document.getElementById('bg-color-input').value = e.target.value;
        updateLab();
    });
    document.getElementById('text-color-picker').addEventListener('input', (e) => {
        document.getElementById('text-color-input').value = e.target.value;
        updateLab();
    });

    // AI 텍스트 색상 추천 버튼
    document.getElementById('ai-text-color-btn').addEventListener('click', async () => {
        const btn = document.getElementById('ai-text-color-btn');
        const originalText = btn.textContent;
        
        try {
            btn.textContent = '⏳ AI 분석 중...';
            btn.disabled = true;
            
            const bgColor = document.getElementById('bg-color-input').value;
            console.log('🎨 AI 텍스트 색상 추천 요청 - 배경색:', bgColor);
            
            const aiRecommendation = await getAITextColorRecommendation(bgColor);
            console.log('✅ AI 추천 완료:', aiRecommendation);
            
            // 추천된 텍스트 색상 적용
            document.getElementById('text-color-input').value = aiRecommendation.textColor;
            document.getElementById('text-color-picker').value = aiRecommendation.textColor;
            
            // AI 추천 결과 표시 (헥사코드 명확하게)
            const aiRecommendationDiv = document.getElementById('ai-recommendation');
            const aiTextColorCode = document.getElementById('ai-text-color');
            const aiReasoningSpan = document.getElementById('ai-reasoning');
            
            aiTextColorCode.textContent = aiRecommendation.textColor.toUpperCase();
            aiTextColorCode.style.color = aiRecommendation.textColor;
            aiReasoningSpan.textContent = aiRecommendation.reasoning || '접근성 기준을 만족하는 색상입니다.';
            aiRecommendationDiv.style.display = 'block';
            
            // 화면 업데이트
            updateLab();
            
            btn.textContent = '✅ 추천 완료!';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('❌ AI 텍스트 색상 추천 실패:', error);
            alert('AI 추천 중 오류가 발생했습니다.\n' + error.message);
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    updateLab(); // 초기 로딩
}

// 유니버설 컬러시스템 실시간 업데이트
function updateLab() {
    const bgColor = document.getElementById('bg-color-input').value;
    const textColor = document.getElementById('text-color-input').value;
    const lineHeight = document.getElementById('line-height-input').value;
    
    // appState에 현재 색상 저장 (AI 리포트로 전달용)
    appState.labColors = { bgColor, textColor };
    
    // 명도 대비 계산 및 표시
    const ratio = calculateContrast(bgColor, textColor);
    document.getElementById('contrast-ratio').textContent = ratio.toFixed(2) + ' : 1';
    
    // WCAG 등급 평가
    const aaPass = ratio >= 4.5;
    const aaaPass = ratio >= 7;
    document.getElementById('aa-status').classList.toggle('pass', aaPass);
    document.getElementById('aa-status').classList.toggle('fail', !aaPass);
    document.getElementById('aaa-status').classList.toggle('pass', aaaPass);
    document.getElementById('aaa-status').classList.toggle('fail', !aaaPass);

    // 미리보기 업데이트
    const preview = document.getElementById('text-preview');
    preview.style.backgroundColor = bgColor;
    preview.style.color = textColor;
    preview.style.lineHeight = lineHeight;
    document.getElementById('line-height-value').textContent = lineHeight;

    // 플랫폼별 폰트 단위 변환 (pt 기준)
    const fontSizePt = parseFloat(document.getElementById('font-size-input-pt').value) || 12;
    const fontSizePx = fontSizePt * 1.333; // pt to px 변환
    document.getElementById('px-example').textContent = fontSizePx.toFixed(1) + 'px';
    document.getElementById('rem-example').textContent = (fontSizePx / 16).toFixed(2) + 'rem';
    document.getElementById('sp-example').textContent = Math.round(fontSizePx) + 'sp';

    // 색약자 시뮬레이터 업데이트
    updateSimulator(bgColor, textColor);
}

// 색약자 시뮬레이터 업데이트
function updateSimulator(bgColor, textColor) {
    // 색상을 적록색약 시뮬레이션으로 변환
    const simBg = daltonizeColor(bgColor);
    const simText = daltonizeColor(textColor);

    // 일반 시각 표시
    updatePaletteItem(document.getElementById('origBg'), bgColor, "주조색상");
    updatePaletteItem(document.getElementById('origText'), textColor, "보조색상");
    
    // 적록색약 시각 표시
    updatePaletteItem(document.getElementById('simBg'), simBg, "주조색상");
    updatePaletteItem(document.getElementById('simText'), simText, "보조색상");

    // 명도 대비 계산
    const origRatio = calculateContrast(bgColor, textColor);
    const simRatio = calculateContrast(simBg, simText);
    
    // AI 솔루션 텍스트 생성
    const getStatusText = (ratio, type) => {
        let grade = (ratio >= 7) ? 'AAA등급 충족' : (ratio >= 4.5) ? 'AA등급 충족' : '기준 미달';
        return (ratio >= 4.5) ?
            `<p style="color:#2e7d32;">✅ 양호: ${type}, 명도대비율 <strong>${ratio.toFixed(2)}:1</strong>, ${grade}입니다.</p>` :
            `<p style="color:#d32f2f;">⚠️ 주의: ${type}, 명도대비율 <strong>${ratio.toFixed(2)}:1</strong>로 낮아져 구분이 어려울 수 있습니다.</p>`;
    };
    
    let solutionHTML = getStatusText(origRatio, '일반 시각') + getStatusText(simRatio, '적록색약 시각');
    
    if (simRatio < 4.5) {
        solutionHTML += `<p style="margin-top:10px; font-size: 14px;">명도 차이를 더 확보하거나, 색상 외 다른 시각적 단서(아이콘, 굵기 등) 사용을 권장합니다.</p>`;
    }
    
    document.getElementById('solution-text').innerHTML = solutionHTML;

    // 명도 대비 예시 박스 업데이트
    const origExampleBox = document.getElementById('orig-contrast-example');
    let origExampleGrade = (origRatio >= 7) ? ' AAA' : (origRatio >= 4.5) ? ' AA' : '';
    origExampleBox.style.backgroundColor = bgColor;
    origExampleBox.style.color = textColor;
    origExampleBox.querySelector('.ratio-display').textContent = `${origRatio.toFixed(2)}:1${origExampleGrade}`;

    const simExampleBox = document.getElementById('sim-contrast-example');
    simExampleBox.style.backgroundColor = simBg;
    simExampleBox.style.color = simText;
    simExampleBox.querySelector('.ratio-display').textContent = `${simRatio.toFixed(2)}:1`;
}

// 팔레트 아이템 업데이트
function updatePaletteItem(element, color, label) {
    element.style.background = color;
    element.querySelector('.hex-code-sim').textContent = color;
    element.querySelector('.palette-label').textContent = label;
    element.style.color = getContrastingTextColor(color);
}

// 메인 페이지에서 데이터 받아오기
function updateLabPageWithData(bgColor, textColor) {
    document.getElementById('bg-color-input').value = bgColor;
    document.getElementById('bg-color-picker').value = bgColor;
    document.getElementById('text-color-input').value = textColor;
    document.getElementById('text-color-picker').value = textColor;
    updateLab();
}

// ============================================
// AI 디자인 리포트 페이지 (세 번째 탭)
// ============================================

function initializeReportPage() {
    // 코드 탭 전환
    document.querySelectorAll('.export-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.export-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentCodeTab = e.target.dataset.tab;
            if (reportData) {
                updateCodeOutput(reportData);
            }
        });
    });

    // 코드 복사 버튼
    document.getElementById('copy-code-btn').addEventListener('click', () => {
        const code = document.getElementById('code-output').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copy-code-btn');
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Copy to Clipboard';
                btn.classList.remove('copied');
            }, 2000);
        });
    });
}

// AI 리포트 생성
async function generateAIReport() {
    document.getElementById('report-loading').style.display = 'block';
    document.getElementById('report-content').style.display = 'none';

    try {
        // AI 처리 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));

        const data = await generateCompleteDesignSystem();
        reportData = data;

        // 각 섹션 렌더링
        renderFontPairing(data.fonts);
        renderTypographyReport(data);
        renderColorSystem(data.colors);
        renderUniversalColorSystem(data);
        renderComponents(data);
        updateCodeOutput(data);

        document.getElementById('report-loading').style.display = 'none';
        document.getElementById('report-content').style.display = 'block';
    } catch (error) {
        document.getElementById('report-loading').style.display = 'none';
        console.error('❌ AI 리포트 생성 실패:', error);
        alert('AI 서버 연결에 실패했습니다.\n\n에러: ' + error.message + '\n\n해결 방법:\n1. Netlify Functions가 제대로 배포되었는지 확인\n2. OPENAI_API_KEY 환경변수 확인\n3. 브라우저 콘솔(F12)에서 상세 에러 확인');
    }
}

// 완전한 디자인 시스템 생성
async function generateCompleteDesignSystem() {
    const primary = appState.primaryColor || appState.labColors.bgColor;
    const secondary = getComplementaryColor(primary);

    // AI 폰트 추천 (필수 - 실패 시 에러)
    console.log('🔍 AI 폰트 추천 요청 시작...');
    const fonts = await getAIFontRecommendation(appState.service, appState.keyword, appState.platform, appState.mood);
    console.log('✅ AI 폰트 추천 완료:', fonts);
    
    // Google Fonts 동적 로드
    await loadGoogleFonts([fonts.heading, fonts.body, fonts.korean]);

    // 완전한 색상 팔레트 생성 (50-900)
    const colors = {
        primary: generateColorShades(primary),
        secondary: generateColorShades(secondary)
    };

    return {
        fonts,
        colors,
        service: appState.service,
        platform: appState.platform,
        keyword: appState.keyword,
        labColors: appState.labColors
    };
}

// AI 폰트 추천 API 호출
async function getAIFontRecommendation(service, keyword, platform, mood) {
    console.log('🔍 AI 폰트 추천 API 호출 시작');
    console.log('요청 데이터:', { service, keyword, platform, mood });
    
    try {
        const response = await fetch('/.netlify/functions/get-font-recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service: service,
                keyword: keyword,
                platform: platform,
                mood: mood
            })
        });

        console.log('API 응답 상태:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 오류 응답:', errorText);
            throw new Error(`AI 서버 응답 오류 (${response.status}): Netlify Functions가 제대로 배포되지 않았을 수 있습니다.`);
        }

        const data = await response.json();
        console.log('✅ AI 폰트 추천 성공:', data);
        return data;
    } catch (error) {
        console.error('❌ AI 폰트 추천 실패:', error.message);
        throw error;
    }
}

// AI 텍스트 색상 추천 API 호출
async function getAITextColorRecommendation(backgroundColor) {
    console.log('🎨 AI 텍스트 색상 추천 API 호출 시작');
    console.log('배경색:', backgroundColor);
    
    try {
        const response = await fetch('/.netlify/functions/get-text-color-recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                backgroundColor: backgroundColor
            })
        });

        console.log('API 응답 상태:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 오류 응답:', errorText);
            throw new Error(`AI 서버 응답 오류 (${response.status})`);
        }

        const data = await response.json();
        console.log('✅ AI 텍스트 색상 추천 성공:', data);
        return data;
    } catch (error) {
        console.error('❌ AI 텍스트 색상 추천 실패:', error.message);
        // 실패 시 기존 방식으로 폴백
        return {
            textColor: getContrastingTextColor(backgroundColor),
            reasoning: '기본 명도 대비 계산을 사용했습니다.'
        };
    }
}

// Google Fonts 동적 로드
async function loadGoogleFonts(fontNames) {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontNames.map(f => f.replace(/ /g, '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    await new Promise(resolve => setTimeout(resolve, 500));
}

// 색상 Shades 생성 (50-900)
function generateColorShades(baseColor) {
    const shades = {};
    const percentages = [90, 70, 50, 30, 10, 0, -15, -30, -45];
    const labels = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
    
    percentages.forEach((percent, i) => {
        if (percent >= 0) {
            shades[labels[i]] = lightenColor(baseColor, percent);
        } else {
            shades[labels[i]] = darkenColor(baseColor, Math.abs(percent));
        }
    });
    
    return shades;
}

// 폰트 페어링 렌더링 (한글 포함)
function renderFontPairing(fonts) {
    const headingPreview = document.getElementById('heading-font-preview');
    const bodyPreview = document.getElementById('body-font-preview');
    const koreanPreview = document.getElementById('korean-font-preview');
    
    headingPreview.style.fontFamily = `'${fonts.heading}', serif`;
    headingPreview.textContent = 'Preview of Heading font';
    
    bodyPreview.style.fontFamily = `'${fonts.body}', sans-serif`;
    bodyPreview.textContent = 'Preview of Body font';
    
    koreanPreview.style.fontFamily = `'${fonts.korean}', sans-serif`;
    koreanPreview.textContent = '한글폰트 미리보기';
    
    document.getElementById('heading-font-name').textContent = fonts.heading;
    document.getElementById('body-font-name').textContent = fonts.body;
    document.getElementById('korean-font-name').textContent = fonts.korean;
    
    document.getElementById('heading-font-link').href = `https://fonts.google.com/specimen/${fonts.heading.replace(/ /g, '+')}`;
    document.getElementById('body-font-link').href = `https://fonts.google.com/specimen/${fonts.body.replace(/ /g, '+')}`;
    document.getElementById('korean-font-link').href = `https://fonts.google.com/specimen/${fonts.korean.replace(/ /g, '+')}`;
    
    document.getElementById('font-reasoning').textContent = fonts.reasoning;
}

// Typography 리포트 렌더링 (메인에서 이동)
function renderTypographyReport(data) {
    const platformGuide = knowledgeBase.guidelines[appState.platform.toLowerCase()] || knowledgeBase.guidelines.web;
    const primaryColor = data.colors.primary['500'];
    const textColor = getContrastingTextColor(primaryColor);
    const contrastRatio = calculateContrast(primaryColor, textColor).toFixed(2);
    
    document.getElementById('contrast-description-report').innerHTML = 
        `Primary 색상을 배경으로 사용할 경우, WCAG AA 기준을 충족하는 텍스트 색상은 <strong>${textColor}</strong> 이며, 대비는 <strong>${contrastRatio}:1</strong>입니다.`;
    
    document.getElementById('font-size-description-report').innerHTML = 
        `<p><strong>(제목)</strong> ${platformGuide.typeScale.largeTitle || platformGuide.typeScale.headline} / <strong>(본문)</strong> ${platformGuide.typeScale.body}</p><p style="font-size: 13px; color: #555;">${platformGuide.description}</p>`;
}

// 색상 시스템 렌더링
function renderColorSystem(colors) {
    const primaryContainer = document.getElementById('primary-shades');
    const secondaryContainer = document.getElementById('secondary-shades');
    
    primaryContainer.innerHTML = '';
    secondaryContainer.innerHTML = '';
    
    Object.entries(colors.primary).forEach(([shade, color]) => {
        const box = createShadeBox(shade, color);
        primaryContainer.appendChild(box);
    });
    
    Object.entries(colors.secondary).forEach(([shade, color]) => {
        const box = createShadeBox(shade, color);
        secondaryContainer.appendChild(box);
    });

    // 색상 사용 가이드
    const usageList = document.getElementById('color-usage-list');
    usageList.innerHTML = `
        <li><strong>Primary-500:</strong> 버튼, 링크, 주요 액션</li>
        <li><strong>Primary-100:</strong> 배경, 카드, 서브섹션</li>
        <li><strong>Primary-700:</strong> 호버 상태, 강조 텍스트</li>
        <li><strong>Secondary-500:</strong> 보조 버튼, 아이콘</li>
        <li><strong>Secondary-300:</strong> 테두리, 구분선</li>
    `;
}

function createShadeBox(shade, color) {
    const box = document.createElement('div');
    box.className = 'shade-box';
    box.style.backgroundColor = color;
    box.style.color = getContrastingTextColor(color);
    box.innerHTML = `
        <span class="shade-label">${shade}</span>
        <span class="shade-hex">${color}</span>
    `;
    return box;
}

// NEW: 유니버설 컬러시스템 최적화 렌더링
function renderUniversalColorSystem(data) {
    const { bgColor, textColor } = appState.labColors;
    
    // 일반 시각 최적화
    const normalBgOptimal = bgColor;
    const normalTextOptimal = textColor;
    const normalRatio = calculateContrast(normalBgOptimal, normalTextOptimal);
    
    // 일반 시각 표시
    const normalBgBox = document.getElementById('normal-bg-optimal');
    normalBgBox.style.backgroundColor = normalBgOptimal;
    normalBgBox.style.color = getContrastingTextColor(normalBgOptimal);
    normalBgBox.querySelector('.optimal-hex').textContent = normalBgOptimal;
    
    const normalTextBox = document.getElementById('normal-text-optimal');
    normalTextBox.style.backgroundColor = normalTextOptimal;
    normalTextBox.style.color = getContrastingTextColor(normalTextOptimal);
    normalTextBox.querySelector('.optimal-hex').textContent = normalTextOptimal;
    
    const normalPreview = document.getElementById('normal-preview');
    normalPreview.style.backgroundColor = normalBgOptimal;
    normalPreview.style.color = normalTextOptimal;
    normalPreview.querySelector('.optimal-ratio').textContent = `${normalRatio.toFixed(2)}:1`;
    
    // 색각 이상자 시각 최적화
    const colorblindBgOptimal = optimizeForColorblind(bgColor);
    const colorblindTextOptimal = optimizeForColorblind(textColor);
    const colorblindRatio = calculateContrast(colorblindBgOptimal, colorblindTextOptimal);
    
    // 색각 이상자 시각 표시
    const colorblindBgBox = document.getElementById('colorblind-bg-optimal');
    colorblindBgBox.style.backgroundColor = colorblindBgOptimal;
    colorblindBgBox.style.color = getContrastingTextColor(colorblindBgOptimal);
    colorblindBgBox.querySelector('.optimal-hex').textContent = colorblindBgOptimal;
    
    const colorblindTextBox = document.getElementById('colorblind-text-optimal');
    colorblindTextBox.style.backgroundColor = colorblindTextOptimal;
    colorblindTextBox.style.color = getContrastingTextColor(colorblindTextOptimal);
    colorblindTextBox.querySelector('.optimal-hex').textContent = colorblindTextOptimal;
    
    const colorblindPreview = document.getElementById('colorblind-preview');
    colorblindPreview.style.backgroundColor = colorblindBgOptimal;
    colorblindPreview.style.color = colorblindTextOptimal;
    colorblindPreview.querySelector('.optimal-ratio').textContent = `${colorblindRatio.toFixed(2)}:1`;
    
    // AI 추천 이유
    let reasoning = `일반 시각에서는 명도 대비 ${normalRatio.toFixed(2)}:1로 `;
    reasoning += normalRatio >= 7 ? 'AAA 등급을 충족합니다. ' : normalRatio >= 4.5 ? 'AA 등급을 충족합니다. ' : '개선이 필요합니다. ';
    reasoning += `적록색약 시각에서는 명도 대비 ${colorblindRatio.toFixed(2)}:1로 `;
    reasoning += colorblindRatio >= 4.5 ? '충분한 구분이 가능합니다.' : '색상 외 추가 시각적 단서를 권장합니다.';
    
    document.getElementById('universal-reasoning').textContent = reasoning;
}

// 색각 이상자를 위한 색상 최적화 (명도 차이 강화)
function optimizeForColorblind(color) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    
    const luminance = getLuminance(color);
    
    // 명도가 낮으면 더 어둡게, 높으면 더 밝게 조정
    if (luminance < 0.5) {
        return darkenColor(color, 10);
    } else {
        return lightenColor(color, 10);
    }
}

// 컴포넌트 프리뷰 렌더링
function renderComponents(data) {
    const showcase = document.getElementById('component-showcase');
    showcase.innerHTML = '';

    // 버튼 컴포넌트 (유니버설 컬러 시스템 버전 추가 + 아웃라인 호버 효과)
    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'component-item';
    buttonsSection.innerHTML = `
        <div class="component-label">Buttons</div>
        <div class="demo-buttons">
            <button class="demo-btn" style="background: ${data.colors.primary['500']}; color: ${getContrastingTextColor(data.colors.primary['500'])}; font-family: '${data.fonts.body}', sans-serif;">Primary Button</button>
            <button class="demo-btn" style="background: ${data.colors.secondary['500']}; color: ${getContrastingTextColor(data.colors.secondary['500'])}; font-family: '${data.fonts.body}', sans-serif;">Secondary Button</button>
            <button class="demo-btn demo-btn-outline" style="background: transparent; border: 2px solid ${data.colors.primary['500']}; color: ${data.colors.primary['500']}; font-family: '${data.fonts.body}', sans-serif;" data-primary="${data.colors.primary['500']}" data-secondary="${data.colors.secondary['500']}">Outline Button</button>
        </div>
        <div style="margin-top: 20px;">
            <div style="font-size: 13px; color: #666; margin-bottom: 10px; font-weight: 600;">유니버설 컬러 시스템 적용 버전</div>
            <div class="demo-buttons">
                <button class="demo-btn" style="background: ${data.labColors.bgColor}; color: ${data.labColors.textColor}; font-family: '${data.fonts.body}', sans-serif;">Universal Primary</button>
                <button class="demo-btn" style="background: ${optimizeForColorblind(data.labColors.bgColor)}; color: ${optimizeForColorblind(data.labColors.textColor)}; font-family: '${data.fonts.body}', sans-serif;">Universal Secondary</button>
            </div>
        </div>
    `;
    showcase.appendChild(buttonsSection);
    
    // 아웃라인 버튼 호버 효과
    setTimeout(() => {
        document.querySelectorAll('.demo-btn-outline').forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.background = this.dataset.primary;
                this.style.color = 'white';
                this.style.borderColor = this.dataset.primary;
            });
            btn.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
                this.style.color = this.dataset.primary;
                this.style.borderColor = this.dataset.primary;
            });
        });
    }, 100);

    // 카드 컴포넌트 (2단 그리드, 한글 본문, 호버 효과)
    const cardSection = document.createElement('div');
    cardSection.className = 'component-item';
    cardSection.innerHTML = `
        <div class="component-label">Card Component</div>
        <div class="demo-card-grid">
            <div class="demo-card demo-card-hover" style="border-left: 4px solid ${data.colors.primary['500']}; font-family: '${data.fonts.korean}', sans-serif;">
                <h4 style="font-family: '${data.fonts.heading}', serif; color: ${data.colors.primary['700']};">Premium Design</h4>
                <p>프리미엄 디자인 시스템을 적용한 카드 컴포넌트입니다. 제품 소개, 서비스 설명, 또는 주요 기능을 강조하는데 활용할 수 있습니다.</p>
            </div>
            <div class="demo-card demo-card-hover-secondary" style="border-left: 4px solid ${data.colors.secondary['500']}; font-family: '${data.fonts.korean}', sans-serif;">
                <h4 style="font-family: '${data.fonts.heading}', serif; color: ${data.colors.secondary['700']};">Secondary Card</h4>
                <p>보조 색상을 활용한 카드 디자인으로, 주조 색상과 조화를 이루며 계층 구조를 명확하게 전달합니다. 서브 콘텐츠에 적합합니다.</p>
            </div>
        </div>
    `;
    showcase.appendChild(cardSection);

    // 네비게이션 바 (라이트모드 + 다크모드)
    const navSection = document.createElement('div');
    navSection.className = 'component-item';
    navSection.innerHTML = `
        <div class="component-label">Navigation Bar - Light Mode</div>
        <div class="demo-navbar" style="font-family: '${data.fonts.korean}', sans-serif; background: white;">
            <div class="demo-nav-logo" style="color: ${data.colors.primary['500']}; font-family: '${data.fonts.heading}', serif;">Brand</div>
            <div class="demo-nav-links">
                <a href="#" style="color: ${data.colors.primary['700']}; font-family: '${data.fonts.korean}', sans-serif;">홈</a>
                <a href="#" style="color: ${data.colors.primary['700']}; font-family: '${data.fonts.korean}', sans-serif;">서비스 소개</a>
                <a href="#" style="color: ${data.colors.primary['700']}; font-family: '${data.fonts.korean}', sans-serif;">핵심기능</a>
                <a href="#" style="color: ${data.colors.primary['700']}; font-family: '${data.fonts.korean}', sans-serif;">포트폴리오</a>
                <a href="#" style="color: ${data.colors.primary['700']}; font-family: '${data.fonts.korean}', sans-serif;">Q&A</a>
            </div>
        </div>
        
        <div class="component-label" style="margin-top: 25px;">Navigation Bar - Dark Mode</div>
        <div class="demo-navbar demo-navbar-dark" style="font-family: '${data.fonts.korean}', sans-serif; background: #1a1a1a;">
            <div class="demo-nav-logo" style="color: ${data.colors.primary['300']}; font-family: '${data.fonts.heading}', serif;">Brand</div>
            <div class="demo-nav-links">
                <a href="#" style="color: #e0e0e0; font-family: '${data.fonts.korean}', sans-serif;">홈</a>
                <a href="#" style="color: #e0e0e0; font-family: '${data.fonts.korean}', sans-serif;">서비스 소개</a>
                <a href="#" style="color: #e0e0e0; font-family: '${data.fonts.korean}', sans-serif;">핵심기능</a>
                <a href="#" style="color: #e0e0e0; font-family: '${data.fonts.korean}', sans-serif;">포트폴리오</a>
                <a href="#" style="color: #e0e0e0; font-family: '${data.fonts.korean}', sans-serif;">Q&A</a>
            </div>
        </div>
    `;
    showcase.appendChild(navSection);
}

// 코드 출력 업데이트
function updateCodeOutput(data) {
    let code = '';
    
    if (currentCodeTab === 'css') {
        code = generateCSSVariables(data);
    } else if (currentCodeTab === 'tailwind') {
        code = generateTailwindConfig(data);
    } else if (currentCodeTab === 'scss') {
        code = generateSCSSVariables(data);
    }
    
    document.getElementById('code-output').textContent = code;
}

// CSS Variables 생성
function generateCSSVariables(data) {
    let css = ':root {\n';
    css += '  /* Primary Colors */\n';
    Object.entries(data.colors.primary).forEach(([shade, color]) => {
        css += `  --primary-${shade}: ${color};\n`;
    });
    css += '\n  /* Secondary Colors */\n';
    Object.entries(data.colors.secondary).forEach(([shade, color]) => {
        css += `  --secondary-${shade}: ${color};\n`;
    });
    css += '\n  /* Typography */\n';
    css += `  --font-heading: '${data.fonts.heading}', serif;\n`;
    css += `  --font-body: '${data.fonts.body}', sans-serif;\n`;
    css += `  --font-korean: '${data.fonts.korean}', sans-serif;\n`;
    css += '}\n\n';
    css += '/* Usage Example */\n';
    css += '.button-primary {\n';
    css += '  background: var(--primary-500);\n';
    css += '  color: white;\n';
    css += '  font-family: var(--font-body);\n';
    css += '}';
    return css;
}

// Tailwind Config 생성
function generateTailwindConfig(data) {
    let config = 'module.exports = {\n';
    config += '  theme: {\n';
    config += '    extend: {\n';
    config += '      colors: {\n';
    config += '        primary: {\n';
    Object.entries(data.colors.primary).forEach(([shade, color]) => {
        config += `          ${shade}: '${color}',\n`;
    });
    config += '        },\n';
    config += '        secondary: {\n';
    Object.entries(data.colors.secondary).forEach(([shade, color]) => {
        config += `          ${shade}: '${color}',\n`;
    });
    config += '        },\n';
    config += '      },\n';
    config += '      fontFamily: {\n';
    config += `        heading: ['${data.fonts.heading}', 'serif'],\n`;
    config += `        body: ['${data.fonts.body}', 'sans-serif'],\n`;
    config += `        korean: ['${data.fonts.korean}', 'sans-serif'],\n`;
    config += '      },\n';
    config += '    },\n';
    config += '  },\n';
    config += '}';
    return config;
}

// SCSS Variables 생성
function generateSCSSVariables(data) {
    let scss = '// Primary Colors\n';
    Object.entries(data.colors.primary).forEach(([shade, color]) => {
        scss += `$primary-${shade}: ${color};\n`;
    });
    scss += '\n// Secondary Colors\n';
    Object.entries(data.colors.secondary).forEach(([shade, color]) => {
        scss += `$secondary-${shade}: ${color};\n`;
    });
    scss += '\n// Typography\n';
    scss += `$font-heading: '${data.fonts.heading}', serif;\n`;
    scss += `$font-body: '${data.fonts.body}', sans-serif;\n`;
    scss += `$font-korean: '${data.fonts.korean}', sans-serif;\n\n`;
    scss += '// Usage Example\n';
    scss += '.button-primary {\n';
    scss += '  background: $primary-500;\n';
    scss += '  color: white;\n';
    scss += '  font-family: $font-body;\n';
    scss += '}';
    return scss;
}

// renderAccessibilityAnalysis 함수 삭제됨

// 색각 이상자 접근성 체크
function checkColorBlindFriendly(color1, color2) {
    const daltonized1 = daltonizeColor(color1);
    const daltonized2 = daltonizeColor(color2);
    return calculateContrast(daltonized1, daltonized2);
}

// ============================================
// PDF 다운로드 함수 (개선된 버전)
// ============================================

async function downloadReportAsPDF() {
    const btn = document.getElementById('download-report-btn');
    if (!btn) {
        alert('다운로드 버튼을 찾을 수 없습니다.');
        return;
    }
    
    const originalText = btn.textContent;
    
    try {
        btn.textContent = '⏳ PDF 생성 중...';
        btn.disabled = true;

        if (!reportData) {
            alert('리포트 데이터가 없습니다.\n먼저 1번 탭에서 "AI 가이드 생성하기"를 실행해주세요.');
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        const reportContent = document.getElementById('report-content');
        
        if (!reportContent || reportContent.style.display === 'none') {
            alert('리포트가 생성되지 않았습니다.\n"AI 디자인 리포트" 탭으로 이동해주세요.');
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        // 렌더링 대기
        await new Promise(resolve => setTimeout(resolve, 500));

        // 실제 콘텐츠 너비 측정
        const actualWidth = Math.max(reportContent.scrollWidth, reportContent.offsetWidth, 1600);
        console.log('Content width:', reportContent.scrollWidth, reportContent.offsetWidth, 'Using:', actualWidth);

        // html2canvas로 고해상도 이미지 생성
        const canvas = await html2canvas(reportContent, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: actualWidth,
            width: actualWidth,
            height: reportContent.scrollHeight,
            scrollX: 0,
            scrollY: -window.scrollY,
            x: 0,
            y: 0
        });

        console.log('Canvas size:', canvas.width, 'x', canvas.height);

        // 이미지를 데이터 URL로 변환
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // jsPDF 객체 생성 - 콘텐츠 높이에 맞춘 커스텀 페이지 크기
        const { jsPDF } = window.jspdf;
        
        // A4 너비 고정, 높이는 콘텐츠에 맞춤
        const pageWidth = 210; // A4 너비 (mm)
        const margin = 5;
        const contentWidth = pageWidth - (margin * 2); // 200mm
        
        // 콘텐츠 비율에 맞춘 페이지 높이 계산
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        const pageHeight = imgHeight + (margin * 2);
        
        console.log('PDF size:', pageWidth, 'x', pageHeight, 'mm');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageWidth, pageHeight],
            compress: true
        });

        // 전체 이미지를 한 페이지에 추가
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight);

        console.log('Single page PDF created');

        // 파일명 생성
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `UNIVASSIST_Design_Report_${dateStr}.pdf`;

        // PDF 저장
        pdf.save(filename);

        btn.textContent = '✅ PDF 다운로드 완료!';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('PDF 다운로드 오류:', error);
        alert('PDF 파일 생성 중 오류가 발생했습니다.\n\n' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// JSON 다운로드 함수 추가
function downloadReportAsJSON() {
    if (!reportData) {
        alert('리포트 데이터가 없습니다.\n먼저 1번 탭에서 "AI 가이드 생성하기"를 실행해주세요.');
        return;
    }

    // JSON 구조 생성
    const exportData = {
        metadata: {
            generated: new Date().toISOString(),
            service: reportData.service,
            platform: reportData.platform,
            keyword: reportData.keyword
        },
        fonts: {
            heading: reportData.fonts.heading,
            body: reportData.fonts.body,
            korean: reportData.fonts.korean,
            reasoning: reportData.fonts.reasoning || ''
        },
        colors: {
            primary: reportData.colors.primary,
            secondary: reportData.colors.secondary
        },
        accessibility: {
            primary500: reportData.colors.primary['500'],
            textColor: getContrastingTextColor(reportData.colors.primary['500']),
            contrastRatio: calculateContrast(
                reportData.colors.primary['500'], 
                getContrastingTextColor(reportData.colors.primary['500'])
            ).toFixed(2)
        }
    };

    // JSON 파일 다운로드
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UNIVASSIST_Design_Data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// DOCX 다운로드 함수 추가 (Netlify Function 사용)
async function downloadReportAsDOCX() {
    if (!reportData) {
        alert('리포트 데이터가 없습니다.\n먼저 1번 탭에서 "AI 가이드 생성하기"를 실행해주세요.');
        return;
    }

    try {
        // Netlify Function 호출
        const response = await fetch('/.netlify/functions/generate-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        if (!response.ok) {
            throw new Error('DOCX 생성 실패');
        }

        // DOCX 파일 다운로드
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UNIVASSIST_Design_Report_${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('DOCX 다운로드 오류:', error);
        alert('DOCX 파일 생성 중 오류가 발생했습니다.\n\n' + error.message);
    }
}

// ============================================
// AI 메시지 타이핑 효과
// ============================================

function updateAIMessage(message) {
    const el = document.getElementById('ai-message');
    clearTimeout(typingTimeout);
    let i = 0;
    el.innerHTML = '';
    
    function typeWriter() {
        if (i < message.length) {
            el.innerHTML = message.substring(0, i + 1) + '<span class="typing-cursor">|</span>';
            i++;
            typingTimeout = setTimeout(typeWriter, 25);
        } else {
            el.querySelector('.typing-cursor')?.remove();
        }
    }
    typeWriter();
}

// ============================================
// 색상 유틸리티 함수들
// ============================================

// 대조되는 텍스트 색상 반환 (검정/흰색)
function getContrastingTextColor(hex) {
    if (!hex || hex.length < 4) return '#000000';
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// 명도 대비 계산 (WCAG 기준)
function calculateContrast(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

// 휘도(Luminance) 계산
function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = Object.values(rgb).map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// HEX를 RGB로 변환
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) return null;
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// 적록색약 시뮬레이션 (Daltonize)
function daltonizeColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const { r, g, b } = rgb;
    const simR = 0.567 * r + 0.433 * g;
    const simG = 0.558 * r + 0.442 * g;
    const simB = 0.242 * g + 0.758 * b;
    const toHex = c => ('0' + Math.round(Math.min(255, c)).toString(16)).slice(-2);
    return `#${toHex(simR)}${toHex(simG)}${toHex(simB)}`;
}

// 색상 밝게 만들기
function lightenColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// 색상 어둡게 만들기
function darkenColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// 보색 계산
function getComplementaryColor(hex){
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max == min) { 
        h = s = 0; 
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    h = (h + 0.5) % 1;
    let r1, g1, b1;
    
    if (s == 0) { 
        r1 = g1 = b1 = l; 
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; 
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r1 = hue2rgb(p, q, h + 1/3);
        g1 = hue2rgb(p, q, h);
        b1 = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = x => ('0' + Math.round(x * 255).toString(16)).slice(-2);
    return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}