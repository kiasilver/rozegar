/**
 * Blog Generation Progress API
 * Returns the current progress state for blog generation
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface ProgressData {
  isActive: boolean;
  progress: number; // 0-100
  message: string;
  total: number;
  current: number;
  completed: boolean;
  timestamp?: number;
}

// GET - Get current generation progress
export async function GET() {
  try {
    // Default progress state
    // In a real implementation, this could read from:
    // - Redis cache
    // - Database
    // - Server-side session storage
    // For now, return default state since progress is managed client-side via localStorage
    
    const progress: ProgressData = {
      isActive: false,
      progress: 0,
      message: '',
      total: 0,
      current: 0,
      completed: false,
      timestamp: Date.now(),
    };

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error('[Generation Progress] GET Error:', error.message);
    return NextResponse.json(
      { 
        isActive: false,
        progress: 0,
        message: 'خطا در دریافت وضعیت پیشرفت',
        total: 0,
        current: 0,
        completed: false,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}


