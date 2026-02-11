# Email Unsubscribe Best Practices

## Email Headers

### Required Headers

```
List-Unsubscribe: <https://example.com/unsubscribe?token=abc123>, <mailto:unsubscribe@example.com?subject=unsubscribe&body=token:abc123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### Header Details

| Header | Purpose | Format |
|--------|---------|--------|
| `List-Unsubscribe` | Provides unsubscribe mechanism (URL and/or mailto) | `<url>` or `<mailto:...>` or both comma-separated |
| `List-Unsubscribe-Post` | Enables one-click unsubscribe (RFC 8058) | Must be exactly `List-Unsubscribe=One-Click` |

### Why Both URL and Mailto?

- **URL**: Preferred by Gmail, Yahoo, and most modern clients
- **Mailto**: Fallback for older clients; some enterprise filters prefer it
- Including both maximizes compatibility

### One-Click Requirement (RFC 8058)

Gmail and Yahoo now **require** `List-Unsubscribe-Post` for bulk senders. When present:
1. The email client sends a POST request to your URL
2. The POST body contains `List-Unsubscribe=One-Click`
3. You must process this without requiring further user action

```
POST /unsubscribe?token=abc123 HTTP/1.1
Content-Type: application/x-www-form-urlencoded

List-Unsubscribe=One-Click
```

---

## Unsubscribe Token Design

### Token Requirements
- **Stateless**: Encode user identity in the token (signed JWT or HMAC)
- **No login required**: User should never need to authenticate
- **Non-guessable**: Use cryptographic signatures
- **Expiration optional**: Tokens should work indefinitely for compliance

### Example Token Structure (JWT)
```json
{
  "sub": "user@example.com",
  "list": "daily-digest",
  "iat": 1707667200
}
```

Sign with a secret key -> `eyJhbGciOiJIUzI1NiIs...`

---

## Manual Unsubscribe User Journey

### Page 1: Landing Page (GET request)

When user clicks the link in the email footer:

```
+---------------------------------------------------+
|                                                   |
|              [Your Logo]                          |
|                                                   |
|     Unsubscribe from Your Daily Dose of Junk      |
|                                                   |
|     Email: j***n@example.com                      |
|                                                   |
|     +---------------------------------------+     |
|     |            Unsubscribe                |     |
|     +---------------------------------------+     |
|                                                   |
|     You'll stop receiving daily portfolio         |
|     summary emails. This won't affect other       |
|     account notifications.                        |
|                                                   |
+---------------------------------------------------+
```

**Key elements:**
- Partially masked email for confirmation
- Clear description of what they're unsubscribing from
- Single prominent button
- Clarify what they'll still receive (transactional emails, etc.)

### Page 2: Confirmation (POST response)

```
+---------------------------------------------------+
|                                                   |
|              [Your Logo]                          |
|                                                   |
|     [check] You've been unsubscribed              |
|                                                   |
|     j***n@example.com will no longer receive      |
|     Your Daily Dose of Junk emails.               |
|                                                   |
|     Changed your mind?                            |
|     +---------------------------------------+     |
|     |            Re-subscribe               |     |
|     +---------------------------------------+     |
|                                                   |
|     Questions? Contact support@example.com        |
|                                                   |
+---------------------------------------------------+
```

**Key elements:**
- Clear success message
- Option to re-subscribe (mistakes happen)
- Support contact

---

## Email Footer Design

```html
You're receiving this because you opted into Your Daily Dose of Junk.

Manage preferences | Unsubscribe

Example Corp, 123 Main St, New York, NY 10001
```

**Requirements:**
- Physical mailing address (CAN-SPAM requirement)
- Clear unsubscribe link (visible, not hidden)
- Explain why they're receiving the email
- Optional: preference center link for granular control

---

## Backend Implementation Checklist

### Endpoint Requirements

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/unsubscribe` | GET | Token | Display confirmation page |
| `/unsubscribe` | POST | Token | Process unsubscribe (both one-click and form) |
| `/resubscribe` | POST | Token | Allow user to undo |

### POST Handler Logic

```
if request.body contains "List-Unsubscribe=One-Click":
    # One-click from email client
    process_unsubscribe(token)
    return 200 OK (no body needed)
else:
    # Manual click from landing page
    process_unsubscribe(token)
    return redirect to confirmation page
```

---

## Compliance Summary

| Requirement | Gmail/Yahoo | CAN-SPAM | GDPR |
|-------------|-------------|----------|------|
| List-Unsubscribe header | Required for bulk | - | - |
| One-click unsubscribe | Required | - | - |
| Process within 10 days | - | Required | - |
| Physical address | - | Required | - |
| Honor request immediately | Best practice | Required | Required |
| No re-confirmation email | Best practice | - | - |

---

## Anti-Patterns to Avoid

1. **Requiring login** - Unsubscribe must work without authentication
2. **"Are you sure?" dialogs** - One click should be enough
3. **Surveys before unsubscribe** - Optional survey *after* is fine
4. **Delayed processing** - Should be instant, not "within 10 days"
5. **Tiny/hidden unsubscribe links** - Hurts deliverability reputation
6. **Unsubscribe confirmation emails** - Ironic and annoying
