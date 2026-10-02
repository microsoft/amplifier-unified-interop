import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('vendored upstream artifacts match their recorded revision receipt',()=>{
 const receipt=JSON.parse(readFileSync(new URL('../upstream/ahp/SOURCE.json',import.meta.url)));
 for(const [file,hash]of Object.entries(receipt.files))assert.equal(createHash('sha256').update(readFileSync(new URL('../upstream/ahp/'+file,import.meta.url))).digest('hex'),hash,file);
});
