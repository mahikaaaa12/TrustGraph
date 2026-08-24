const path = require('path');
const upload = require('../../src/middlewares/upload.middleware');

describe('Upload Security & File Filter Unit Tests', () => {
  it('should block dangerous script and executable extensions embedded in filename', (done) => {
    const fileFilter = upload.fileFilter;
    const req = {};
    const maliciousFile = {
      originalname: 'exploit.php.jpg',
      mimetype: 'image/jpeg',
    };

    fileFilter(req, maliciousFile, (err, isAllowed) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('Executable or dangerous script extension detected');
      expect(isAllowed).toBe(false);
      done();
    });
  });

  it('should block executable .exe file renamed as pdf', (done) => {
    const fileFilter = upload.fileFilter;
    const req = {};
    const file = {
      originalname: 'malware.exe',
      mimetype: 'application/pdf',
    };

    fileFilter(req, file, (err, isAllowed) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(400);
      expect(isAllowed).toBe(false);
      done();
    });
  });

  it('should allow legitimate clean PDF and image uploads', (done) => {
    const fileFilter = upload.fileFilter;
    const req = {};
    const validFile = {
      originalname: 'annual_report_2026.pdf',
      mimetype: 'application/pdf',
    };

    fileFilter(req, validFile, (err, isAllowed) => {
      expect(err).toBeNull();
      expect(isAllowed).toBe(true);
      done();
    });
  });
});
