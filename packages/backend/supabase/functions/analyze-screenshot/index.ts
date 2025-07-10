import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiAnalysisRequest {
  image_base64: string;
  screenshot_id: string;
}

interface GeminiAnalysisResponse {
  activity_type: string;
  confidence_score: number;
  description: string;
  tags: string[];
  learning_subject?: string;
  productivity_score: number;
  reasoning: string;
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-flash-lite-preview-06-17'
];

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyBCDH1WrB7ElqMZQk26PoJVVGVORXPfVrE';

async function analyzeWithGemini(imageBase64: string, modelIndex: number = 0): Promise<GeminiAnalysisResponse> {
  const model = GEMINI_MODELS[modelIndex];
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
  const prompt = `
请分析这张屏幕截图，识别用户当前正在进行的活动。请以JSON格式返回分析结果，包含以下字段：

{
  "activity_type": "学习活动类型",
  "confidence_score": 0.95,
  "description": "详细描述用户正在做什么",
  "tags": ["相关标签"],
  "learning_subject": "如果是学习活动，具体的学习科目",
  "productivity_score": 8,
  "reasoning": "分析推理过程"
}

活动类型分类标准：
- "learning": 学习活动（编程、阅读技术文档、在线课程、练习题等）
- "work": 工作活动（办公软件、邮件、会议、项目管理等）
- "entertainment": 娱乐活动（游戏、视频、音乐、社交媒体等）
- "social": 社交活动（聊天、社交网络、通讯软件等）
- "other": 其他活动

置信度评分（0-1）：表示对分类结果的确信程度
生产力评分（1-10）：1表示完全不生产，10表示高度生产

请确保返回的是有效的JSON格式。
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
    }
  };

  try {
    const response = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('Invalid Gemini API response format');
    }

    // 提取JSON内容
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const analysisResult = JSON.parse(jsonMatch[0]);
    
    // 验证和清理数据
    return {
      activity_type: analysisResult.activity_type || 'other',
      confidence_score: Math.min(Math.max(analysisResult.confidence_score || 0.5, 0), 1),
      description: analysisResult.description || '无法识别具体活动',
      tags: Array.isArray(analysisResult.tags) ? analysisResult.tags : [],
      learning_subject: analysisResult.learning_subject || undefined,
      productivity_score: Math.min(Math.max(Math.round(analysisResult.productivity_score || 5), 1), 10),
      reasoning: analysisResult.reasoning || '自动分析结果',
    };
  } catch (error) {
    console.error(`Model ${model} failed:`, error);
    
    // 如果还有其他模型可以尝试
    if (modelIndex < GEMINI_MODELS.length - 1) {
      console.log(`Trying next model: ${GEMINI_MODELS[modelIndex + 1]}`);
      return analyzeWithGemini(imageBase64, modelIndex + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 验证请求方法
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取请求数据
    const { image_base64, screenshot_id }: GeminiAnalysisRequest = await req.json();

    if (!image_base64 || !screenshot_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image_base64, screenshot_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 初始化Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 更新截图状态为分析中
    await supabase
      .from('screenshots')
      .update({ analysis_status: 'analyzing' })
      .eq('id', screenshot_id);

    console.log(`Starting analysis for screenshot ${screenshot_id}`);

    // 调用Gemini API进行分析
    const analysisResult = await analyzeWithGemini(image_base64);

    console.log(`Analysis completed for screenshot ${screenshot_id}:`, analysisResult);

    // 保存分析结果到数据库
    const { error: insertError } = await supabase
      .from('activity_analysis')
      .insert({
        screenshot_id,
        activity_type: analysisResult.activity_type,
        confidence_score: analysisResult.confidence_score,
        description: analysisResult.description,
        tags: analysisResult.tags,
        learning_subject: analysisResult.learning_subject,
        productivity_score: analysisResult.productivity_score,
        ai_model_used: GEMINI_MODELS[0], // 记录使用的模型
        analysis_time: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to save analysis result:', insertError);
      throw insertError;
    }

    // 更新截图状态为已完成
    await supabase
      .from('screenshots')
      .update({ analysis_status: 'completed' })
      .eq('id', screenshot_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        message: 'Screenshot analysis completed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Screenshot analysis error:', error);

    // 如果有screenshot_id，更新状态为失败
    try {
      const { screenshot_id } = await req.clone().json();
      if (screenshot_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('screenshots')
          .update({ analysis_status: 'failed' })
          .eq('id', screenshot_id);
      }
    } catch (updateError) {
      console.error('Failed to update screenshot status to failed:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Screenshot analysis failed',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
