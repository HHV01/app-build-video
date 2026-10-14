import test from 'node:test';
import assert from 'node:assert/strict';
import { wanAvailable, wanLengthFrames, buildWanWorkflow, WAN_UNET, WAN_CLIP, WAN_VAE, WAN_FPS } from './wan-client.mjs';

test('cong thuc Wan: node, model va tham so giong ban chay that', () => {
  const { job, prompt } = buildWanWorkflow({ imageName: 'studio-abc.png', positive: 'Nhan vat gio tay', width: 640, height: 352, length: 49, seed: 7, steps: 16 });
  assert.match(job, /^[a-f0-9]{32}$/);
  assert.equal(prompt[1].class_type, 'UNETLoader');
  assert.equal(prompt[1].inputs.unet_name, WAN_UNET);
  assert.equal(prompt[2].inputs.clip_name, WAN_CLIP);
  assert.equal(prompt[3].inputs.vae_name, WAN_VAE);
  assert.equal(prompt[4].inputs.image, 'studio-abc.png');
  assert.equal(prompt[5].inputs.width, 640);
  assert.equal(prompt[9].inputs.steps, 16);
  assert.equal(prompt[9].inputs.seed, 7);
  assert.equal(prompt[11].inputs.fps, WAN_FPS);
  assert.match(prompt[12].inputs.filename_prefix, /^studio\//);
  assert.throws(() => buildWanWorkflow({ positive: 'x' }), /khung hình đầu/);
  assert.throws(() => buildWanWorkflow({ imageName: 'a.png', positive: '' }), /chuyển động/);
});

test('so frame Wan luon dang 4n+1 trong 9..121', () => {
  assert.equal(wanLengthFrames(2), 49);
  for (const d of [1, 1.5, 2, 3, 5, 8]) {
    const n = wanLengthFrames(d);
    assert.equal((n - 1) % 4, 0);
    assert.ok(n >= 9 && n <= 121);
  }
  assert.throws(() => wanLengthFrames(0), /1–8/);
  assert.throws(() => wanLengthFrames(20), /1–8/);
});

test('khong co ComfyUI thi bao khong san sang (khong treo)', async () => {
  assert.equal(await wanAvailable('http://127.0.0.1:9'), false);
});
