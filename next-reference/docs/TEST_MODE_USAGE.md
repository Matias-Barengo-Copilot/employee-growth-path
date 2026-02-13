# Test Mode Usage Guide

## Overview

Test mode allows you to create and test users with any email domain without requiring Google OAuth. This is useful for:
- Testing different user roles (employee, supervisor, md, hr)
- Testing without needing multiple Google accounts
- Quick development and QA testing

## Enabling Test Mode

Add this to your `.env` file:
```env
ENABLE_TEST_MODE=true
NEXT_PUBLIC_ENABLE_TEST_MODE=true
```

**Important:** You need both variables:
- `ENABLE_TEST_MODE` - Used by server-side code (NextAuth config, API routes)
- `NEXT_PUBLIC_ENABLE_TEST_MODE` - Used by client-side code (navigation, sign-in page)

**Note:** The application uses centralized utility functions (`lib/utils/test-mode.ts`) to check test mode status. This ensures consistency across the codebase and handles both server and client contexts correctly.

After adding these variables, restart your development server:
```bash
pnpm dev
```

## Creating Test Users

1. Sign in as an HR user (with your @copilotinnovations.com account)
2. Navigate to **Test Users** in the sidebar (only visible when test mode is enabled)
3. Fill in the form:
   - **Name**: Full name of the test user
   - **Email**: Any email domain (e.g., `test@example.com`, `employee@test.com`)
   - **Country**: Country name
   - **Role**: Select the role (employee, supervisor, md, hr)
   - **Employee Number**: Optional
4. Click **Create Test User**

## Signing In as a Test User

1. Go to the sign-in page (`/sign-in`)
2. You'll see two options:
   - **Sign in with Google** (normal production flow)
   - **Test Account Sign In** (test mode only)
3. For test users, use the **Test Account Sign In** form
4. Enter the email address of the test user you created
5. Click **Sign in with Test Account**

**Note:** Test users can only sign in using the test form, not with Google OAuth.

## Testing Different Roles

To test different user roles:

1. Create multiple test users with different roles:
   - `employee@test.com` - Role: employee
   - `supervisor@test.com` - Role: supervisor
   - `md@test.com` - Role: md
   - `hr@test.com` - Role: hr

2. Sign in with each test user to see role-based content and permissions

3. Test features specific to each role:
   - **Employee**: Submit leave requests, view own requests
   - **Supervisor**: Approve requests, view team requests
   - **MD**: Approve requests, view all company requests
   - **HR**: Create users, view all requests, manage employees

## Security Notes

⚠️ **Important Security Considerations:**

- Test mode should **NEVER** be enabled in production
- Test users bypass Google OAuth authentication
- Anyone with access to the application can sign in as any test user if they know the email
- Test users are stored in the same database as production users
- Always disable test mode before deploying to production

## Disabling Test Mode

To disable test mode:

1. Remove or set to `false` in `.env`:
   ```env
   ENABLE_TEST_MODE=false
   NEXT_PUBLIC_ENABLE_TEST_MODE=false
   ```

2. Restart your development server

3. Test users will no longer be able to sign in
4. The "Test Users" menu item will disappear from the sidebar
5. The test sign-in form will disappear from the sign-in page

**Note:** Test users remain in the database but cannot sign in when test mode is disabled.

## Removing Test Mode Completely

See `TEST_MODE_REMOVAL.md` for complete instructions on removing all test mode code from the application.

## Troubleshooting

### Test Users menu item doesn't appear
- Make sure both `ENABLE_TEST_MODE` and `NEXT_PUBLIC_ENABLE_TEST_MODE` are set to `true`
- Restart your development server
- Make sure you're signed in as an HR user

### Can't sign in with test user
- Verify the test user exists in the database
- Make sure test mode is enabled
- Check that you're using the "Test Account Sign In" form, not Google OAuth
- Verify the email matches exactly (case-sensitive)

### Test sign-in form doesn't appear
- Make sure `NEXT_PUBLIC_ENABLE_TEST_MODE=true` is set
- Restart your development server
- Clear browser cache if needed

## Example Test Users

Here are some example test users you might create:

```
Name: Test Employee
Email: employee@test.local
Role: employee
Country: USA

Name: Test Supervisor
Email: supervisor@test.local
Role: supervisor
Country: USA

Name: Test MD
Email: md@test.local
Role: md
Country: USA

Name: Test HR
Email: hr@test.local
Role: hr
Country: USA
```

