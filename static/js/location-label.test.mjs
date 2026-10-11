import test from 'node:test';
import assert from 'node:assert/strict';
// Load the browser module as source; the project has no Node module-type setting.
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('./location-label.js',import.meta.url),'utf8');
const { locationLabel } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('shows road, suburb and city, not a long display_name', () => {
    assert.equal(locationLabel({address:{road:'Example Road',suburb:'Labram',city:'Kimberley',house_number:'14'},display_name:'Long address'}),'Near 14 Example Road, Labram, Kimberley');
});
test('deduplicates names and never falls back to coordinates', () => {
    assert.equal(locationLabel({address:{suburb:'Labram',municipality:'Sol Plaatje Local Municipality'}}),'Your current GPS position');
    assert.equal(locationLabel({lat:12,lon:20}),'Your current GPS position');
    assert.equal(locationLabel(null),'Your current GPS position');
});
test('prioritizes mapped buildings without pretending they are exact GPS occupancy', () => {
    assert.equal(locationLabel({address:{amenity:'Example Library',road:'Example Road',city:'Kimberley'}}),'Near Example Library, Example Road, Kimberley');
});
