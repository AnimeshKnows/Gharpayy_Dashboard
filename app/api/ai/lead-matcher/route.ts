import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { leadText, knowledgeSnapshot } = await req.json();
    if (!leadText) {
      return NextResponse.json({ error: 'leadText is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const systemPrompt = `You are the geo-intelligence engine for Gharpay, a Bangalore property matching startup.
Given a sales lead, extract structured intent and match to best Bangalore residential areas.
Bangalore knowledge base:
${knowledgeSnapshot}
Return ONLY valid JSON (no markdown):
{"extracted":{"name":"string|null","budget_inr":"string|null","budget_tier":"luxury|premium|mid|affordable","property_type":"buy|rent|pg|commercial|unknown","office_location":"string|null","matched_office_park_id":"id from TECH_PARKS or null","preferred_area_raw":"string|null","matched_area_ids":["up to 5 area ids from AREAS"],"commute_max_km":number|null,"notes":"brief reasoning"}}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: leadText }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Anthropic API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const raw = data.content?.map((c: any) => c.text || '').join('') || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: clean }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
