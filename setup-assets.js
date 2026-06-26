/**
 * اجرا کن: node setup-assets.js
 * این اسکریپت را فقط یک بار اجرا کن تا لوگو و فونت در پروژه قرار بگیرند.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const FONTS_DIR = path.join(__dirname, "src", "assets", "fonts");
const ASSETS_DIR = path.join(__dirname, "src", "assets");

if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

// ─── کپی لوگو ───────────────────────────────────────────────────────────────
const LOGO_SOURCES = [
  // مسیر ذخیره‌شده توسط Cursor
  path.join(
    os.homedir(),
    ".cursor", "projects",
    "c-Users-ParsLap-ir-Desktop-petland-bot",
    "assets",
    "c__Users_ParsLap.ir_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_logo-6e42c18b-f340-4bb5-922c-7cc5d00ddb65.png"
  ),
  // مسیر جایگزین — اگر لوگو را کنار این فایل گذاشتی
  path.join(__dirname, "logo.png"),
];

const LOGO_DEST = path.join(ASSETS_DIR, "logo.png");

if (!fs.existsSync(LOGO_DEST)) {
  let copied = false;
  for (const src of LOGO_SOURCES) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, LOGO_DEST);
      console.log("✅ لوگو کپی شد:", LOGO_DEST);
      copied = true;
      break;
    }
  }
  if (!copied) {
    console.warn("⚠️  لوگو پیدا نشد. فایل logo.png را کنار setup-assets.js قرار بده.");
  }
} else {
  console.log("ℹ️  لوگو از قبل موجود است.");
}

// ─── استخراج فونت از zip ────────────────────────────────────────────────────
const FONT_DEST = path.join(FONTS_DIR, "VazirMatn-Regular.ttf");

if (fs.existsSync(FONT_DEST)) {
  console.log("ℹ️  فونت از قبل موجود است.");
} else {
  // پیدا کردن فایل zip روی دسکتاپ
  const ZIP_PATHS = [
    path.join(os.homedir(), "Desktop", "vazirmatn-v33.003.zip"),
    path.join(os.homedir(), "Downloads", "vazirmatn-v33.003.zip"),
    path.join(__dirname, "vazirmatn-v33.003.zip"),
  ];

  let zipPath = ZIP_PATHS.find((p) => fs.existsSync(p));

  if (!zipPath) {
    console.error("❌ فایل zip فونت پیدا نشد.");
    console.error("   فایل VazirMatn-Regular.ttf را دستی به این مسیر کپی کن:");
    console.error("  ", FONT_DEST);
    process.exit(1);
  }

  // استخراج با adm-zip یا راهنمای دستی
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntries().find(
      (e) => e.name === "VazirMatn-Regular.ttf" || e.name === "Vazirmatn-Regular.ttf"
    );

    if (!entry) {
      // لیست همه فایل‌های ttf موجود
      const ttfs = zip.getEntries().filter((e) => e.name.endsWith(".ttf")).map((e) => e.entryName);
      console.error("❌ VazirMatn-Regular.ttf در zip پیدا نشد. فایل‌های موجود:");
      ttfs.forEach((t) => console.error("  -", t));
      process.exit(1);
    }

    fs.writeFileSync(FONT_DEST, entry.getData());
    console.log("✅ فونت استخراج شد:", FONT_DEST);
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      console.log("📦 نصب adm-zip ...");
      require("child_process").execSync("npm install adm-zip --save-dev", {
        stdio: "inherit",
        cwd: __dirname,
      });
      // اجرای مجدد
      console.log("✅ adm-zip نصب شد. دوباره اجرا کن: node setup-assets.js");
    } else {
      console.error("❌ خطا در استخراج فونت:", err.message);
      console.error("   فایل VazirMatn-Regular.ttf را دستی به این مسیر کپی کن:");
      console.error("  ", FONT_DEST);
    }
  }
}

console.log("\n🎉 setup-assets تمام شد.");
