# cache-me

A file cache manager with streams and promises support.

### Exports:
- *get(name)* -> Promise({ confObj, rstream } or { confObj, rstream, err })
- *getSync(name)* -> Object(confObj)
- *set({ name, data, encoding, file (path= name), time= 1h, relatedData= {}, override= true })* -> Promise(Confirmation message (String) or Error instance)
- *setParallel(see set args)* -> callback(err)
- *hasSync(name)* -> Boolean
- *reset(name)* -> Promise(Confirmation message (String) or Error instance)
- *resetSync(name)* -> Boolean
- *delete(name)* -> Promise(Confirmation message (String) or Error instance)
- *deleteSync(name)* -> Boolean
- *clear()* -> Promise(Confirmation message (String) or Error instance)
- *clearSync()* -> Boolean

### How it works
- stores data in 2 files :
  - a JSON conf file
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
- internal 'files' directory must exist or an error will be catched
  -> relatedData could be an object used to build the effective data
    as a javascript object to transform into XML
  -> time are in milliseconds

## Licence

The MIT License (MIT) Copyright © 2016 Adrien Valcke

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
