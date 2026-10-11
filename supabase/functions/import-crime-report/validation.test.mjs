import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, validateExtraction } from './validation.mjs';
const article = { source_url:'https://example.org/report', source_name:'Test source', published_at:'2020-01-02T00:00:00Z', text:'A reported shooting occurred in Kimberley on 1 January 2020. Authorities are investigating the incident.' };
const extraction = { relevant:true, incident_type:'shooting', location:'Kimberley', summary:'Authorities reported a shooting in Kimberley.', event_date:null, location_quote:'Kimberley', incident_quote:'reported shooting', latitude:12 };
test('accepts allowed source and strips model coordinates', () => {
    assert.equal(validateInput(article, ['example.org']).source_name, 'Test source');
    assert.equal(validateExtraction(extraction, article).latitude, undefined);
});
test('rejects unknown hosts and future publication', () => {
    assert.throws(() => validateInput(article, ['saps.gov.za']));
    assert.throws(() => validateInput({ ...article, published_at:'2999-01-01' }, ['example.org']));
});
test('rejects invented evidence, dates and unrelated reports', () => {
    assert.throws(() => validateExtraction({ ...extraction, incident_quote:'invented' }, article));
    assert.throws(() => validateExtraction({ ...extraction, event_date:'2020-02-30', date_quote:'1 January 2020' }, article));
    assert.throws(() => validateExtraction({ ...extraction, relevant:false }, article));
});
