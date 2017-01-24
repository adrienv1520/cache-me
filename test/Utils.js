const { expect } = require('./common');
const path = require('path');
const Utils = require('../../cache/Utils');
const ReadStream = require('stream').Readable;

const {
  getJSONSync,
  getFileSync,
  getJSON,
  getFileStream,
  time,
} = Utils;

const fixtures = path.join(__dirname, '../fixtures');
const goodJson = path.join(fixtures, 'good.json');
const badJson = path.join(fixtures, 'bad.json');
const phantom = '';

describe('Utils', function() {
  describe('time', function() {
    it('should set second in milliseconds', function() {
      expect(time.second).to.equal(1000);
    });

    it('should set minute in milliseconds', function() {
      expect(time.minute).to.equal(60 * 1000);
    });

    it('should set hour in milliseconds', function() {
      expect(time.hour).to.equal(60 * 60 * 1000);
    });

    it('should set hour in milliseconds', function() {
      expect(time.day).to.equal(24 * 60 * 60 * 1000);
    });

    describe('#hrms()', function() {
      context('when the parameter is not an array', function() {
        it('should return NaN', function() {
          expect(time.hrms()).to.be.NaN;
          expect(time.hrms('')).to.be.NaN;
          expect(time.hrms(null)).to.be.NaN;
          expect(time.hrms(undefined)).to.be.NaN;
          expect(time.hrms(NaN)).to.be.NaN;
        });
      });

      context('when the parameter is an array', function() {
        it('should return a formated numberwith 6 decimals', function() {
          expect(time.hrms([5, 5])).to.be.equal(5000.000005);
          expect(time.hrms([0, 5])).to.be.equal(0.000005);
          expect(time.hrms([5, 5])).to.be.equal(5000.000005);
        });

        it('should return NaN if the number does not contain 2 numbers (seconds, nanoseconds) or numbers are less than 0', function() {
          expect(time.hrms([])).to.be.NaN;
          expect(time.hrms(['hi', 'there'])).to.be.NaN;
          expect(time.hrms([5, ''])).to.be.NaN;
          expect(time.hrms(['', 5])).to.be.NaN;
          expect(time.hrms([-1, 5])).to.be.NaN;
          expect(time.hrms([1, -5])).to.be.NaN;
          expect(time.hrms([-1, -5])).to.be.NaN;
        });
      });
    });

    describe('#round()', function() {
      context('when the number of decimals is not specified or not a number', function() {
        it('should return a rounded value if a float or the number if an integer', function() {
          expect(time.round(5.7)).to.be.a('string');
          expect(time.round(6)).to.be.a('string');
          expect(time.round(5.7)).to.equal('6');
          expect(time.round(6)).to.equal('6');
          expect(time.round(5.7, 'no decimals')).to.equal('6');
          expect(time.round(6, 'no decimals')).to.equal('6');
          expect(time.round(5.7, null)).to.equal('6');
          expect(time.round(6, null)).to.equal('6');
          expect(time.round(5.7, undefined)).to.equal('6');
          expect(time.round(6, undefined)).to.equal('6');
          expect(time.round(5.7, NaN)).to.equal('6');
          expect(time.round(6, NaN)).to.equal('6');
        });
      });

      context('when the number of decimals is strictly less than 0 or greater than 15', function() {
        it('should not take into account the number of decimals and set it to 0', function() {
          expect(time.round(5.7, -1)).to.be.a('string');
          expect(time.round(5.7, 16)).to.be.a('string');
          expect(time.round(6, -2)).to.be.a('string');
          expect(time.round(6, 17)).to.be.a('string');
          expect(time.round(5.7, -1)).to.equal('6');
          expect(time.round(5.7, 16)).to.equal('6');
          expect(time.round(5.7, 0)).to.equal('6');
          expect(time.round(5.7, 15)).to.equal('5.700000000000000');
          expect(time.round(6, -2)).to.equal('6');
          expect(time.round(6, 17)).to.equal('6');
          expect(time.round(6, 0)).to.equal('6');
          expect(time.round(6, 15)).to.equal('6.000000000000000');
        });
      });

      context('when the number and the number of decimals are not specified or not numbers', function() {
        it('should return "0"', function() {
          expect(time.round()).to.be.a('string').and.to.equal('0');
          expect(time.round('a number')).to.be.a('string').and.to.equal('0');
          expect(time.round('a number', 'number of decimals')).to.be.a('string').and.to.equal('0');
          expect(time.round(NaN)).to.be.a('string').and.to.equal('0');
          expect(time.round(NaN, NaN)).to.be.a('string').and.to.equal('0');
          expect(time.round(null, null)).to.be.a('string').and.to.equal('0');
          expect(time.round(undefined, undefined)).to.be.a('string').and.to.equal('0');
        });
      });

      context('when the number and the number of decimals are specified and numbers', function() {
        it('should return a rounded value if a float or the number if an integer', function() {
          expect(time.round(5.7, 1)).to.be.a('string').and.to.equal('5.7');
          expect(time.round(5.7)).to.equal('6');
          expect(time.round(5.74, 2)).to.equal('5.74');
          expect(time.round(5.747, 2)).to.equal('5.75');
          expect(time.round(5.7472, 3)).to.equal('5.747');
          expect(time.round(5.7479, 3)).to.equal('5.748');
        });
      });
    });

    describe('#precision()', function() {
      context('when the number of decimals is not specified or not a number', function() {
        it('should return the rounded value with only one decimal', function() {
          expect(time.precision(5.75)).to.be.a('string');
          expect(time.precision(6)).to.be.a('string');
          expect(time.precision(5.75)).to.equal('5.7');
          expect(time.precision(6)).to.equal('6.0');
          expect(time.precision(0)).to.equal('0.0');
          expect(time.precision(5.75, 'no decimals')).to.equal('5.7');
          expect(time.precision(6, 'no decimals')).to.equal('6.0');
          expect(time.precision(5.75, null)).to.equal('5.7');
          expect(time.precision(6, null)).to.equal('6.0');
          expect(time.precision(5.75, undefined)).to.equal('5.7');
          expect(time.precision(6, undefined)).to.equal('6.0');
          expect(time.precision(5.75, NaN)).to.equal('5.7');
          expect(time.precision(6, NaN)).to.equal('6.0');
        });
      });

      context('when the number and the number of decimals are not specified or not numbers', function() {
        it('should return a "0.0" string', function() {
          expect(time.precision()).to.be.a('string').and.to.equal('0.0');
          expect(time.precision('a number')).to.be.a('string').and.to.equal('0.0');
          expect(time.precision('a number', 'number of decimals')).to.be.a('string').and.to.equal('0.0');
          expect(time.precision(NaN)).to.be.a('string').and.to.equal('0.0');
          expect(time.precision(NaN, NaN)).to.be.a('string').and.to.equal('0.0');
          expect(time.precision(null, null)).to.be.a('string').and.to.equal('0.0');
          expect(time.precision(undefined, undefined)).to.be.a('string').and.to.equal('0.0');
        });
      });

      context('when the number of decimals is strictly less than 1', function() {
        it('should not take into account the number of decimals and set it to 1', function() {
          expect(time.precision(5, 0)).to.be.a('string').and.to.equal('5.0');
          expect(time.precision(5, -1)).to.be.a('string').and.to.equal('5.0');
          expect(time.precision(5, -100)).to.be.a('string').and.to.equal('5.0');
          expect(time.precision(5.7, 0)).to.be.a('string').and.to.equal('5.7');
          expect(time.precision(5.75, 0)).to.be.a('string').and.to.equal('5.7');
          expect(time.precision(5.7, -1)).to.be.a('string').and.to.equal('5.7');
          expect(time.precision(5.75, -10)).to.be.a('string').and.to.equal('5.7');
        });
      });

      context('when the number and the number of decimals are specified and numbers', function() {
        it('should return a formatted string : integer.decimals with the desired number of decimals', function() {
          expect(time.precision(5, 0)).to.be.a('string').and.to.equal('5.0');
          expect(time.precision(0, 2)).to.be.a('string').and.to.equal('0.00');
          expect(time.precision(5.7, 1)).to.be.a('string').and.to.equal('5.7');
          expect(time.precision(5.7, 2)).to.be.a('string').and.to.equal('5.70');
          expect(time.precision(5.7557, 3)).to.be.a('string').and.to.equal('5.755');
          expect(time.precision(5, 9)).to.be.a('string').and.to.equal('5.000000000');
        });
      });
    });

    describe('#start()', function() {
      context('when the label name is not a string', function() {
        it('should throw an error', function() {
          expect(() => {
            time.start();
          }).to.throw(Error);

          expect(() => {
            time.start('');
          }).to.throw(Error);

          expect(() => {
            time.start('   ');
          }).to.throw(Error);

          expect(() => {
            time.start(null);
          }).to.throw(Error);

          expect(() => {
            time.start(undefined);
          }).to.throw(Error);

          expect(() => {
            time.start(NaN);
          }).to.throw(Error);

          expect(() => {
            time.start([]);
          }).to.throw(Error);
        });
      });

      context('when the label name already exists', function() {
        before(function() {
          time.start('label');
        });

        it('should throw an error', function() {
          expect(() => {
            time.start('label');
          }).to.throw(Error);
        });

        after(function() {
          time.end('label');
        });
      });

      context('when the label name is a string and does not already exist', function() {
        it('should store the label name object', function() {
          time.start('test');
          expect(time.labels.test).to.exist;
          expect(time.labels.test).to.have.property('startTime');
          expect(time.labels.test).to.have.property('name', 'test');
          time.end('test');
        });
      });
    });

    describe('#end()', function() {
      context('when the label name is not a string', function() {
        it('should throw an error', function() {
          expect(() => {
            time.end();
          }).to.throw(Error);

          expect(() => {
            time.end('');
          }).to.throw(Error);

          expect(() => {
            time.end('     ');
          }).to.throw(Error);

          expect(() => {
            time.end(null);
          }).to.throw(Error);

          expect(() => {
            time.end(undefined);
          }).to.throw(Error);

          expect(() => {
            time.end(NaN);
          }).to.throw(Error);

          expect(() => {
            time.end([]);
          }).to.throw(Error);
        });
      });

      context('when the label name does not exist', function() {
        it('should throw an error', function() {
          const label = 'this label does not exist';

          expect(time.labels[label]).to.not.exist;

          expect(() => {
            time.end(label);
          }).to.throw(Error);
        });
      });

      context('when the label name exists', function() {
        const label = 'labelToEnd';

        before(function() {
          time.start(label);
        });

        it('should not throw an error and delete the label-named timer from time labels', function() {
          expect(() => {
            time.end(label);
          }).to.not.throw(Error);

          expect(time.labels[label]).to.not.exist;
        });
      });
    });
  });

  describe('#getFileStream()', function() {
    context('when file exists', function() {
      it('should resolve a stream', function(done) {
        getFileStream(goodJson)
        .then((rstream) => {
          expect(rstream).to.be.a.ReadableStream;
          done();
        })
        .catch(err => done(err));
      });
    });

    context('when file does not exist', function() {
      it('should reject with an error', function(done) {
        expect(getFileStream(phantom)).to.be.rejectedWith(Error).and.notify(done);
      });
    });
  });

  describe('#getJSON()', function() {
    context('when file has a correct JSON format', function() {
      it('should resolve with a JavaScript Object', function(done) {
        getJSON(goodJson)
        .then((obj) => {
          expect(obj).to.have.property('json').that.equals('for life');
          done();
        })
        .catch(err => done(err));
      });
    });

    context('when file has an invalid JSON format', function() {
      it('should reject with a syntax error', function(done) {
        expect(getJSON(badJson)).to.be.rejectedWith(SyntaxError).and.notify(done);
      });
    });

    context('when file does not exist', function() {
      it('should reject with an error', function(done) {
        expect(getJSON(phantom)).to.be.rejectedWith(Error).and.notify(done);
      });
    });
  });

  describe('#getJSONSync()', function() {
    context('when file has a correct JSON format', function() {
      it('should return a JavaScript Object', function() {
        const obj = getJSONSync(goodJson);

        expect(obj).to.have.property('json').that.equals('for life');
      });
    });

    context('when file has an invalid JSON format or does not exist', function() {
      it('should return the default data option, set to an empty object by default', function() {
        // empty {}
        const emptyFromBadJson = getJSONSync(badJson);
        expect(emptyFromBadJson).to.be.a('object').and.to.be.empty;

        const emptyFromPhantom = getJSONSync(phantom);
        expect(emptyFromPhantom).to.be.a('object').and.to.be.empty;

        // empty []
        const arrayFromBadJson = getJSONSync(badJson, []);
        expect(arrayFromBadJson).to.be.a('array').and.to.be.empty;

        const arrayFromPhantom = getJSONSync(phantom, []);
        expect(arrayFromPhantom).to.be.a('array').and.to.be.empty;

        // undefined
        const undefinedFromBadJson = getJSONSync(badJson, undefined);
        expect(undefinedFromBadJson).to.be.undefined;

        const undefinedFromPhantom = getJSONSync(phantom, undefined);
        expect(undefinedFromPhantom).to.be.undefined;

        // null
        const nullFromBadJson = getJSONSync(badJson, null);
        expect(nullFromBadJson).to.be.null;

        const nullFromPhantom = getJSONSync(phantom, null);
        expect(nullFromPhantom).to.be.null;

        // NaN
        const nanFromBadJson = getJSONSync(badJson, NaN);
        expect(nanFromBadJson).to.be.NaN;

        const nanFromPhantom = getJSONSync(phantom, NaN);
        expect(nanFromPhantom).to.be.NaN;

        // 5
        const fiveFromBadJson = getJSONSync(badJson, 5);
        expect(fiveFromBadJson).to.equals(5);

        const fiveFromPhantom = getJSONSync(phantom, 5);
        expect(fiveFromPhantom).to.equals(5);
      });
    });
  });
});
