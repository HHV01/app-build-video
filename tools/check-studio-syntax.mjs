// Kiểm tra cú pháp app.js/server.mjs mà không cần chạy trình duyệt.
// Chép ra file tạm với import đường dẫn tương đối rồi node --check.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const targets = ['studio/public/app.js', 'studio/server.mjs'];
let failed = 0;
for (const t of targets) {
  const src = readFileSync(t, 'utf8')
    .replace(/from '\/rx\.mjs'/g, "from '../rx.mjs'")
    .replace(/from '\/zip\.mjs'/g, "from '../zip.mjs'");
  const tmp = path.join(path.dirname(t), `_check_${path.basename(t)}`);
  writeFileSync(tmp, src);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`OK   ${t}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${t}\n${e.stderr?.toString() || e.message}`);
  } finally {
    unlinkSync(tmp);
  }
}
process.exit(failed ? 1 : 0);