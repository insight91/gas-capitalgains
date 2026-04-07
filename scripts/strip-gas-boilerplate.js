/**
 * Strips CommonJS boilerplate from compiled JS files before pushing to Google Apps Script.
 *
 * WHY: TypeScript compiles to CommonJS (module: "commonjs") so that Jest tests can use
 * import/export syntax. But GAS runs in a global scope with no module system — there is
 * no `exports` or `require` object. If these lines reach GAS, it throws:
 *   ReferenceError: exports is not defined
 *
 * The lines we remove:
 *   "use strict";                                        — not harmful but not needed
 *   Object.defineProperty(exports, "__esModule", ...);  — references undefined `exports`
 *   exports.foo = foo;                                   — references undefined `exports`
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

const BOILERPLATE = [
  /^"use strict";$/,
  /^Object\.defineProperty\(exports,/,
  /^exports\./,
];

for (const file of fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))) {
  const filePath = path.join(distDir, file);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const stripped = lines.filter((line) => !BOILERPLATE.some((re) => re.test(line)));
  fs.writeFileSync(filePath, stripped.join('\n'));
}
