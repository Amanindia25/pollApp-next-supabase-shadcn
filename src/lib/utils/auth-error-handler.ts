/**
 * Utility functions for handling Supabase authentication errors
 */

type ErrorWithCode = {
  message: string;
  code?: string;
};

/**
 * Handles common Supabase authentication errors and returns user-friendly messages
 */
export function handleAuthError(error: ErrorWithCode | null): string {
  if (!error) return '';

  // Check for specific error codes
  switch (error.code) {
    case 'auth_user_already_exists':
      return 'This email is already registered. Please sign in.';
    case 'auth_invalid_credentials':
      return 'Invalid login credentials. Please check your email and password.';
    case 'auth_invalid_email':
      return 'Please enter a valid email address.';
    case 'auth_weak_password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth_email_not_confirmed':
      return 'Please verify your email before signing in.';
    default:
      // Check for common error messages
      if (error.message.includes('already registered')) {
        return 'This email is already registered. Please sign in.';
      }
      if (error.message.includes('invalid login credentials')) {
        return 'Invalid login credentials. Please check your email and password.';
      }
      if (error.message.includes('Email not confirmed')) {
        return 'Please verify your email before signing in.';
      }
      // Return the original error message if no specific handling
      return error.message;
  }
}

/**
 * Determines if an error is a duplicate user error
 */
export function isDuplicateUserError(error: ErrorWithCode | null): boolean {
  if (!error) return false;
  
  return (
    error.code === 'auth_user_already_exists' ||
    error.message.includes('already registered')
  );
}