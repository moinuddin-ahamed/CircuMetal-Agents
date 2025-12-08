import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project_id = searchParams.get('project_id');
    const diagram_type = searchParams.get('diagram_type');
    const limit = searchParams.get('limit') || '10';

    // Build query string for backend
    const params = new URLSearchParams();
    if (project_id) params.append('project_id', project_id);
    if (diagram_type) params.append('diagram_type', diagram_type);
    params.append('limit', limit);

    const response = await fetch(`${BACKEND_URL}/api/visualizations?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: 'Failed to fetch visualizations' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching visualizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/visualizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: 'Failed to save visualization' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving visualization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
