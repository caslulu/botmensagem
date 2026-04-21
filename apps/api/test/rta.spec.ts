import path from 'node:path';
import { RtaService } from '../src/rta/rta.service';

describe('RtaService template selection', () => {
  it('selects supported carrier templates and falls back to allstate', () => {
    const service = new RtaService({} as any);
    const progressive = service.getTemplatePath('progressive');
    const fallback = service.getTemplatePath('unknown');

    expect(path.basename(progressive)).toBe('rta_template_progressive.pdf');
    expect(path.basename(fallback)).toBe('rta_template_allstate.pdf');
  });
});
