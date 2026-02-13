# How to Remove Test Mode

This document explains how to completely remove the test mode feature from the application.

## What Test Mode Does

Test mode allows:
- Creating users with any email domain (not just @copilotinnovations.com)
- Signing in directly with email (no Google OAuth required)
- Testing all user roles without needing Google accounts

## Steps to Remove Test Mode

### 1. Disable Test Mode in Environment Variables

Remove or set to `false` in your `.env` file:
```env
ENABLE_TEST_MODE=false
```

### 2. Delete Test Mode Files

Delete the following files:
- `app/(dashboard)/test-users/page.tsx`
- `components/shared/test-users/CreateTestUserForm.tsx`
- `components/auth/TestSignInForm.tsx`
- `app/api/test-users/route.ts`

### 3. Remove Test Mode Code from Existing Files

#### `lib/auth/config.ts`

Remove:
- The `isTestModeEnabledServer` import from `@/lib/utils/test-mode`
- The `ENABLE_TEST_MODE` constant declaration (which uses `isTestModeEnabledServer()`)
- The `CredentialsProvider` import and provider array entry
- All `// TEST MODE` comments and conditional logic
- The test mode checks in `signIn` callback

Specifically, remove:
```typescript
// Remove this import
import CredentialsProvider from 'next-auth/providers/credentials';
import { isTestModeEnabledServer } from '@/lib/utils/test-mode';

// Remove this constant
const ENABLE_TEST_MODE = isTestModeEnabledServer();

// Remove CredentialsProvider from providers array
...(ENABLE_TEST_MODE ? [CredentialsProvider({...})] : [])

// Remove test mode checks in signIn callback
if (!ENABLE_TEST_MODE && !user.email.endsWith('@copilotinnovations.com')) {
  return false;
}

// Remove test mode check for initial admin
if (ENABLE_TEST_MODE) {
  return false; // User must exist in DB when in test mode
}
```

#### `app/sign-in/page.tsx`

Remove:
- `TestSignInForm` import
- `isTestModeEnabled` import from `@/lib/utils/test-mode`
- Test mode alert
- Test sign-in form section
- Conditional text based on test mode

Restore to original simple version with only Google sign-in.

#### `lib/constants/navigation.ts`

Remove:
- `TestTube` icon import
- `isTestModeEnabled` import from `@/lib/utils/test-mode`
- The `getNavigationItems()` function that adds test users item
- The test users navigation item logic

#### `lib/utils/test-mode.ts`

Delete this entire file as it's only used for test mode functionality.

### 4. Clean Up Database (Optional)

If you created test users, you may want to remove them:

```sql
-- List test users (users not from @copilotinnovations.com)
SELECT * FROM employees WHERE email NOT LIKE '%@copilotinnovations.com';

-- Delete test users (BE CAREFUL - this is irreversible)
DELETE FROM employees WHERE email NOT LIKE '%@copilotinnovations.com';
```

### 5. Verify Removal

After removing test mode:
1. Restart your development server
2. Verify `/test-users` route returns 404
3. Verify sign-in page only shows Google OAuth option
4. Verify only @copilotinnovations.com emails can sign in
5. Run linter to check for any remaining references

### 6. Delete Test Mode Utility

Delete the centralized test mode utility file:
- `lib/utils/test-mode.ts`

### 7. Search for Remaining References

Search for these strings in your codebase:
- `ENABLE_TEST_MODE`
- `NEXT_PUBLIC_ENABLE_TEST_MODE`
- `isTestModeEnabled`
- `isTestModeEnabledServer`
- `TEST MODE`
- `test-users`
- `TestSignInForm`
- `CreateTestUserForm`
- `TestTube`

If any remain, remove them.

## Summary Checklist

- [ ] Set `ENABLE_TEST_MODE=false` and `NEXT_PUBLIC_ENABLE_TEST_MODE=false` in `.env`
- [ ] Delete `app/(dashboard)/test-users/page.tsx`
- [ ] Delete `components/shared/test-users/CreateTestUserForm.tsx`
- [ ] Delete `components/auth/TestSignInForm.tsx`
- [ ] Delete `app/api/test-users/route.ts`
- [ ] Delete `lib/utils/test-mode.ts`
- [ ] Remove test mode code from `lib/auth/config.ts`
- [ ] Remove test mode code from `app/sign-in/page.tsx`
- [ ] Remove test mode code from `lib/constants/navigation.ts`
- [ ] (Optional) Clean up test users from database
- [ ] Verify all test mode features are removed
- [ ] Search for remaining references

## Notes

- All test mode code is marked with `// TEST MODE` comments for easy identification
- Test mode files are isolated and don't affect production code when disabled
- The navigation item is conditionally added via `getNavigationItems()`, so it won't appear when test mode is disabled
- Test mode checking is centralized in `lib/utils/test-mode.ts` using `isTestModeEnabled()` and `isTestModeEnabledServer()` functions
- Test users can still exist in the database after disabling test mode, but they won't be able to sign in

