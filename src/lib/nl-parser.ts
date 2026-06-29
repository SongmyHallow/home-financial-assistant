import OpenAI from 'openai';
import type { ParsedReminder, TemplateType } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseNaturalLanguage(text: string): Promise<ParsedReminder> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const prompt = `你是一个金融操作解析器。将用户输入的自然语言提醒解析为结构化数据。

当前时间: ${now.toLocaleString('zh-CN')}
今天日期: ${today}

规则:
- title: 简短的动作描述（≤15字）
- description: 补充说明
- trigger_time: ISO 8601 格式，"明天上午10:00" 应转为具体日期
- template_type: 申购/卖出/转账/积分/检查/自定义
- confidence: 0-1 之间，解析的确定程度

用户输入: "${text}"

返回纯 JSON（不要 markdown 代码块）:
{"title":"...","description":"...","trigger_time":"...","template_type":"...","confidence":0.9}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  const raw = response.choices[0].message.content || '{}';
  try {
    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return {
      title: text.slice(0, 20),
      description: text,
      trigger_time: new Date().toISOString(),
      template_type: '自定义' as TemplateType,
      confidence: 0.3,
    };
  }
}
