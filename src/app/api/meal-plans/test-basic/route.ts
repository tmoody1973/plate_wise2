import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Just return a simple success response with the input
    return NextResponse.json({
      success: true,
      message: 'Basic API test successful',
      receivedInput: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Basic API test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Basic API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Basic API endpoint is working',
    timestamp: new Date().toISOString()
  });
}