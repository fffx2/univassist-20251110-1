const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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
    const { context, knowledgeBase } = JSON.parse(event.body);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    
    const platformGuide = knowledgeBase.guidelines[context.platform.toLowerCase()] || knowledgeBase.guidelines.web;

    const systemPrompt = `You are a UI/UX design expert. Generate a color palette and typography guide.
    Platform: ${context.platform}
    Service: ${context.service}
    Mood: ${context.keyword}
    Primary Color: ${context.primaryColor}
    
    Guidelines: ${JSON.stringify(platformGuide)}
    
    Return JSON:
    - colorSystem: primary (main, light, dark) and secondary (main, light, dark)
    - typography: bodySize, headlineSize, lineHeight
    - accessibility: textColorOnPrimary, contrastRatio`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the design guide." }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('✅ AI Guide Success:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('❌ AI Guide Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AI 가이드 생성 실패',
        message: error.message
      })
    };
  }
};