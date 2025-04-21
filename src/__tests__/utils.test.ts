import { generateOutPutFileId, generateCode } from '../services/utils.js';

describe('utils.ts functions', () => {
  describe('generateOutPutFileId function', () => {
    it('should generate a valid output file ID', () => {
      const objectKey = 'example.txt';
      const result = generateOutPutFileId(objectKey);
      expect(result).toContain('example');
      expect(result).toMatch(/\d{8}_example/); // 日期格式验证
    });
  });

  describe('generateCode function', () => {
    it('should generate a code of specified length', () => {
      const length = 8;
      const code = generateCode(length);
      expect(code).toHaveLength(length);
    });

    it('should generate a secure random code', () => {
      const code = generateCode(6, true);
      expect(code).toMatch(/^[A-Za-z0-9]+$/);
    });
  });
});
