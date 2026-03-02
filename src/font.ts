import { GlobalFonts } from "@napi-rs/canvas";
import { AppConstants } from "./constants/app";

GlobalFonts.registerFromPath(AppConstants.FONT_PATH, AppConstants.FONT_NAME);
