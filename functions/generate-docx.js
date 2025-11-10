const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink } = require('docx');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const reportData = JSON.parse(event.body);

        // 타이포그래피 데이터 계산
        const primary500 = reportData.colors.primary['500'];
        const textColor = getContrastingTextColor(primary500);
        const contrastRatio = calculateContrast(primary500, textColor).toFixed(2);

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: "맑은 고딕", size: 22 }
                    }
                },
                paragraphStyles: [
                    {
                        id: "Title",
                        name: "Title",
                        basedOn: "Normal",
                        run: { size: 48, bold: true, color: "000000", font: "맑은 고딕" },
                        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER }
                    },
                    {
                        id: "Heading1",
                        name: "Heading 1",
                        basedOn: "Normal",
                        run: { size: 32, bold: true, color: "2563eb", font: "맑은 고딕" },
                        paragraph: { spacing: { before: 360, after: 120 }, numbering: { reference: "heading-numbering", level: 0 } }
                    }
                ]
            },
            numbering: {
                config: [
                    {
                        reference: "heading-numbering",
                        levels: [
                            {
                                level: 0,
                                format: "decimal",
                                text: "%1.",
                                alignment: AlignmentType.LEFT,
                                style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                            }
                        ]
                    }
                ]
            },
            sections: [{
                properties: {
                    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
                },
                children: [
                    // 제목
                    new Paragraph({
                        heading: HeadingLevel.TITLE,
                        children: [new TextRun("AI Design System Report")]
                    }),
                    
                    // 날짜
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        children: [new TextRun({
                            text: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
                            size: 22
                        })]
                    }),

                    // 1. AI 추천 구글 웹폰트 페어링
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: [new TextRun("AI 추천 구글 웹폰트 페어링")]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "제목, 헤더, 강조 텍스트", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [
                            new TextRun({ text: `${reportData.fonts.heading} - `, size: 22 }),
                            new ExternalHyperlink({
                                children: [new TextRun({ text: "Google Fonts 보기", style: "Hyperlink", color: "2563eb", underline: {} })],
                                link: `https://fonts.google.com/specimen/${reportData.fonts.heading.replace(/ /g, '+')}`
                            })
                        ]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "본문, 단락, 일반 텍스트", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [
                            new TextRun({ text: `${reportData.fonts.body} - `, size: 22 }),
                            new ExternalHyperlink({
                                children: [new TextRun({ text: "Google Fonts 보기", style: "Hyperlink", color: "2563eb", underline: {} })],
                                link: `https://fonts.google.com/specimen/${reportData.fonts.body.replace(/ /g, '+')}`
                            })
                        ]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "한글 제목 및 본문", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [
                            new TextRun({ text: `${reportData.fonts.korean} - `, size: 22 }),
                            new ExternalHyperlink({
                                children: [new TextRun({ text: "Google Fonts 보기", style: "Hyperlink", color: "2563eb", underline: {} })],
                                link: `https://fonts.google.com/specimen/${reportData.fonts.korean.replace(/ /g, '+')}`
                            })
                        ]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "AI 추천 이유", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 240 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: reportData.fonts.reasoning || '', size: 22 })]
                    }),

                    // 2. 접근성을 고려한 플랫폼별 타이포그래피 가이드
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: [new TextRun("접근성을 고려한 플랫폼별 타이포그래피 가이드")]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "명도 대비", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 240 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `${contrastRatio}:1 (WCAG AA 기준 ${parseFloat(contrastRatio) >= 4.5 ? '통과' : '개선 필요'})`, size: 22 })]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "사이즈", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `플랫폼: ${reportData.platform}`, size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 240 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `서비스 유형: ${reportData.service}`, size: 22 })]
                    }),

                    // 3. 주조색/보조색 컬러시스템
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: [new TextRun("주조색/보조색 컬러시스템 사용 가이드")]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "Primary Shades", bold: true })]
                    }),
                    ...Object.entries(reportData.colors.primary).map(([shade, hex]) =>
                        new Paragraph({
                            spacing: { after: 40 },
                            indent: { left: 360 },
                            children: [new TextRun({ text: `${shade}: ${hex}`, size: 22 })]
                        })
                    ),

                    new Paragraph({
                        spacing: { before: 240, after: 60 },
                        children: [new TextRun({ text: "Secondary Shades", bold: true })]
                    }),
                    ...Object.entries(reportData.colors.secondary).map(([shade, hex]) =>
                        new Paragraph({
                            spacing: { after: 40 },
                            indent: { left: 360 },
                            children: [new TextRun({ text: `${shade}: ${hex}`, size: 22 })]
                        })
                    ),

                    new Paragraph({
                        spacing: { before: 240, after: 60 },
                        children: [new TextRun({ text: "색상 사용 가이드", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: "• Primary 500: 주요 버튼, 링크, 강조 요소", size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: "• Primary 100-300: 배경, 카드, 연한 영역", size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: "• Primary 600-900: 호버 상태, 진한 텍스트", size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 240 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: "• Secondary: 보조 버튼, 액센트, 구분 요소", size: 22 })]
                    }),

                    // 4. 유니버설 컬러시스템
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: [new TextRun("유니버설 컬러시스템 최적화")]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "일반 시각 최적 조합", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `배경색: ${primary500}`, size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `텍스트색: ${textColor}`, size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 240 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `명도 대비: ${contrastRatio}:1`, size: 22 })]
                    }),

                    new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: "색각이상자 시각 최적 조합", bold: true })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `배경색: ${primary500}`, size: 22 })]
                    }),
                    new Paragraph({
                        spacing: { after: 60 },
                        indent: { left: 360 },
                        children: [new TextRun({ text: `텍스트색: ${textColor}`, size: 22 })]
                    }),
                    new Paragraph({
                        indent: { left: 360 },
                        children: [new TextRun({ text: `명도 대비: ${contrastRatio}:1`, size: 22 })]
                    })
                ]
            }]
        });

        // DOCX 버퍼 생성
        const buffer = await Packer.toBuffer(doc);

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': 'attachment; filename="AI_Design_Report.docx"'
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('DOCX 생성 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'DOCX 생성 실패', message: error.message })
        };
    }
};

// 유틸리티 함수
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    const [r, g, b] = Object.values(rgb).map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrast(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

function getContrastingTextColor(hex) {
    const rgb = hexToRgb(hex);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}