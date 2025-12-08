import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project_id = searchParams.get('project_id');
    const diagram_type = searchParams.get('diagram_type');

    if (!project_id || !diagram_type) {
      return NextResponse.json(
        { error: 'project_id and diagram_type are required' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    params.append('project_id', project_id);
    params.append('diagram_type', diagram_type);

    const response = await fetch(`${BACKEND_URL}/api/visualizations/latest?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Visualization not found' }, { status: 404 });
      }
      const error = await response.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: 'Failed to fetch visualization' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching latest visualization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
