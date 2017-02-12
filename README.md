# cache-me

A file cache manager with streams and promises support.

### Installation
`npm i -S cache-me`

### How it works
- stores data in 2 files :
  - a JSON conf file with this structure :
    {
      name,
      data,
      encoding,
      relatedData,
      file {
        path,
        saved,
        encoding,
      },
      lastModified,
      expires
    },
  - and a file containing data only in order to get a stream from it
- get data synchronously or asynchronously with Promises and Readable stream
- internal 'files' directory must exist or an error will be thrown
- the *relatedData* option could be an object used to build the effective data as a javascript object to transform into XML format
- time are in milliseconds
- logs are made via the *debug* module to avoid synchronous *console* logs

### How to use it:
```javascript
const cache = require('cache-me');
```

####get(name)
Get the data in cache from the data file as a Readable stream. If the data set is in cache but has expired it will reject with an object and an err.code = 'EXPIRED'. *Asynchronous*

Params:
  - name \<String\>: the name of the object in cache

Returns:
  - Promise:
    - resolve with { confObj <Object>, rstream <Readable Stream> }
    - reject with { err <Error>, confObj <Object>, rstream <Readable Stream> }

Example:
  ```javascript
  cache
    .get('xml')
    .then(({ confObj, rstream }) => {
      // confObj contains useful info as lastModified, expires, relatedData, ...
      rstream.pipe(res); // where 'res' is a writable stream like a HTTP response with proper XML headers
    })
    .catch(({ err, confObj, rstream }) => {
      if (err && err.code === 'EXPIRED') {
        // the data was in cache but has expired, adjust to your need
        // it could be interesting to reuse the related data or rstream
      } else {
        // no 'xml' data has been cached
      }
    });
  ```

####getSync(name)
Get all properties of the 'name' configuration object. *Synchronous*

Params:
  - name \<String\>: the name of the object in cache

Returns:
  - confObj <Object> or {} if nothing found

Example:
  ```javascript
  const confObj = cache.getSync('xml');

  // or destructuring
  const { data, lastModified, expires } = cache.getSync('xml');
  ```

####set({ name, data, encoding = 'utf8', time = 1h, relatedData = {}, override = true })
Set data in cache, a conf file and a data file will be created. To set an image in cache set data with a binary buffer. *Asynchronous*

Params:
  - name <String>: the name of the object to cache
  - data <Object>: the data that will be saved in the data file and get via rstream
  - encoding <String> (optional): the encoding, one of those supported by Node.js, **utf8** by default
  - time <Number> (optional): the time **in milliseconds** to keep data in cache, >= 1 second and <= 365 days, **1 hour** by default.
  - relatedData <Object> (optional): the related data that may have been used to construct data, **{}** by default.
  - override <Boolean> (optional): true to override a previous object in cache, false if not. Throw 'EEXIST' error code if *override* was set to *false*. **true** by default.

Returns:
  - Promise:
    - resolve with a confirmation message <String>
    - reject with an error <Error>

Example:
  ```javascript
  cache
    .set({
      name: 'xml',
      data: '<SnowReport><Mountain name="Mont-Blanc"><TrailsOpen>9</TrailsOpen></Mountain></SnowReport>',
      relatedData: {
        'Mont-Blanc': {
          TrailsOpen: 9,
        },
      },
    })
    .then(() => {
      // object successfully set in cache
      // ...
    })
    .catch((err) => {
      // an error occurred
      // if no override was allowed we could check if an object is already in cache
      // with this condition: if (err && err.code === 'EEXIST')
    });
  ```

####setParallel(object, callback)
Same as **cache.set** method but set data in cache in parallel. A conf file and a data file will be created with streams so it is not unsafe to make multiple call to setParallel or to wait until the object has successfully been cached. *Asynchronous*

Params:
  - object <Object>: the same object as in **cache.set** method

Returns:
  - callback(err, confObj) <Function>:
    - err <Error>: an error instance, streams return 'EEXIST' error code if override is set to false and the object with the same name is already in cache
    - confObj <Object>: the configuration object saved in cache

Example:
  ```javascript
  cache.setParallel({
    name: 'xml',
    data: '<SnowReport><Mountain name="Mont-Blanc"><TrailsOpen>9</TrailsOpen></Mountain></SnowReport>',
    relatedData: {
      'Mont-Blanc': {
        TrailsOpen: 9,
      },
    },
  });

  // continue other stuff with only logs if an error occurred

  // or
  cache.setParallel({
    name: 'xml',
    data: '<SnowReport><Mountain name="Mont-Blanc"><TrailsOpen>9</TrailsOpen></Mountain></SnowReport>',
    relatedData: {
      'Mont-Blanc': {
        TrailsOpen: 9,
      },
    },
  }, (err, confObj) => {
    // if override option was false and an object in cache has the same name
    if (err && err.code === 'EEXIST') {

    }

    // if override option was true (true by default)
    if (err) {
      // log error with your logger
    } else if (confObj) {
      // object has been saved
    }
  });
  ```

####hasSync(name)
Test if data are in cache or not, taking into account expires time. *Synchronous*

Params:
  - name <String>: the name of the object in cache

Returns:
  - <Boolean>: true if the object is in cache, false if not or has expired.

####reset(name)
Reset expire time by setting the new one running from now with the original cache time set. *Asynchronous*

Params:
  - name <String>: the name of the object in cache

Returns:
  - Promise:
    - resolve with a confirmation message <String>
    - reject with an error <Error>

Example:
  ```javascript
  cache
    .get('xml')
    .then(({ confObj, rstream }) => {
      // confObj contains useful info as lastModified, expires, relatedData, ...
      rstream.pipe(res); // where 'res' is a writable stream like a HTTP response with proper XML headers
    })
    .catch(({ err, confObj, rstream }) => {
      if (err && err.code === 'EXPIRED') {
        // reset the object so that it can be set again in cache for the original time (in these examples time is ommit so it equals 1 hour in milliseconds)
        cache
          .reset('xml')
          .then((msg) => {
            // ...
          })
          .catch(err => debug(err));
      } else {
        // no 'xml' data has been cached
      }
    });
  ```

####resetSync(name)
Reset expire time by setting the new one running from now with the original cache time set. *Synchronous*

Params:
  - name <String>: the name of the object in cache

Returns:
  - <Boolean>: true if reseted, false if not

####delete(name)
Definitely delete data in cache (data file and conf file). *Asynchronous*

Params:
  - name <String>: the name of the object in cache

Returns:
  - Promise:
    - resolve with a confirmation message <String>
    - reject with an error <Error> if one of the two files is not in cache

Example:
  ```javascript
  cache
    .delete('xml')
    .then((msg) => {
      // confObj file and data file has been successfully deleted from cache
    })
    .catch(err => debug(err));
  ```

####deleteSync(name)
Definitely delete data in cache (data file and conf file). *Synchronous*

Params:
  - name <String>: the name of the object in cache

Returns:
  - <Boolean>: true if deleted, false if not

####clear()
Definitely clear all data in cache (data files and conf files). *Asynchronous*

Params:
  - no params

Returns:
  - Promise:
    - resolve with a confirmation message <String>
    - reject with an error <Error>

Example:
  ```javascript
  cache
    .clear()
    .then((msg) => {
      // cache has been cleared
    })
    .catch(err => debug(err));
  ```

####clearSync()
Definitely clear all data in cache (data files and conf files). *Synchronous*

Params:
  - no params

Returns:
  - <Boolean>: true if cleared, false if not


## Licence

The MIT License (MIT) Copyright © 2016 Adrien Valcke

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
