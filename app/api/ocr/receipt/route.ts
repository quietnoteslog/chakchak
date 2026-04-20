import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let imageBase64: string;
  let mimeType = 'image/jpeg';

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'image field required' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    imageBase64 = buf.toString('base64');
    mimeType = file.type || mimeType;
  } else {
    const body = await req.json().catch(() => null);
    if (!body?.imageBase64) {
      return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
    }
    imageBase64 = body.imageBase64;
    if (body.mimeType) mimeType = body.mimeType;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `이 영수증 이미지에서 정보를 추출해 아래 JSON 스키마로만 응답하세요. 설명, 마크다운 블록 없이 순수 JSON만.

{
  "merchant": string | null,   // 가맹점(상호)명. 못 읽으면 null
  "amount": number | null,     // 총 결제 금액(원, 정수). 못 읽으면 null
  "date": string | null,       // 거래 일자 "YYYY-MM-DD". 못 읽으면 null
  "confidence": number         // 0.0 ~ 1.0 신뢰도 (모든 필드 평균)
}

주의:
- 금액은 정수만 (1000 등). 통화기호/쉼표 제외.
- 날짜는 반드시 YYYY-MM-DD 형식.
- 영수증이 아니거나 읽을 수 없으면 모든 값을 null로, confidence를 0.0으로.`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } },
    ]);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error('OCR failed', e);
    return NextResponse.json(
      { error: 'OCR failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
