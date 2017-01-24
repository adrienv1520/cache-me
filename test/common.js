const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiStream = require('chai-stream');
const chaiHttp = require('chai-http');

chai.use(chaiAsPromised);
chai.use(chaiStream);

const expect = chai.expect;

module.exports = {
  chai,
  expect,
};
