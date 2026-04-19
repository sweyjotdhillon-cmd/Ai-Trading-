import { Jimp } from "jimp";

async function run() {
  try {
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const buffer = Buffer.from(b64, 'base64');
    const jimpImage = await Jimp.read(buffer);
    const flippedBuffer = await jimpImage.flip({ horizontal: true, vertical: false }).getBuffer("image/jpeg", { quality: 50 });
    console.log("Flipped:", typeof flippedBuffer);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
