import test from 'node:test';
import assert from 'node:assert/strict';
import { supportedSources } from './grounding.mjs';
const candidate = { content:{parts:[{text:'A report mentions Kimberley. Dates need review.'}]}, groundingMetadata:{webSearchQueries:['Kimberley crime'],groundingChunks:[{web:{uri:'https://example.org/report',title:'Example'}}],groundingSupports:[{segment:{text:'A report mentions Kimberley.'},groundingChunkIndices:[0]}]} };
test('retains only metadata-cited sources', () => assert.equal(supportedSources(candidate).sources.length,1));
test('rejects uncited claims and non-HTTPS links', () => {
    const copy = structuredClone(candidate);
    copy.groundingMetadata.groundingSupports[0].segment.text = 'Invented claim';
    assert.equal(supportedSources(copy).sources.length,0);
    copy.groundingMetadata.groundingChunks[0].web.uri = 'javascript:alert(1)';
    assert.equal(supportedSources(copy).sources.length,0);
});
test('fails closed without evidence of a search', () => assert.throws(() => supportedSources({content:candidate.content})));
