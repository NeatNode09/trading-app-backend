import fs from "fs";
import path from "path";

export const ensureDirExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const generateFileName = (originalName: string) => {
  const ext = path.extname(originalName);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};
