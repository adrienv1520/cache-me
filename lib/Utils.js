/**
 * Utils library
 *
 * Exports:
 *  - is                                     secure isPrototypeOf to call
 *  - encodings                              Node.js supported encodings
 *  - time {                                 time in milliseconds
 *      second,
 *      minute,
 *      hour,
 *      day,
 *      hrms,
 *      hrnow,
 *      round,
 *      precision,
 *      start,
 *      end,
 *    }
 *  - getFileStream(file)                 -> Promise(Readable Stream or Error instance)
 *  - getJSON(file)                       -> Promise(data in JSON (JavaScript Object) or Error)
 *  - getJSONSync(file, defaultData = {}) -> data in JSON (JavaScript Object) or defaultData
 */
const fs = require('fs');
const path = require('path');

/**
 *  the confObj extension name
 *  if cache.set({ name: 'myObj', ... ) is called then a "myObj_conf.json" and
 *  a data file named "myObj" (or the "file" parameter value) are created
 */
const confExtension = '_conf.json';

// to call is on object
const is = Object.prototype.isPrototypeOf;

// supported encodings
const encodings = [
  'utf8',
  'ascii',
  'binary',
  'latin1',
  'utf16le',
  'ucs2',
  'base64',
  'hex',
];

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

// time in milliseconds
const time = {
  second,
  minute,
  hour,
  day,
  labels: {},

  /**
   * Function hrms : transform process.hrtime() array into milliseconds
   *
   * @param  {Array} hrtimeArray   array returned by process.hrtime()
   * @return {Number} time in milliseconds or NaN if hrtimeArray is not an array
   *                  or has bad values
   */
  hrms(hrtimeArray) {
    let hrms;

    if (Array.isArray(hrtimeArray)) {
      const [seconds, nanoseconds] = hrtimeArray;

      if (is.call(Number.prototype, Object(seconds))
        && !Number.isNaN(seconds)
        && is.call(Number.prototype, Object(nanoseconds))
        && !Number.isNaN(nanoseconds)
        && seconds >= 0
        && nanoseconds >= 0) {
        // time in milliseconds with 6 decimals (nanoseconds) or NaN
        hrms = (seconds * 1e3) + (nanoseconds / 1e6);
      } else {
        hrms = NaN;
      }
    } else {
      hrms = NaN;
    }

    return hrms;
  },

  /**
   * Function hrnow :
   * @return {Number} return time in milliseconds with nanoseconds
   */
  hrnow() {
    return this.hrms(process.hrtime());
  },

  /**
   * Function round : round a number with a specific number of decimals
   *
   * @param  {Number} number       the number to get the rounded value
   * @param  {Number} nbDecimals   the number of decimals (optional)
   * @return {String} number rounded with nbDecimals decimals, or the rounded integer
   *                  if nbDecimals is not defined
   */
  round(number, nbDecimals) {
    let num;
    let n;

    if (is.call(Number.prototype, Object(number)) && !Number.isNaN(number)) {
      num = number;
    } else {
      num = 0;
    }

    if (is.call(Number.prototype, Object(nbDecimals))
      && !Number.isNaN(nbDecimals)
      && nbDecimals >= 0
      && nbDecimals <= 15) {
      n = nbDecimals;
    } else {
      n = 0;
    }

    return num.toFixed(n);
  },

  /**
   * Function precision : return a number with a specific number of decimals
   *
   * @param  {Number} number       the number to get the rounded value
   * @param  {Number} nbDecimals   the number of decimals (optional)
   * @return {String} number with nbDecimals decimals, '0.0' by default
   */
  precision(number, nbDecimals) {
    /**
     * no matter here if casting number and nbDecimals becomes 0
     * (with null or '') because 0 is excluded from nbDecimals
     * and the default returned value is 0.0
     */
    const num = Number(number);
    let precisionNumStr;
    let n = Number(nbDecimals);

    if (Number.isNaN(n) || n <= 0) {
      n = 1;
    }

    if (!Number.isNaN(num)) {
      const [base, dec] = String(num).split('.');
      let decimals;

      if (dec !== undefined) {
        decimals = String(dec).substr(0, n);
        if (decimals.length < n) {
          decimals = `${decimals}${'0'.repeat(n - decimals.length)}`;
        }
      } else {
        decimals = '0'.repeat(n);
      }

      precisionNumStr = `${base}.${decimals}`;
    } else {
      precisionNumStr = '0.0';
    }

    return precisionNumStr;
  },

  /**
   * Function start : save the current hrtime to calculate the difference in ms
   *                  when the end function is called
   *
   * @param  {String} label    the label as id
   * @return {String} number   stringified number start time in milliseconds
   *                           with 3 decimals precision
   */
  start(label) {
    if (!is.call(String.prototype, Object(label)) || label.trim() === '') {
      throw new Error(`label must be a not-empty string, got: ${label}`);
    }

    const { [label]: existingLabel } = this.labels;

    if (existingLabel !== undefined) {
      throw new Error(`label "${label}" already exists and is running...`);
    }

    const newTimeLabel = {
      name: label,
      startTime: process.hrtime(),
    };

    this.labels[label] = newTimeLabel;

    return this.precision(this.hrms(newTimeLabel.startTime), 3);
  },

  /**
   * Function end : return the difference between the start and end call time
   *                in milliseconds with 3 decimals precisison
   *
   * @param  {String} label    the label as id
   * @return {String} number   stringified number end time in milliseconds with 3 decimals precision
   */
  end(label) {
    if (!is.call(String.prototype, Object(label)) || label.trim() === '') {
      throw new Error(`label must be a not-empty string, got: ${label}`);
    }

    const { [label]: existingLabel } = this.labels;

    if (existingLabel === undefined) {
      throw new Error(`label "${label}" does not exist`);
    }

    existingLabel.isRunning = false;
    const diff = this.precision(this.hrms(process.hrtime(existingLabel.startTime)), 3);

    delete this.labels[label];

    return diff;
  },
};

/**
 * function getFileStream (asynchronous)
 * wrapp fs.createReadStream to handle readable and error events
 *
 * @param  {String} file path to the file
 * @return {Promise}     Readable stream or Error instance
 */
const getFileStream = function getFileStream(file, encoding) {
  return new Promise((resolve, reject) => {
    let dataEncoding;

    if (encoding !== undefined
      && is.call(String.prototype, Object(encoding))
      && encodings.indexOf(encoding.toLowerCase()) !== -1) {
      dataEncoding = encoding;
    } else {
      [dataEncoding] = encodings;
    }

    const rstream = fs.createReadStream(path.normalize(file), dataEncoding);

    rstream.on('readable', () => {
      resolve(rstream);
    });

    rstream.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * function getJSON (asynchronous)
 * read a file and parse data to JSON
 *
 * @param  {String} file path to the file
 * @return {Promise}     data in JSON (JavaScript Object) or Error instance
 */
const getJSON = function getJSON(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.normalize(file), (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      }
    });
  });
};

/**
 * function getJSONSync (synchronous)
 * read a file and parse data togetFileStream JSON synchronously
 * if an error is catched, data will be set to the default data
 *
 * The default data is particulary useful when destructuring to a non iterable object, examples:
 *  - const { x } = [5]       // will not throw a TypeError, x will be undefined, but
 *  - const [ y ] = { y: 5 }  // will throw a TypeError because { y: 5 } is not iterable
 *  - const data = getJSONSync('nothing here', undefined) will make it possible
 *    to check if data is or not undefined (an error is catched in reading file or parsing data)
 *
 * @param  {String} file        path to the file
 * @param  {Object} defaultData {} by default if bad JSON format or file does not exist
 * @return {Object}             data in JSON format (JavaScript Object) or default data
 */
const getJSONSync = function getJSONSync(file, ...args) {
  /**
   *  cannot set default value to defaultData (defaultData = {}) in function parameter,
   *  if null or undefined is passed in argument, defaultData will automatically
   *  take its default value parameter.
   */
  let data;
  let defaultData;

  if (args.length < 1) {
    defaultData = {};
  } else {
    [defaultData] = args;
  }

  try {
    data = JSON.parse(fs.readFileSync(path.normalize(file)));
  } catch (e) {
    data = defaultData;
  }

  return data;
};

// exports
module.exports = {
  confExtension,
  is,
  encodings,
  time,
  getFileStream,
  getJSON,
  getJSONSync,
};
