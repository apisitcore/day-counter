import { Image, loadImage } from "@napi-rs/canvas";
import { watch } from "node:fs";
import { AppConstants } from "../constants/app";
import { cachedCanvas } from "../services/day-counter";
import { Logs } from "../utils/log";

let cachedImage: Image | null = null;

const loadTemplate = async (): Promise<Image> => {
  Logs.log("load Template");

  const file = Bun.file(AppConstants.TEMPLATE_PATH);
  const buffer = await file.arrayBuffer();
  cachedImage = await loadImage(buffer);

  cachedCanvas.clear();
  Logs.log("clear cachedCanvas");
  return cachedImage;
};

export const getTemplate = async (): Promise<Image> => {
  if (cachedImage) return cachedImage;
  return await loadTemplate();
};

watch(AppConstants.TEMPLATE_PATH, async (event) => {
  if (event === "change") {
    try {
      Logs.log("change Template");
      cachedImage = await loadTemplate();
    } catch (err) {
      console.error("Template reload failed:", err);
    }
  }
});
