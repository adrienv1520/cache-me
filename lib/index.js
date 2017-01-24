/**
 * Cache Manager
 *
 * Exports:
 *  - get(name)         -> Promise({ confObj, rstream } or { confObj, rstream, err })
 *  - getSync(name)     -> Object(confObj)
 *  - set({ name, data, encoding, file (path= name), time= 1h, relatedData= {}, override= true })
 *                      -> Promise(Confirmation message (String) or Error instance)
 *  - setParallel(see set args)
 *                      -> callback(err)
 *  - hasSync(name)     -> Boolean
 *  - reset(name)       -> Promise(Confirmation message (String) or Error instance)
 *  - resetSync(name)   -> Boolean
 *  - delete(name)      -> Promise(Confirmation message (String) or Error instance)
 *  - deleteSync(name)  -> Boolean
 *  - clear()           -> Promise(Confirmation message (String) or Error instance)
 *  - clearSync()       -> Boolean
 *
 * How it works:
 *  - stores data in 2 files :
 *    * a JSON conf file
 *    {
 *      name,
 *      data,
 *      encoding,
 *      relatedData,
 *      file {
 *        path,
 *        saved,
 *        encoding,
 *      },
 *      lastModified,
 *      expires
 *    },
 *    * and a file containing data only in order to get a stream from it
 *  - get data synchronously or asynchronously with Promises and Readable stream
 *  - internal 'files' directory must exist or an error will be catched
 *  -> relatedData could be an object used to build the effective data
 *    as a javascript object to transform into XML
 *  -> time are in milliseconds
 */
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const EventEmitter = require('events');
const debug = require('debug')('cache');
const Utils = require('./Utils');

const Readable = stream.Readable;
const filesDirectory = path.join(__dirname, '../files');

const {
  confExtension,
  is,
  encodings,
  time: {
    second,
    hour,
    day,
  },
  getFileStream,
  getJSONSync,
  getJSON,
} = Utils;

// main functions export
module.exports = {
  /**
   * function getStream (asynchronous)
   * get the data in cache from the data file as a Readable stream
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Promise}     { confObj, rstream } or { err, confObj, rstream }
   */
  get(name) {
    return new Promise((resolve, reject) => {
      getJSON(path.join(filesDirectory, `${name}${confExtension}`))
      .then((confObj) => {
        const { file: { encoding, path: pathToFile }, expires } = confObj;
        const now = Date.now();

        getFileStream(pathToFile, encoding)
        .then((rstream) => {
          if (expires !== undefined && (expires - now) >= 0) {
            resolve({ confObj, rstream });
          } else {
            const err = new Error(`file ${pathToFile} has expired`);
            err.code = 'EXPIRED';

            reject({
              err,
              confObj,
              rstream,
            });
          }
        })
        .catch(err => reject({ err, confObj, rstream: undefined }));
      })
      .catch(err => reject({ err, confObj: undefined, rstream: undefined }));
    });
  },

  /**
   * function get (synchronous)
   * get all properties of the 'name' configuration object and the related data file
   *
   * @param  {String} name    the name given to the data to store in cache
   * @return {Object} confObj the configuration object in cache
   */
  getSync(name) {
    return getJSONSync(path.join(filesDirectory, `${name}${confExtension}`));
  },

  /**
   * function set (asynchronous)
   * set data in cache, a conf file and a data file will be created
   * to set image in cache, set data with a binary buffer
   *
   * @param  {Object}      an object with these properties:
   *                          - name
   *                          - data
   *                          - encoding= utf8
   *                          - relatedData= {}
   *                          - file, default= name
   *                          - time, default= 1 * hour
   *                          - override= true (throw EEXIST error code)
   * @return {Promise}      confObj or Error instance
   */
  set({ name, data, encoding, file, time, override, relatedData = {} } = {}) {
    return new Promise((resolve, reject) => {
      // name must be a not null String and data must exist
      if (is.call(String.prototype, Object(name)) && name.trim() !== '' && !!data) {
        const isBufferData = Buffer.isBuffer(data);
        const isOverriden = is.call(Boolean.prototype, Object(override)) ? override : true;
        const flag = isOverriden ? 'w' : 'wx';
        let dataEncoding;
        let dataFileName;
        let cacheTime = parseInt(time, 10);

        if (Number.isNaN(cacheTime) || !(time >= second && time <= 365 * day)) {
          cacheTime = hour;
        }

        if (encoding !== undefined
          && is.call(String.prototype, Object(encoding))
          && encodings.indexOf(encoding.toLowerCase()) !== -1) {
          dataEncoding = encoding;
        } else if (isBufferData) {
          dataEncoding = 'binary';
        } else {
          [dataEncoding] = encodings;
        }

        // now set expired time and last modified
        const lastModified = Date.now();
        const expires = lastModified + cacheTime;

        /**
         * the file name where data will be stored must be different
         * from conf file name and a not null String
         */
        if (is.call(String.prototype, Object(file))
          && file.trim() !== ''
          && file !== `${name}${confExtension}`) {
          dataFileName = `${name}${confExtension}_${file}`;
        } else {
          dataFileName = `${name}${confExtension}_${name}`;
        }

        // the configuration object that will be saved in the JSON conf file
        const confObj = {
          name,
          data,
          relatedData,
          lastModified,
          expires,
          file: {
            path: path.join(filesDirectory, dataFileName),
            saved: false,
            encoding: dataEncoding,
          },
        };

        // serialize data to save in data file if needed
        let serialData;

        if (!is.call(String.prototype, Object(data)) && !isBufferData) {
          serialData = JSON.stringify(data);
        } else {
          serialData = data;
        }

        // first save the file with all data so it could be got in a read stream easily
        fs.writeFile(
          path.join(filesDirectory, dataFileName),
          serialData,
          {
            flag,
            encoding: dataEncoding,
          },
          (error) => {
            if (!error) {
              confObj.file.saved = true;
            }

            // now save conf file even if there was an error, file.saved would be equal to false
            fs.writeFile(
              path.join(filesDirectory, `${name}${confExtension}`),
              JSON.stringify(confObj, null, 2),
              {
                flag,
              },
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(confObj);
                }
              });
          });
      } else {
        reject(new Error('name of the object to cache must be a not null string with data to cache'));
      }
    });
  },

  /**
   * function setParallel (streaming)
   * set data in cache in parallel, a conf file and a data file will be created
   *
   * @param  {Object}               an object with these properties:
   *                                   - name
   *                                   - data
   *                                   - encoding= utf8
   *                                   - file, default= name
   *                                   - time, default= 1 * hour
   *                                   - override= true
   * @param  {Function} callback    an optional callback(err, confObj)
   */
  setParallel({ name, data, encoding, file, time, override, relatedData = {} } = {}, callback) {
    // if callback exists and is a function, we will call back, else debug
    const hasCallback = is.call(Function.prototype, callback);

    // handle multiple streams events to proper callback result
    const streamEvent = new EventEmitter();
    streamEvent.wstreamsEnded = [];
    streamEvent.hasCallbackedError = false;

    const isOverriden = is.call(Boolean.prototype, Object(override)) ? override : true;
    const flags = isOverriden ? 'w' : 'wx';

    // name must be a not null String and data must exist
    if (is.call(String.prototype, Object(name)) && name.trim() !== '' && !!data) {
      const isBufferData = Buffer.isBuffer(data);
      let dataEncoding;
      let dataFileName;
      let cacheTime = parseInt(time, 10);

      if (Number.isNaN(cacheTime) || !(time >= second && time <= 365 * day)) {
        cacheTime = hour;
      }

      if (encoding !== undefined
        && is.call(String.prototype, Object(encoding))
        && encodings.indexOf(encoding.toLowerCase()) !== -1) {
        dataEncoding = encoding;
      } else if (isBufferData) {
        dataEncoding = 'binary';
      } else {
        [dataEncoding] = encodings;
      }

      // now set expired time and last modified
      const lastModified = Date.now();
      const expires = lastModified + cacheTime;

      /**
       * the file name where data will be stored must be different
       * from conf file name and a not null String
       */
      if (is.call(String.prototype, Object(file))
        && file.trim() !== ''
        && file !== `${name}${confExtension}`) {
        dataFileName = `${name}${confExtension}_${file}`;
      } else {
        dataFileName = `${name}${confExtension}_${name}`;
      }

      /**
       *  the configuration object that will be saved in the JSON conf file
       *  saved is set to true because if an error occurs on file stream, the error is callbacked
       */
      const confObj = {
        name,
        data,
        relatedData,
        lastModified,
        expires,
        file: {
          path: path.join(filesDirectory, dataFileName),
          saved: true,
          encoding: dataEncoding,
        },
      };

      // it is safer to use fs.createWriteStream if multiple save could be done on request
      const dataFileWstream = fs.createWriteStream(
        path.join(filesDirectory, dataFileName),
        {
          flags,
          encoding: dataEncoding,
        });

      const cacheFileWstream = fs.createWriteStream(
        path.join(filesDirectory, `${name}${confExtension}`),
        {
          flags,
        });

      const dataRstream = new Readable({ objectMode: true, read() {} });
      const cacheRstream = new Readable({ objectMode: true, read() {} });

      // manage streams error events
      dataFileWstream.on('error', err => streamEvent.emit('error', err));
      cacheFileWstream.on('error', err => streamEvent.emit('error', err));
      dataRstream.on('error', err => streamEvent.emit('error', err));
      cacheRstream.on('error', err => streamEvent.emit('error', err));

      // manage error events by streamEvent by callbacking the first error found
      streamEvent.on('error', (err) => {
        if (!streamEvent.hasCallbackedError) {
          if (hasCallback) {
            callback(err);
          } else {
            debug(err);
          }

          streamEvent.hasCallbackedError = true;
        }
      });

      // finish events will be fired when rstream has ended piping to wstream
      dataFileWstream.on('finish', () => {
        streamEvent.emit('finish', 'data');
      });

      cacheFileWstream.on('finish', () => {
        streamEvent.emit('finish', 'cache');
      });

      streamEvent.on('finish', (wstream) => {
        if (!!wstream && streamEvent.wstreamsEnded.indexOf(wstream) === -1) {
          streamEvent.wstreamsEnded.push(wstream);
        }

        if (streamEvent.wstreamsEnded.indexOf('cache') !== -1 && streamEvent.wstreamsEnded.indexOf('data') !== -1) {
          if (hasCallback) {
            callback(undefined, confObj);
          } else {
            debug(`${name} has been set`);
          }
        }
      });

      // push data on readable streams and pipe them to writables
      dataRstream.setEncoding(dataEncoding);
      dataRstream.push(data);
      dataRstream.push(null);

      cacheRstream.push(JSON.stringify(confObj, null, 2));
      cacheRstream.push(null);

      dataRstream.pipe(dataFileWstream);
      cacheRstream.pipe(cacheFileWstream);
    } else {
      const errMessage = 'name of the object to cache must be a not null string with data to cache';

      if (hasCallback) {
        callback(new Error(errMessage));
      } else {
        debug(errMessage);
      }
    }
  },

  /**
   * function hasSync (synchronous)
   * test if data are in cache or not, taking into accound expires
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Boolean}     true if 'name' is in cache, false if not
   */
  hasSync(name) {
    let has;

    const { expires, data, file } = getJSONSync(path.join(filesDirectory, `${name}${confExtension}`));
    const now = Date.now();

    if (expires !== undefined
      && (expires - now) >= 0
      && data !== undefined
      && file !== undefined
      && file.saved) {
      has = true;
    } else {
      has = false;
    }

    return has;
  },

  /**
   * function reset (asynchronous)
   * reset expire time by setting the new one running from now with
   * the original cache time set
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Promise}     Confirmation message (String) or Error instance
   */
  reset(name) {
    return new Promise((resolve, reject) => {
      getJSON(path.join(filesDirectory, `${name}${confExtension}`))
      .then((confObj) => {
        if (!!confObj && !!confObj.expires && confObj.lastModified) {
          // prevent from object mutation if confObj need to be somewhere reused
          const newConfObj = Object.assign({}, confObj);

          // get the original cache time
          const cacheTime = confObj.expires - confObj.lastModified;
          const now = Date.now();

          newConfObj.expires = now + cacheTime;
          newConfObj.lastModified = now;

          fs.writeFile(path.join(filesDirectory, `${name}${confExtension}`), JSON.stringify(newConfObj, null, 2), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(`${name} has been reseted from cache`);
            }
          });
        } else {
          reject(new Error(`no data, expired time or lastModified properties found in "${name}" object in cache`));
        }
      })
      .catch(err => reject(err));
    });
  },

  /**
   * function reset (synchronous)
   * reset expire time by setting the new one running from now with
   * the original cache time set
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Boolean}     true if reseted, false if not
   */
  resetSync(name) {
    const confObj = getJSONSync(path.join(filesDirectory, `${name}${confExtension}`), undefined);
    let reseted;

    if (!!confObj && !!confObj.expires && !!confObj.lastModified) {
      // prevent from object mutation if confObj need to be somewhere reused
      const newConfObj = Object.assign({}, confObj);

      // get the original cache time
      const cacheTime = confObj.expires - confObj.lastModified;
      const now = Date.now();

      newConfObj.expires = now + cacheTime;
      newConfObj.lastModified = now;

      try {
        fs.writeFileSync(path.join(filesDirectory, `${name}${confExtension}`), JSON.stringify(newConfObj, null, 2));
        reseted = true;
      } catch (e) {
        reseted = false;
      }
    } else {
      reseted = false;
    }

    return reseted;
  },

  /**
   * function delete (asynchronous)
   * definitely delete data in cache (data file and conf file)
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Promise}     Confirmation message (String) or Error instance
   */
  delete(name) {
    return new Promise((resolve, reject) => {
      const confFile = path.join(filesDirectory, `${name}${confExtension}`);

      getJSON(confFile)
      .then(({ file: { path: pathToFile } }) => {
        fs.unlink(pathToFile, (error) => {
          if (error) {
            reject(error);
          } else {
            fs.unlink(confFile, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(`${confFile} and ${pathToFile} has been definitely deleted`);
              }
            });
          }
        });
      })
      .catch(err => reject(err));
    });
  },

  /**
   * function deleteSync (synchronous)
   * definitely delete data in cache (data file and conf file)
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Boolean}     true if deleted, false if not
   */
  deleteSync(name) {
    let deleted;

    try {
      const confFile = path.join(filesDirectory, `${name}${confExtension}`);
      const { file: { path: pathToFile } } = getJSONSync(confFile);
      fs.unlinkSync(pathToFile);
      fs.unlinkSync(confFile);
      deleted = true;
    } catch (e) {
      deleted = false;
    }

    return deleted;
  },

  /**
   * function clear (asynchronous)
   * definitely clear all data in cache (data files and conf files)
   *
   * @return {Promise}     Confirmation message (String) or Error instance
   */
  clear() {
    return new Promise((resolve, reject) => {
      fs.readdir(filesDirectory, (error, files) => {
        if (error) {
          reject(error);
        } else {
          const nbFiles = files.length;

          if (nbFiles <= 0) {
            resolve('cache is already cleared');
          } else {
            for (let i = 0; i < nbFiles; i += 1) {
              ((index) => {
                fs.unlink(path.join(filesDirectory, files[index]), (err) => {
                  if (err) {
                    reject(err);
                  } else if (index === nbFiles - 1) {
                    resolve(`${nbFiles} files have been removed from cache`);
                  }
                });
              })(i);
            }
          }
        }
      });
    });
  },

  /**
   * function clearSync (synchronous)
   * definitely clear all data in cache (data files and conf files)
   *
   * @param  {String} name the name given to the data to store in cache
   * @return {Boolean}     true if all has been cleared, false if not
   */
  clearSync() {
    let cleared;

    try {
      const files = fs.readdirSync(filesDirectory);
      files.forEach(file => fs.unlinkSync(path.join(filesDirectory, file)));
      cleared = true;
    } catch (e) {
      cleared = false;
    }

    return cleared;
  },
};
