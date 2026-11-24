import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {pathToFileURL} from 'node:url';
import {readBundle} from '../scripts/inspect.mjs';

test('资料可按声明的主键和字段完整读取', async () => {
  const bundle = await readBundle();
  assert(Object.values(bundle).every(rows => rows.length > 0));
  const {sailings, positions, berth, tickets} = bundle;
  assert(tickets.every(row => row.legs.every(id => sailings.some(sailing => sailing.id === id))));
  assert(positions.every(row => sailings.some(sailing => sailing.day === row.day && sailing.position_device === row.device)));
  assert(berth.some(row => row.seen > sailings.find(sailing => sailing.id === row.sailing).day));
  assert(tickets.some(row => row.legs.length > 1 && row.refunded > 0 && row.refunded < row.seats));
});

test('读取资料时拒绝重复主键', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'record-check-'));
  try {
    await writeFile(join(dir, 'manifest.json'), '{"entries":{"fields":["id","value"],"key":["id"]}}');
    await writeFile(join(dir, 'entries.json'), '[{"id":"x","value":1},{"id":"x","value":2}]');
    await assert.rejects(readBundle(pathToFileURL(dir + '/')), /主键/);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
