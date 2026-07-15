// content.html を合言葉で AES-GCM 暗号化し、gate.html に埋め込んで index.html を生成する。
// 使い方: node build.mjs <合言葉>
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const passphrase = process.argv[2];
if (!passphrase) {
  console.error("使い方: node build.mjs <合言葉>");
  process.exit(1);
}

const content = readFileSync(new URL("./content.html", import.meta.url), "utf8");
const gate = readFileSync(new URL("./gate.html", import.meta.url), "utf8");

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const keyMaterial = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
  keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const cipher = new Uint8Array(
  await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(content)));

const payload = Buffer.concat([salt, iv, cipher]).toString("base64");
if (!gate.includes('"__PAYLOAD__"')) {
  console.error("gate.html に __PAYLOAD__ プレースホルダが見つかりません");
  process.exit(1);
}
writeFileSync(new URL("./index.html", import.meta.url), gate.replace('"__PAYLOAD__"', JSON.stringify(payload)));
console.log(`index.html を生成しました（payload ${Math.round(payload.length / 1024)}KB）`);
