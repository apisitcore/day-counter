import { Temporal } from "@js-temporal/polyfill";
import { createCanvas, Image, loadImage } from "@napi-rs/canvas";
import { AppConstants } from "../constants/app";
import { HeaderConstants } from "../constants/headers";
import { RegexConstants } from "../constants/regex";
import { TZConstants } from "../constants/tz";
import { type Env } from "../env";

let cachedImage: Image | null = null;
let lastMtime = 0;
let lastCheck = 0;

const CHECK_INTERVAL = 5000; // 5 วินาที

const getTemplate = async (): Promise<Image> => {
  const now = Date.now();

  if (now - lastCheck < CHECK_INTERVAL && cachedImage) {
    return cachedImage;
  }

  lastCheck = now;

  const file = Bun.file(AppConstants.TEMPLATE_PATH);
  const stat = await file.stat();

  if (!cachedImage || stat.mtimeMs !== lastMtime) {
    const buffer = await file.arrayBuffer();
    cachedImage = await loadImage(Buffer.from(buffer));
    lastMtime = stat.mtimeMs;
  }

  return cachedImage;
};

export const dayCounter = async (
  env: Env,
  searchParams: URLSearchParams,
): Promise<Response> => {
  const h = Number(searchParams.get(AppConstants.HEIGHT) ?? env.DEFAULT_HEIGHT);
  const w = Number(searchParams.get(AppConstants.WIDTH) ?? env.DEFAULT_WIDTH);

  const template = await getTemplate();

  // ---- คำนวณ scale แบบ contain ----
  const scale = Math.max(w / template.width, h / template.height);

  const drawWidth = Math.floor(template.width * scale);
  const drawHeight = Math.floor(template.height * scale);

  // สร้าง canvas ขนาดตาม request
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // center ภาพ
  const offsetX = Math.floor((w - drawWidth) / 2);
  const offsetY = Math.floor((h - drawHeight) / 2);

  ctx.drawImage(
    template,
    0,
    0,
    template.width,
    template.height,
    offsetX,
    offsetY,
    drawWidth,
    drawHeight,
  );

  // ---- เขียนข้อความ ----
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const fontSize = env.FONT_SIZE;
  ctx.font = `${fontSize}px ${AppConstants.FONT_NAME}`;

  // ---- Shadow ----
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = Math.max(2, Math.floor(fontSize * 0.08));
  ctx.shadowOffsetX = Math.floor(fontSize * 0.06);
  ctx.shadowOffsetY = Math.floor(fontSize * 0.06);

  const lines = getText(env);

  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;

  // เริ่มวาดจากกึ่งกลาง
  let startY = h / 2 - totalHeight / 2 + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, w / 10, startY);
    startY += lineHeight;
  }

  const buffer = canvas.toBuffer("image/png");

  return new Response(buffer as BodyInit, {
    headers: HeaderConstants.IMAGE_HEADERS,
  });
};

const calculate = (input: string) => {
  // validate format YYYY-MM-DD
  if (!RegexConstants.DATE.test(input)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }

  const baseDate = Temporal.PlainDate.from(input);
  const today = Temporal.Now.zonedDateTimeISO(TZConstants.TH).toPlainDate();

  const cmp = Temporal.PlainDate.compare(today, baseDate);
  const isPast = cmp >= 0;

  // ===== 1) เวลาที่ผ่านมา =====
  const diffYMD = isPast
    ? baseDate.until(today, { largestUnit: "years" })
    : today.until(baseDate, { largestUnit: "years" });

  const totalDays = isPast
    ? baseDate.until(today, { largestUnit: "days" }).days
    : 0;

  // ===== 2) Countdown แบบวนรายปี =====
  let nextOccurrence: Temporal.PlainDate;

  try {
    nextOccurrence = baseDate.with({ year: today.year });
  } catch {
    // handle leap year เช่น 29 Feb
    nextOccurrence = Temporal.PlainDate.from({
      year: today.year,
      month: baseDate.month,
      day: 28,
    });
  }

  if (Temporal.PlainDate.compare(today, nextOccurrence) > 0) {
    nextOccurrence = nextOccurrence.add({ years: 1 });
  }

  const countdownDays = today.until(nextOccurrence, {
    largestUnit: "days",
  }).days;

  return {
    passed: `${diffYMD.years}y${diffYMD.months}m${diffYMD.days}d | ${totalDays}d`,
    countdownDays: `${countdownDays}d`,
  };
};

const getText = (env: Env) => {
  const personName1 = env.PERSON_NAME_1;
  const personBirthday1 = calculate(env.PERSON_BIRTHDAY_1);
  const personName2 = env.PERSON_NAME_2;
  const personBirthday2 = calculate(env.PERSON_BIRTHDAY_2);
  const anniversary = calculate(env.ANNIVERSARY);

  return [
    `${personName1} - ${personBirthday1.passed}`,
    `${personName2} - ${personBirthday2.passed}`,
    `Anniversary - ${anniversary.passed}`,
    "",
    "Countdown",
    `${personName1} - ${personBirthday1.countdownDays}`,
    `${personName2} - ${personBirthday2.countdownDays}`,
    `Anniversary - ${anniversary.countdownDays}`,
  ];
};
