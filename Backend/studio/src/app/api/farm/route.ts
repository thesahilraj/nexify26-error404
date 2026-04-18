import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/farm`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { data: null, connected: false, lastUpdate: 0 },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${BRIDGE_URL}/farm/pump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Bridge server unavailable' },
      { status: 503 }
    );
  }
}
