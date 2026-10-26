// frontend/src/features/auth/loginLogo.regression.test.js
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Login Screen Logo: Replaces circular SP placeholder with official branding logo asset", () => {
  const loginPath = path.resolve(__dirname, "Login.jsx");
  assert.ok(fs.existsSync(loginPath), "Login.jsx must exist");
  const loginContent = fs.readFileSync(loginPath, "utf-8");

  // 1. Verify official logo import
  assert.match(
    loginContent,
    /import\s+officialLogo\s+from\s+["'].*branding\/web-app-manifest-512x512\.png["']/,
    "Login.jsx must import the official branding logo asset"
  );

  // 2. Verify removal of old circular text SP placeholder
  assert.doesNotMatch(
    loginContent,
    /<span[^>]*>\s*SP\s*<\/span>/,
    "Old circular SP placeholder span must be completely removed"
  );

  // 3. Verify img tag rendered with official logo and object-contain
  assert.match(
    loginContent,
    /<img\s+[^>]*src=\{officialLogo\}[^>]*alt="Shobhadamodar Petroleum"[^>]*className="[^"]*object-contain[^"]*"/,
    "Official logo must be rendered in an <img> tag with src={officialLogo} and object-contain"
  );

  // 4. Verify logo container preserves size, alignment, and responsive styling
  assert.match(
    loginContent,
    /h-10\s+w-10\s+shrink-0/,
    "Logo container must preserve the h-10 w-10 shrink-0 dimensions"
  );
  assert.match(
    loginContent,
    /rounded-\[12px\]/,
    "Logo container must preserve rounded-[12px] corner radius"
  );
  assert.match(
    loginContent,
    /overflow-hidden/,
    "Logo container must include overflow-hidden to prevent distortion or clipping bleed"
  );

  // 5. Verify official logo asset exists on disk and is non-empty
  const logoPath = path.resolve(__dirname, "../../../assets/branding/web-app-manifest-512x512.png");
  assert.ok(fs.existsSync(logoPath), "web-app-manifest-512x512.png asset must exist on disk");
  const stats = fs.statSync(logoPath);
  assert.ok(stats.size > 10000, "Official logo file size must be valid (>10KB)");

  // 6. Verify brand text and layout preservation
  assert.ok(loginContent.includes("BPCL AUTHORISED OUTLET"), "BPCL outlet text must be preserved");
  assert.ok(loginContent.includes("Shobhadamodar Petroleum"), "Station title must be preserved");
  assert.ok(loginContent.includes("<LanguageSwitcher"), "LanguageSwitcher must be preserved");
  assert.ok(loginContent.includes("<LoginForm"), "LoginForm component must be preserved");
  assert.ok(loginContent.includes("<LoginWelcome"), "LoginWelcome component must be preserved");
  assert.ok(loginContent.includes("<LoginStationVisual"), "LoginStationVisual component must be preserved");
});
