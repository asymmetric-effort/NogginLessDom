/**
 * In-memory cookie jar for document.cookie simulation.
 * @module dom/cookie
 */

/** Internal cookie representation. */
interface CookieEntry {
  name: string;
  value: string;
  path: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expires: Date | null; // null = session cookie
}

/**
 * CookieJar — manages cookies in memory.
 */
export class CookieJar {
  private cookies: Map<string, CookieEntry> = new Map();

  /**
   * Get all non-httpOnly, non-expired cookies as "key=value; key2=value2".
   */
  getCookieString(): string {
    const now = new Date();
    const parts: string[] = [];
    for (const [, entry] of this.cookies) {
      if (entry.httpOnly) continue;
      if (entry.expires && entry.expires.getTime() <= now.getTime()) continue;
      parts.push(`${entry.name}=${entry.value}`);
    }
    return parts.join('; ');
  }

  /**
   * Parse and set a cookie string (one cookie at a time).
   */
  setCookieString(cookieStr: string): void {
    const parts = cookieStr.split(';').map((s) => s.trim());
    if (parts.length === 0 || !parts[0]) return;

    const firstPart = parts[0]!;
    const eqIndex = firstPart.indexOf('=');
    if (eqIndex === -1) return;

    const name = firstPart.slice(0, eqIndex).trim();
    const value = firstPart.slice(eqIndex + 1).trim();

    if (!name) return;

    const entry: CookieEntry = {
      name,
      value,
      path: '/',
      domain: '',
      secure: false,
      httpOnly: false,
      sameSite: '',
      expires: null,
    };

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]!;
      const attrEq = part.indexOf('=');
      let attrName: string;
      let attrValue: string;
      if (attrEq === -1) {
        attrName = part.trim().toLowerCase();
        attrValue = '';
      } else {
        attrName = part.slice(0, attrEq).trim().toLowerCase();
        attrValue = part.slice(attrEq + 1).trim();
      }

      switch (attrName) {
        case 'path':
          entry.path = attrValue;
          break;
        case 'domain':
          entry.domain = attrValue;
          break;
        case 'secure':
          entry.secure = true;
          break;
        case 'httponly':
          entry.httpOnly = true;
          break;
        case 'samesite':
          entry.sameSite = attrValue;
          break;
        case 'max-age': {
          const seconds = parseInt(attrValue, 10);
          if (seconds <= 0) {
            // Delete cookie
            this.cookies.delete(name);
            return;
          }
          entry.expires = new Date(Date.now() + seconds * 1000);
          break;
        }
        case 'expires': {
          const date = new Date(attrValue);
          if (date.getTime() <= Date.now()) {
            // Delete cookie
            this.cookies.delete(name);
            return;
          }
          entry.expires = date;
          break;
        }
      }
    }

    this.cookies.set(name, entry);
  }
}
