import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import pngToIco from 'png-to-ico';

const svgPath = new URL('../public/favicon.svg', import.meta.url);
const icoPath = new URL('../public/favicon.ico', import.meta.url);
const wasmPath = fileURLToPath(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url));
const svgContent = fs.readFileSync(svgPath, 'utf8');
const wasmBinary = fs.readFileSync(wasmPath);
await initWasm(wasmBinary);
const resvg = new Resvg(svgContent, { fitTo: { mode: 'width', value: 64 } });
const pngData = Buffer.from(resvg.render().asPng());
const icoBuffer = await pngToIco(pngData);
fs.writeFileSync(icoPath, icoBuffer);
console.log('Created', icoPath.pathname);
