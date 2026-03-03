import { Temporal } from "@js-temporal/polyfill";
import { createCanvas } from "@napi-rs/canvas";
import { AppConstants } from "../constants/app";
import { HeaderConstants } from "../constants/headers";
import { RegexConstants } from "../constants/regex";
import { TZConstants } from "../constants/tz";
import { type Env } from "../env";
import { getTemplate } from "../preload/template";
import { Logs } from "../utils/log";

export const dayCounter = async (
  env: Env,
  searchParams: URLSearchParams,
): Promise<Response> => {
  const h = Number(searchParams.get(AppConstants.HEIGHT) ?? env.DEFAULT_HEIGHT);
  const w = Number(searchParams.get(AppConstants.WIDTH) ?? env.DEFAULT_WIDTH);

  const buffer = await getCanvas(env, h, w);
  return new Response(buffer as BodyInit, {
    headers: HeaderConstants.IMAGE_HEADERS,
  });
};

export const cachedCanvas: Map<string, Buffer<ArrayBufferLike>> = new Map();
let lastGenCanvas: string;
const getCanvas = async (env: Env, h: number, w: number) => {
  const today = Temporal.Now.zonedDateTimeISO(TZConstants.TH)
    .toPlainDate()
    .toString();

  if (lastGenCanvas !== today) {
    lastGenCanvas = today;
    cachedCanvas.clear();
  }

  const key = `${h}x${w}`;
  if (!cachedCanvas.get(key)) {
    cachedCanvas.set(key, await genCanvas(env, h, w));
  }

  return cachedCanvas.get(key);
};

const genCanvas = async (env: Env, h: number, w: number) => {
  Logs.log("genCanvas");
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

  const lines = getText(env);

  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;

  // เริ่มวาดจากกึ่งกลาง
  let startY = h / 2 - totalHeight / 2 + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, w / 10, startY);
    startY += lineHeight;
  }

  const buffer = await canvas.encode("webp", 95);
  return buffer;
};

let cachedText: string[];
let lastGenText: string;
const getText = (env: Env) => {
  const today = Temporal.Now.zonedDateTimeISO(TZConstants.TH)
    .toPlainDate()
    .toString();

  if (lastGenText !== today) {
    lastGenText = today;
    cachedText = genText(env);
  }

  return cachedText;
};

const genText = (env: Env) => {
  Logs.log("genText");

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
