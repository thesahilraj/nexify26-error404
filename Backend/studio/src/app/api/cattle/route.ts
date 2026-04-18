import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/cattle`, {
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
