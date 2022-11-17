var assert = require('assert');
var ra = require('../src/lib.js');

describe('sendMessage', function() {
  it('and collect them', function() {
    ra.resetState();

    // collect received messages
    let gotMsgList = [];
    ra.on('message', (e) => {
      gotMsgList.push(e);
    });

    // send a message with blob of content
    ra.sendMessage('content', {nums: [1,2,3]});

    // validate that it got collected
    let actualMsg = JSON.stringify(gotMsgList);
    let expectMsg = '[{"name":"content","data":{"nums":[1,2,3]}}]';
    assert.deepEqual(actualMsg, expectMsg);
  });

});
