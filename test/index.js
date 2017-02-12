const { expect } = require('./common');
const fs = require('fs');
const path = require('path');

const cacheLibDirectory = path.join(__dirname, '../lib');
const filesDirectory = path.join(__dirname, '../files');

const cache = require(cacheLibDirectory);
const Utils = require(path.join(cacheLibDirectory, 'Utils'));

const {
  confExtension,
  is,
  encodings,
  time: {
    second,
    minute,
    hour,
    day,
  },
  getFileStream,
  getJSONSync,
  getJSON,
} = Utils;

const phantom = '';

const obj = {
  name: 'test',
  data: '.test { color: red; }',
  encoding: 'utf8',
  time: 1 * day,
  relatedData: 'related',
};

const objOverride = Object.assign({}, obj, { override: true });

const objNoOverride = Object.assign({}, obj, { override: false });

const mayfly = {
  name: 'mayfly',
  data: 'ephemerid',
  encoding: 'base64',
  time: 2 * second,
  relatedData: 'related',
};

// the conf obj that should be stored in cache according to "obj" parameters
const confObjBase = {
  name: obj.name,
  data: obj.data,
  relatedData: obj.relatedData,
  file: {
    path: path.join(filesDirectory, `${obj.name}${confExtension}_${obj.name}`),
    saved: true,
    encoding: obj.encoding,
  },
  lastModified: Date.now(),
  expires: Date.now() + obj.time,
};

// the conf obj that should be stored in cache with some other parameters to notice overriding
const confObjAlter = {
  name: obj.name,
  data: 'other data',
  relatedData: 'other related data',
  file: {
    path: path.join(filesDirectory, `${obj.name}${confExtension}_${obj.name}`),
    saved: true,
    encoding: obj.encoding,
  },
  lastModified: Date.now(),
  expires: Date.now() + obj.time,
};

// the conf obj that should be stored in cache according to "mayfly" parameters
const confObjMayfly = {
  name: mayfly.name,
  data: mayfly.data,
  relatedData: mayfly.relatedData,
  file: {
    path: path.join(filesDirectory, `${mayfly.name}${confExtension}_${mayfly.name}`),
    saved: true,
    encoding: mayfly.encoding,
  },
  lastModified: Date.now(),
  expires: Date.now() + mayfly.time,
};

describe('cache', function() {
  before(function(done) {
    fs.mkdir(filesDirectory, (err) => {
      if (err && err.code !== 'EEXIST') {
        done(err);
      } else {
        console.log('files cache directory is set');
        done();
      }
    });
  });

  describe('#clear()', function() {
    context('when files are in cache', function() {
      before(function() {
        fs.writeFileSync(path.join(filesDirectory, '_test_file_1_'), 'test');
        fs.writeFileSync(path.join(filesDirectory, '_test_file_2'), 'test');
      });

      it('should delete all files', function(done) {
        expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.not.be.empty;

        cache.clear()
        .then(() => {
          expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;

          done();
        })
        .catch((err) => done(err));
      });
    });

    context('when files cache directory is empty', function() {
      before(function(done) {
        try {
          const files = fs.readdirSync(filesDirectory);
          files.forEach(file => fs.unlinkSync(path.join(filesDirectory, file)));
          expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;

          done();
        } catch (e) {
          done(e);
        }
      });

      it('should delete nothing', function(done) {
        expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;

        cache.clear()
        .then(() => {
          expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;
          done();
        })
        .catch(err => done(err));
      });
    });
  });

  describe('#clearSync()', function() {
    context('when files are in cache', function() {
      before(function() {
        fs.writeFileSync(path.join(filesDirectory, '_test_file_1_'), 'test');
        fs.writeFileSync(path.join(filesDirectory, '_test_file_2'), 'test');
      });

      it('should delete all files', function() {
        expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.not.be.empty;

        const cleared = cache.clearSync();

        expect(cleared).to.be.true;
        expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;
      });
    });

    context('when files cache directory is empty', function() {
      before(function(done) {
        try {
          const files = fs.readdirSync(filesDirectory);
          files.forEach(file => fs.unlinkSync(path.join(filesDirectory, file)));
          expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;

          done();
        } catch (e) {
          done(e);
        }
      });

      it('should delete nothing', function() {
        expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;

        const cleared = cache.clearSync();

        expect(cleared).to.be.true;
        expect(fs.readdirSync(filesDirectory)).to.be.a('array').and.to.be.empty;
      });
    });
  });

  describe('#set()', function() {
    context('when setting a no-named object or with no data', function() {
      it('should reject with an error if no param', function(done) {
        expect(cache.set()).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if empty param', function(done) {
        expect(cache.set({})).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name is an empty string', function(done) {
        expect(cache.set({ name: '' })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name only contains white spaces', function(done) {
        expect(cache.set({ name: '     ' })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if no data', function(done) {
        expect(cache.set({ name: 'test' })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if data is undefined', function(done) {
        expect(cache.set({ name: 'test', data: undefined })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if data is null', function(done) {
        expect(cache.set({ name: 'test', data: null })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if data is NaN', function(done) {
        expect(cache.set({ name: 'test', data: NaN })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if data is an empty string', function(done) {
        expect(cache.set({ name: 'test', data: '' })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if no name', function(done) {
        expect(cache.set({ data: {} })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name is undefined', function(done) {
        expect(cache.set({ name: undefined, data: {} })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name is null', function(done) {
        expect(cache.set({ name: null, data: {} })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name is NaN', function(done) {
        expect(cache.set({ name: NaN, data: {} })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name is an empty string', function(done) {
        expect(cache.set({ name: '', data: {} })).to.be.rejectedWith(Error).and.notify(done);
      });

      it('should reject with an error if name only contains white spaces', function(done) {
        expect(cache.set({ name: '     ', data: {} })).to.be.rejectedWith(Error).and.notify(done);
      });
    });

    context('when the named object is already in cache', function() {
      context('when overriding', function() {
        before(function(done) {
          cache.clearSync();

          try {
            fs.writeFileSync(path.join(filesDirectory, `${confObjAlter.name}${confExtension}`), confObjAlter);
            fs.writeFileSync(confObjAlter.file.path, confObjAlter.data);
            done();
          } catch (e) {
            done(e);
          }
        });

        it('should truncate the conf file and the data file with base parameters', function(done) {
          cache.set(objOverride)
          .then((confObj) => {
            const files = fs.readdirSync(filesDirectory);
            expect(files).to.be.a('array').and.to.not.be.empty;
            expect(files).to.include(`${obj.name}${confExtension}`);
            expect(files).to.include(`${obj.name}${confExtension}_${obj.name}`);

            const confObjInFile = getJSONSync(path.join(filesDirectory, `${obj.name}${confExtension}`));
            expect(confObjInFile).to.have.property('name', confObjBase.name);
            expect(confObjInFile).to.have.property('data', confObjBase.data);
            expect(confObjInFile).to.have.property('relatedData', confObjBase.relatedData);
            expect(confObjInFile).to.have.deep.property('file.path', confObjBase.file.path);
            expect(confObjInFile).to.have.deep.property('file.encoding', confObjBase.file.encoding);

            const data = fs.readFileSync(path.join(filesDirectory, `${obj.name}${confExtension}_${obj.name}`));
            expect(data.toString()).to.equal(confObjBase.data);

            expect(confObj).to.exist.and.to.be.a('object');
            expect(confObj).to.have.property('name', confObjBase.name);
            expect(confObj).to.have.property('data', confObjBase.data);
            expect(confObj).to.have.property('relatedData', confObjBase.relatedData);
            expect(confObj).to.have.deep.property('file.path', confObjBase.file.path);
            expect(confObj).to.have.deep.property('file.saved', true);
            expect(confObj).to.have.deep.property('file.encoding', confObjBase.file.encoding);
            expect(confObj).to.have.property('lastModified');
            expect(confObj).to.have.property('expires');
            expect(confObj.expires - confObj.lastModified).to.equal(obj.time);

            done();
          })
          .catch(err => done(err));
        })
      });

      context('when not overriding', function() {
        before(function(done) {
          cache.clearSync();

          try {
            fs.writeFileSync(path.join(filesDirectory, `${confObjBase.name}${confExtension}`), confObjBase);
            fs.writeFileSync(confObjBase.file.path, confObjBase.data);
            done();
          } catch (e) {
            done(e);
          }
        });

        it('should not truncate and reject with an error', function(done) {
          expect(cache.set(objNoOverride)).to.be.rejectedWith(Error).and.notify(done);
        });
      });
    });

    context('when the named object is not in cache', function() {
      before(function() {
        cache.clearSync();
      });

      it('should add a conf file and a data file in the cache files directory', function(done) {
        cache.set(obj)
        .then((confObj) => {
          const files = fs.readdirSync(filesDirectory);
          expect(files).to.be.a('array').and.to.not.be.empty;
          expect(files).to.include(`${obj.name}${confExtension}`);
          expect(files).to.include(`${obj.name}${confExtension}_${obj.name}`);

          const data = fs.readFileSync(path.join(filesDirectory, `${obj.name}${confExtension}_${obj.name}`))
          expect(data.toString()).to.equal(obj.data);

          expect(confObj).to.exist.and.to.be.a('object');
          expect(confObj).to.have.property('name', confObjBase.name);
          expect(confObj).to.have.property('data', confObjBase.data);
          expect(confObj).to.have.property('relatedData', confObjBase.relatedData);
          expect(confObj).to.have.deep.property('file.path', confObjBase.file.path);
          expect(confObj).to.have.deep.property('file.saved', true);
          expect(confObj).to.have.deep.property('file.encoding', confObjBase.file.encoding);
          expect(confObj).to.have.property('lastModified');
          expect(confObj).to.have.property('expires');
          expect(confObj.expires - confObj.lastModified).to.equal(obj.time);

          done();
        })
        .catch(err => done(err));
      });

      after(function() {
        cache.clearSync();
      });
    });

    context('when no other parameter than name and data are set', function() {
      before(function() {
        cache.clearSync();
      });

      it('should set the confObj to the default values', function(done) {
        const testObj1 = { name: 'test1', data: 'test1' };
        const testObj2 = { name: 'test2', data: Buffer.from('test2') };

        Promise.all([
          cache.set(testObj1),
          cache.set(testObj2),
        ])
        .then(([confObj1, confObj2]) => {
          expect(confObj1).to.deep.equal(getJSONSync(path.join(filesDirectory, `${testObj1.name}${confExtension}`)));
          expect(confObj1).to.exist.and.to.be.a('object');
          expect(confObj1).to.have.property('name', testObj1.name);
          expect(confObj1).to.have.property('data', testObj1.data);
          expect(confObj1).to.have.property('relatedData');
          expect(confObj1.relatedData).to.be.a('object').and.to.be.empty;
          expect(confObj1).to.have.deep.property('file.path', path.join(filesDirectory, `${testObj1.name}${confExtension}_${testObj1.name}`));
          expect(confObj1).to.have.deep.property('file.saved', true);
          expect(confObj1).to.have.deep.property('file.encoding', 'utf8');
          expect(confObj1).to.have.property('lastModified');
          expect(confObj1).to.have.property('expires');
          expect(confObj1.expires - confObj1.lastModified).to.equal(1 * hour);

          expect(confObj2).to.exist.and.to.be.a('object');
          expect(confObj2).to.have.property('name', testObj2.name);
          expect(confObj2).to.have.property('data', testObj2.data);
          expect(confObj2).to.have.property('relatedData');
          expect(confObj2.relatedData).to.be.a('object').and.to.be.empty;
          expect(confObj2).to.have.deep.property('file.path', path.join(filesDirectory, `${testObj2.name}${confExtension}_${testObj2.name}`));
          expect(confObj2).to.have.deep.property('file.saved', true);
          expect(confObj2).to.have.deep.property('file.encoding', 'binary');
          expect(confObj2).to.have.property('lastModified');
          expect(confObj2).to.have.property('expires');
          expect(confObj2.expires - confObj2.lastModified).to.equal(1 * hour);

          done();
        })
        .catch(err => done(err));
      });

      after(function() {
        cache.clearSync();
      });
    });
  });

  describe('#hasSync()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object is in cache', function() {
      before(function(done) {
        Promise.all([
          cache.set(obj),
          cache.set(mayfly),
        ])
        .then(() => done())
        .catch(err => done(err));
      });

      it('should return true if in cache and has not expired', function() {
        expect(cache.hasSync(obj.name)).to.be.true;
        expect(cache.hasSync(mayfly.name)).to.be.true;
      });

      it('should return false if has expired', function(done) {
        setTimeout(() => {
          expect(cache.hasSync(mayfly.name)).to.be.false;
          done();
        }, 2 * second);
      }).timeout(5000);
    });

    context('when the named object is not in cache', function() {
      it('should return false', function() {
        expect(cache.hasSync(obj.name)).to.be.true;
        expect(cache.hasSync(phantom)).to.be.false;
      });
    });

    after(function() {
      cache.clearSync();
    });
  });

  describe('#get()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object is in cache', function() {
      before(function(done) {
        Promise.all([
          cache.set(obj),
          cache.set(mayfly),
        ])
        .then(() => done())
        .catch(err => done(err));
      });

      it('should resolve with an object containing the confObj and the data file rstream', function(done) {
        cache.get(obj.name)
        .then(({ confObj, rstream }) => {
          expect(confObj).to.exist.and.to.be.a('object');
          expect(confObj).to.have.property('name', confObjBase.name);
          expect(confObj).to.have.property('data', confObjBase.data);
          expect(confObj).to.have.property('relatedData', confObjBase.relatedData);
          expect(confObj).to.have.deep.property('file.path', confObjBase.file.path);
          expect(confObj).to.have.deep.property('file.saved', true);
          expect(confObj).to.have.deep.property('file.encoding', confObjBase.file.encoding);
          expect(confObj).to.have.property('lastModified');
          expect(confObj).to.have.property('expires');
          expect(confObj.expires - confObj.lastModified).to.equal(obj.time);

          expect(rstream).to.exist.and.to.be.a.ReadableStream;
          done();
        })
        .catch(err => done(err));
      });

      it('should reject with an error, the confObj and the rstream if has expired', function(done) {
        setTimeout(() => {
          cache.get(mayfly.name)
          .then(() => done(new Error(`${mafly.name} should have been expired`)))
          .catch(({ err, confObj, rstream}) => {
            expect(err).to.exist;
            expect(err.code).equal('EXPIRED');

            expect(confObj).to.exist.and.to.be.a('object');
            expect(confObj).to.have.property('name', confObjMayfly.name);
            expect(confObj).to.have.property('data', confObjMayfly.data);
            expect(confObj).to.have.property('relatedData', confObjMayfly.relatedData);
            expect(confObj).to.have.deep.property('file.path', confObjMayfly.file.path);
            expect(confObj).to.have.deep.property('file.saved', true);
            expect(confObj).to.have.deep.property('file.encoding', confObjMayfly.file.encoding);
            expect(confObj).to.have.property('lastModified');
            expect(confObj).to.have.property('expires');
            expect(confObj.expires - confObj.lastModified).to.equal(mayfly.time);

            expect(rstream).to.exist.and.to.be.a.ReadableStream;
            done();
          });
        }, 2 * second);
      }).timeout(5000);
    });

    context('when the named object is not in cache', function() {
      it('should reject with an error', function(done) {
        cache.get(phantom)
        .then(() => done(new Error(`"${phantom}" should not have been found in cache`)))
        .catch(({ err, confObj, rstream }) => {
          expect(err).to.exist;
          expect(err.code).not.equal('EXPIRED');
          expect(err.code).equal('ENOENT');

          expect(confObj).to.not.exist;
          expect(rstream).to.not.exist;
          done();
        });
      });
    });

    after(function() {
      cache.clearSync();
    });
  });

  describe('#getSync()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object is in cache', function() {
      before(function(done) {
        Promise.all([
          cache.set(obj),
          cache.set(mayfly),
        ])
        .then(() => done())
        .catch(err => done(err));
      });

      it('should return the confObj if has not expired', function() {
        const confObj = cache.getSync(obj.name);

        expect(confObj).to.exist.and.to.be.a('object');
        expect(confObj).to.have.property('name', confObjBase.name);
        expect(confObj).to.have.property('data', confObjBase.data);
        expect(confObj).to.have.property('relatedData', confObjBase.relatedData);
        expect(confObj).to.have.deep.property('file.path', confObjBase.file.path);
        expect(confObj).to.have.deep.property('file.saved', true);
        expect(confObj).to.have.deep.property('file.encoding', confObjBase.file.encoding);
        expect(confObj).to.have.property('lastModified');
        expect(confObj).to.have.property('expires');
        expect(confObj.expires - confObj.lastModified).to.equal(obj.time);
      });

      it('should return the confObj even if has expired', function(done) {
        setTimeout(() => {
          const confObj = cache.getSync(mayfly.name);

          expect(confObj).to.exist.and.to.be.a('object');
          expect(confObj).to.have.property('name', confObjMayfly.name);
          expect(confObj).to.have.property('data', confObjMayfly.data);
          expect(confObj).to.have.property('relatedData', confObjMayfly.relatedData);
          expect(confObj).to.have.deep.property('file.path', confObjMayfly.file.path);
          expect(confObj).to.have.deep.property('file.saved', true);
          expect(confObj).to.have.deep.property('file.encoding', confObjMayfly.file.encoding);
          expect(confObj).to.have.property('lastModified');
          expect(confObj).to.have.property('expires');
          expect(confObj.expires - confObj.lastModified).to.equal(mayfly.time);
          expect(confObj.expires).to.be.below(Date.now());

          done();
        }, 2 * second);
      }).timeout(5000);
    });

    context('when the named object is not in cache', function() {
      it('should reject with an error', function() {
        expect(cache.getSync(phantom)).to.exist.and.to.be.empty;
      });
    });

    after(function() {
      cache.clearSync();
    });
  });

  describe('#reset()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object to reset is not in cache', function() {
      it('should reject with an error', function(done) {
        expect(cache.reset(phantom)).to.be.rejectedWith(Error).and.notify(done);
      });
    });

    context('when the named object to reset is in cache', function() {
      let lastModifiedWhenFirstSet;
      let expiresWhenFirstSet;
      let originalCacheTime;

      before(function(done) {
        cache.set(obj)
        .then(({ lastModified, expires }) => {
          lastModifiedWhenFirstSet = lastModified;
          expiresWhenFirstSet = expires;
          originalCacheTime = expiresWhenFirstSet - lastModifiedWhenFirstSet;

          setTimeout(done, 500);
        })
        .catch(err => done(err));
      });

      it('should set the new expire time running from now with the original cache time set', function(done) {
        cache.reset(obj.name)
        .then(() => {
          const confObj = cache.getSync(obj.name);

          expect(confObj).to.exist;
          expect(confObj).to.have.property('lastModified');
          expect(confObj).to.have.property('expires');
          expect(confObj.lastModified).to.be.above(lastModifiedWhenFirstSet);
          expect(confObj.expires).to.be.above(expiresWhenFirstSet);
          expect(confObj.expires - confObj.lastModified).to.equal(originalCacheTime);

          done();
        })
        .catch(err => done(err));
      });

      after(function() {
        cache.clearSync();
      });
    });
  });

  describe('#resetSync()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object to reset is not in cache', function() {
      it('should reset nothing', function() {
        expect(cache.resetSync(phantom)).to.be.false;
      });
    });

    context('when the named object to reset is in cache', function() {
      let lastModifiedWhenFirstSet;
      let expiresWhenFirstSet;
      let originalCacheTime;

      before(function(done) {
        cache.set(obj)
        .then(({ lastModified, expires }) => {
          lastModifiedWhenFirstSet = lastModified;
          expiresWhenFirstSet = expires;
          originalCacheTime = expiresWhenFirstSet - lastModifiedWhenFirstSet;

          setTimeout(done, 500);
        })
        .catch(err => done(err));
      });

      it('should set the new expire time running from now with the original cache time set', function() {
        const hasBeenReseted = cache.resetSync(obj.name);
        const confObj = cache.getSync(obj.name);

        expect(hasBeenReseted).to.be.true;
        expect(confObj).to.exist;
        expect(confObj).to.have.property('lastModified');
        expect(confObj).to.have.property('expires');
        expect(confObj.lastModified).to.be.above(lastModifiedWhenFirstSet);
        expect(confObj.expires).to.be.above(expiresWhenFirstSet);
        expect(confObj.expires - confObj.lastModified).to.equal(originalCacheTime);
      });

      after(function() {
        cache.clearSync();
      });
    });
  });

  describe('#delete()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object to delete is not in cache', function() {
      it('should reject with an error', function(done) {
        expect(cache.delete(phantom)).to.be.rejectedWith(Error).and.notify(done);
      });
    });

    context('when the named object to delete is in cache', function() {
      before(function(done) {
        Promise.all([
          cache.set(obj),
          cache.set(mayfly),
        ])
        .then(() => done())
        .catch(err => done(err));
      });

      it('should delete the conf file and the data file', function(done) {
        const files = fs.readdirSync(filesDirectory);

        expect(files.length).to.equal(4);
        expect(files).to.contain(`${obj.name}${confExtension}`);
        expect(files).to.contain(`${obj.name}${confExtension}_${obj.name}`);

        cache.delete(obj.name)
        .then(() => {
          const files = fs.readdirSync(filesDirectory);

          expect(files.length).to.equal(2);
          expect(files).to.not.contain(`${obj.name}${confExtension}`);
          expect(files).to.not.contain(`${obj.name}${confExtension}_${obj.name}`);

          done();
        })
        .catch(err => done(err));
      });

      after(function() {
        cache.clearSync();
      });
    });
  });

  describe('#deleteSync()', function() {
    before(function() {
      cache.clearSync();
    });

    context('when the named object to delete is not in cache', function() {
      it('should delete nothing', function() {
        expect(cache.deleteSync(phantom)).to.be.false;
      });
    });

    context('when the named object to delete is in cache', function() {
      before(function(done) {
        Promise.all([
          cache.set(obj),
          cache.set(mayfly),
        ])
        .then(() => done())
        .catch(err => done(err));
      });

      it('should delete the conf file and the data file', function() {
        const filesBeforeDelete = fs.readdirSync(filesDirectory);
        expect(filesBeforeDelete.length).to.equal(4);
        expect(filesBeforeDelete).to.contain(`${obj.name}${confExtension}`);
        expect(filesBeforeDelete).to.contain(`${obj.name}${confExtension}_${obj.name}`);

        const hasBeenDeleted = cache.deleteSync(obj.name);
        const filesAfterDelete = fs.readdirSync(filesDirectory);

        expect(hasBeenDeleted).to.be.true;
        expect(filesAfterDelete.length).to.equal(2);
        expect(filesAfterDelete).to.not.contain(`${obj.name}${confExtension}`);
        expect(filesAfterDelete).to.not.contain(`${obj.name}${confExtension}_${obj.name}`);
      });

      after(function() {
        cache.clearSync();
      });
    });
  });

  describe('#setParallel()', function() {
    context('when setting a no-named object or with no data', function() {
      it('should callback an error if no param', function(done) {
        cache.setParallel(undefined, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if empty param', function(done) {
        cache.setParallel({}, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if name is an empty string', function(done) {
        cache.setParallel({ name: '' }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should reject with an error if name only contains white spaces', function(done) {
        cache.setParallel({ name: '      ' }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if no data', function(done) {
        cache.setParallel({ name: 'test' }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if data is undefined', function(done) {
        cache.setParallel({ name: 'test', data: undefined }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if data is null', function(done) {
        cache.setParallel({ name: 'test', data: null }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if data is NaN', function(done) {
        cache.setParallel({ name: 'test', data: NaN }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if data is an empty string', function(done) {
        cache.setParallel({ name: 'test', data: '' }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if no name', function(done) {
        cache.setParallel({ data: {} }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if name is undefined and data is defined', function(done) {
        cache.setParallel({ name: undefined, data: {} }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if name is null and data is defined', function(done) {
        cache.setParallel({ name: null, data: {} }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if name is NaN and data is defined', function(done) {
        cache.setParallel({ name: NaN, data: {} }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if name is an empty string and data is defined', function(done) {
        cache.setParallel({ name: '', data: {} }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });

      it('should callback an error if name only contains white spaces and data is defined', function(done) {
        cache.setParallel({ name: '            ', data: {} }, function(err, confObj) {
          expect(err).to.exist.and.to.be.a('error');
          expect(confObj).to.not.exist;
          done();
        });
      });
    });

    context('when the named object is already in cache', function() {
      context('when overriding', function() {
        before(function(done) {
          cache.clearSync();

          try {
            fs.writeFileSync(path.join(filesDirectory, `${confObjAlter.name}${confExtension}`), confObjAlter);
            fs.writeFileSync(confObjAlter.file.path, confObjAlter.data);
            done();
          } catch (e) {
            done(e);
          }
        });

        it('should truncate the conf file and the data file with base parameters', function(done) {
          cache.setParallel(objOverride, function(err, confObj) {
            if (err) {
              done(err);
            } else {
              expect(confObj).to.exist;

              const files = fs.readdirSync(filesDirectory);
              expect(files).to.be.a('array').and.to.not.be.empty;
              expect(files).to.include(`${obj.name}${confExtension}`);
              expect(files).to.include(`${obj.name}${confExtension}_${obj.name}`);

              const confObjInFile = getJSONSync(path.join(filesDirectory, `${obj.name}${confExtension}`));
              expect(confObjInFile).to.have.property('name', confObjBase.name);
              expect(confObjInFile).to.have.property('data', confObjBase.data);
              expect(confObjInFile).to.have.property('relatedData', confObjBase.relatedData);
              expect(confObjInFile).to.have.deep.property('file.path', confObjBase.file.path);
              expect(confObjInFile).to.have.deep.property('file.encoding', confObjBase.file.encoding);

              const data = fs.readFileSync(path.join(filesDirectory, `${obj.name}${confExtension}_${obj.name}`));
              expect(data.toString()).to.equal(confObjBase.data);

              expect(confObj).to.exist.and.to.be.a('object');
              expect(confObj).to.have.property('name', confObjBase.name);
              expect(confObj).to.have.property('data', confObjBase.data);
              expect(confObj).to.have.property('relatedData', confObjBase.relatedData);
              expect(confObj).to.have.deep.property('file.path', confObjBase.file.path);
              expect(confObj).to.have.deep.property('file.saved', true);
              expect(confObj).to.have.deep.property('file.encoding', confObjBase.file.encoding);
              expect(confObj).to.have.property('lastModified');
              expect(confObj).to.have.property('expires');
              expect(confObj.expires - confObj.lastModified).to.equal(obj.time);

              done();
            }
          });
        })
      });

      context('when not overriding', function() {
        before(function(done) {
          cache.clearSync();

          try {
            fs.writeFileSync(path.join(filesDirectory, `${confObjBase.name}${confExtension}`), confObjBase);
            fs.writeFileSync(confObjBase.file.path, confObjBase.data);
            done();
          } catch (e) {
            done(e);
          }
        });

        it('should not truncate and callback an error', function(done) {
          cache.setParallel(objNoOverride, function(err, confObj) {
            expect(err).to.exist.and.to.be.a('error');
            expect(confObj).to.not.exist;
            done();
          });
        });

        after(function() {
          cache.clearSync();
        });
      });
    });

    context('when the named object is not in cache', function() {
      before(function() {
        cache.clearSync();
      });

      it('should add a conf file and a data file in the cache files directory', function(done) {
        cache.setParallel(obj, function(err, confObj) {
          if (err) {
            done(err);
          } else {
            expect(confObj).to.exist;

            const files = fs.readdirSync(filesDirectory);
            expect(files).to.be.a('array').and.to.not.be.empty;
            expect(files).to.include(`${obj.name}${confExtension}`);
            expect(files).to.include(`${obj.name}${confExtension}_${obj.name}`);

            const data = fs.readFileSync(path.join(filesDirectory, `${obj.name}${confExtension}_${obj.name}`))
            expect(data.toString()).to.equal(obj.data);

            expect(confObj).to.exist.and.to.be.a('object');
            expect(confObj).to.have.property('name', confObjBase.name);
            expect(confObj).to.have.property('data', confObjBase.data);
            expect(confObj).to.have.property('relatedData', confObjBase.relatedData);
            expect(confObj).to.have.deep.property('file.path', confObjBase.file.path);
            expect(confObj).to.have.deep.property('file.saved', true);
            expect(confObj).to.have.deep.property('file.encoding', confObjBase.file.encoding);
            expect(confObj).to.have.property('lastModified');
            expect(confObj).to.have.property('expires');
            expect(confObj.expires - confObj.lastModified).to.equal(obj.time);

            done();
          }
        });
      });

      after(function() {
        cache.clearSync();
      });
    });

    context('when no other parameter than name and data are set', function() {
      before(function() {
        cache.clearSync();
      });

      it('should set the confObj to the default values', function(done) {
        const testObj1 = { name: 'test1', data: 'test1' };

        cache.setParallel(testObj1, function(err, confObj) {
          if (err) {
            done(err);
          } else {
            expect(confObj).to.exist;

            expect(confObj).to.deep.equal(getJSONSync(path.join(filesDirectory, `${testObj1.name}${confExtension}`)));
            expect(confObj).to.exist.and.to.be.a('object');
            expect(confObj).to.have.property('name', testObj1.name);
            expect(confObj).to.have.property('data', testObj1.data);
            expect(confObj).to.have.property('relatedData');
            expect(confObj.relatedData).to.be.a('object').and.to.be.empty;
            expect(confObj).to.have.deep.property('file.path', path.join(filesDirectory, `${testObj1.name}${confExtension}_${testObj1.name}`));
            expect(confObj).to.have.deep.property('file.saved', true);
            expect(confObj).to.have.deep.property('file.encoding', 'utf8');
            expect(confObj).to.have.property('lastModified');
            expect(confObj).to.have.property('expires');
            expect(confObj.expires - confObj.lastModified).to.equal(1 * hour);

            done();
          }
        });
      });

      it('should set the confObj to the default values if a Buffer', function(done) {
        const testObj2 = { name: 'test2', data: Buffer.from('test2') };

        cache.setParallel(testObj2, function(err, confObj) {
          if (err) {
            done(err);
          } else {
            expect(confObj).to.exist;

            expect(confObj).to.exist.and.to.be.a('object');
            expect(confObj).to.have.property('name', testObj2.name);
            expect(confObj).to.have.property('data', testObj2.data);
            expect(confObj).to.have.property('relatedData');
            expect(confObj.relatedData).to.be.a('object').and.to.be.empty;
            expect(confObj).to.have.deep.property('file.path', path.join(filesDirectory, `${testObj2.name}${confExtension}_${testObj2.name}`));
            expect(confObj).to.have.deep.property('file.saved', true);
            expect(confObj).to.have.deep.property('file.encoding', 'binary');
            expect(confObj).to.have.property('lastModified');
            expect(confObj).to.have.property('expires');
            expect(confObj.expires - confObj.lastModified).to.equal(1 * hour);

            done();
          }
        });
      });

      after(function() {
        cache.clearSync();
      });
    });
  });
});
