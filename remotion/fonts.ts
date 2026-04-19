import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";

const inter = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

const instrumentSerifNormal = loadInstrumentSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const instrumentSerifItalic = loadInstrumentSerif("italic", {
  weights: ["400"],
  subsets: ["latin"],
});

export const INTER = inter.fontFamily;
export const INSTRUMENT_SERIF = instrumentSerifNormal.fontFamily;
