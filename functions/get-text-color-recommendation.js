const OpenAI = require('openai');

exports.handler = async (event) => {
    // CORS 헤더
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // POST 요청만 허용
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { backgroundColor } = JSON.parse(event.body);

        console.log('📥 AI 텍스트 색상 추천 요청:', { backgroundColor });

        // OpenAI API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
        }

        // OpenAI 클라이언트 초기화
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // AI에게 텍스트 색상 추천 요청
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `당신은 접근성을 고려한 색상 디자인 전문가입니다. 
배경색이 주어지면, WCAG AA 기준(명도 대비 4.5:1 이상)을 반드시 만족하는 텍스트 색상을 추천해주세요.

중요한 규칙:
1. 명도 대비는 반드시 4.5:1 이상이어야 합니다 (절대 3.84:1 같은 낮은 값은 안 됩니다)
2. 가능하면 7:1 이상(AAA 기준)을 목표로 하세요
3. 단순히 흰색/검정색만 추천하지 말고, 배경색과 조화를 이루면서도 명도 대비가 충분한 색상을 추천하세요
4. 일반 시각과 색각이상자 시각 모두에서 4.5:1 이상을 만족해야 합니다

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "textColor": "#RRGGBB",
  "contrastRatio": 7.5,
  "reasoning": "이 색상을 추천한 이유"
}`
                },
                {
                    role: "user",
                    content: `배경색: ${backgroundColor}

이 배경색에 가장 잘 어울리면서 명도 대비가 4.5:1 이상인 텍스트 색상을 추천해주세요.
명도 대비가 낮으면 절대 안 됩니다. 반드시 4.5:1 이상이어야 합니다.`
                }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        const responseText = completion.choices[0].message.content.trim();
        console.log('AI 원본 응답:', responseText);

        // JSON 파싱
        let aiResponse;
        try {
            // JSON 코드 블록 제거
            const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            aiResponse = JSON.parse(jsonText);
            
            // 명도 대비 검증
            const actualContrast = calculateContrast(backgroundColor, aiResponse.textColor);
            console.log('실제 명도 대비:', actualContrast.toFixed(2));
            
            if (actualContrast < 4.5) {
                console.warn('⚠️ AI가 낮은 명도 대비를 추천했습니다. 자동으로 수정합니다.');
                // 명도가 낮으면 강제로 흰색 또는 검정색 사용
                const bgLuminance = getLuminance(backgroundColor);
                aiResponse.textColor = bgLuminance > 0.5 ? '#000000' : '#FFFFFF';
                aiResponse.contrastRatio = calculateContrast(backgroundColor, aiResponse.textColor);
                aiResponse.reasoning = `배경색에 대해 명도 대비 ${aiResponse.contrastRatio.toFixed(2)}:1을 제공하는 ${aiResponse.textColor === '#000000' ? '검정색' : '흰색'}을 추천합니다. WCAG AA 기준을 만족합니다.`;
            }
            
        } catch (parseError) {
            console.error('JSON 파싱 실패:', parseError);
            // 파싱 실패 시 기본값 사용
            const bgLuminance = getLuminance(backgroundColor);
            aiResponse = {
                textColor: bgLuminance > 0.5 ? '#000000' : '#FFFFFF',
                contrastRatio: calculateContrast(backgroundColor, bgLuminance > 0.5 ? '#000000' : '#FFFFFF'),
                reasoning: 'AI 응답 파싱에 실패하여 기본 색상을 사용했습니다.'
            };
        }

        console.log('✅ AI 텍스트 색상 추천 성공:', aiResponse);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(aiResponse)
        };

    } catch (error) {
        console.error('❌ 텍스트 색상 추천 실패:', error);

        // 오류 시에도 안전한 기본값 반환
        const bgColor = event.body ? JSON.parse(event.body).backgroundColor : '#000000';
        const bgLuminance = getLuminance(bgColor);
        const safeTextColor = bgLuminance > 0.5 ? '#000000' : '#FFFFFF';
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                textColor: safeTextColor,
                contrastRatio: calculateContrast(bgColor, safeTextColor),
                reasoning: '안전한 기본 색상을 사용했습니다.'
            })
        };
    }
};

// 명도 대비 계산 함수
function calculateContrast(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}

// Luminance 계산 함수
function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}