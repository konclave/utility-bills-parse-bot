import { describe, it } from 'node:test';
import { resolve } from 'node:path'
import assert from 'node:assert';
import { readFileSync } from 'fs';

describe('parse with real PDF files', async (t) => {
  it('should parse heating value from PDF with heating', async () => {
    // Import without any mocks
    const { parse } = await import('../parse-water.js');
    
    // Read the actual PDF file with heating
    const pdfWithHeating = readFileSync(resolve(import.meta.dirname, 'water_with_heating.pdf'));
    const result = await parse(pdfWithHeating);
    
    // Should return an array of messages
    assert.ok(Array.isArray(result), 'Should return an array');
    assert.ok(result.length >= 2, 'Should have at least 2 messages (water + heating)');
    
    // Find the heating message
    const heatingMessage = result.find(msg => msg.text && msg.text.includes('🔥: 723.40 ₽'));
    assert.ok(heatingMessage, 'Should have heating message');
    assert.strictEqual(heatingMessage.value, 723.40, 'Should have heating value');
    
    // Find the water message
    const waterMessage = result.find(msg => msg.text && msg.text.includes('💧:'));
    assert.ok(waterMessage, 'Should have water message');
    assert.ok(waterMessage.value > 0, 'Should have positive water bill value');
  });

  it('should handle PDF without heating gracefully', async () => {
    // Import without any mocks
    const { parse } = await import('../parse-water.js');
    
    // Read the actual PDF file without heating
    const pdfWithoutHeating = readFileSync(resolve(import.meta.dirname, 'water_invoice.pdf'));
    const result = await parse(pdfWithoutHeating);
    
    // Should return an array of messages
    assert.ok(Array.isArray(result), 'Should return an array');
    
    // Should not have any heating messages
    const heatingMessage = result.find(msg => msg.text && msg.text.includes('🔥:'));
    assert.ok(!heatingMessage, 'Should not have heating message');
    
    // Find the water message
    const waterMessage = result.find(msg => msg.text && msg.text.includes('💧:'));
    assert.ok(waterMessage, 'Should have water message');
    assert.ok(waterMessage.value > 0, 'Should have positive water bill value');
  });
});
