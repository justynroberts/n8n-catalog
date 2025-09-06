import { NextRequest, NextResponse } from 'next/server';
import { requireAuthHeader, changePassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Check authentication
  const { authenticated, response } = await requireAuthHeader(req);
  if (!authenticated) {
    return response!;
  }
  
  try {
    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new passwords are required' }, { status: 400 });
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }
    
    const result = await changePassword(currentPassword, newPassword);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully. Please log in again.' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}