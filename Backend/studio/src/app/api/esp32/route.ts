import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Node.js bypasses browser CORS and Private Network Access restrictions
    const res = await fetch('http://192.168.4.1/status', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'ESP32 error', status: res.status }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to reach ESP32', details: error?.message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    if (action === 'on' || action === 'off') {
      const res = await fetch(`http://192.168.4.1/${action}`, { cache: 'no-store' });
      if (res.ok) {
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ error: 'Failed action' }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to reach ESP32' }, { status: 503 });
  }
}
