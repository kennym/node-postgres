//make assert a global...
assert = require('assert');

var EventEmitter = require('events').EventEmitter;
var sys = require('util');
var BufferList = require(__dirname+'/buffer-list')

var Connection = require(__dirname + '/../lib/connection');
var args = require(__dirname + '/cli');

Client = require(__dirname + '/../lib').Client;

process.on('uncaughtException', function(d) {
  if ('stack' in d && 'message' in d) {
    console.log("Message: " + d.message);
    console.log(d.stack);
  } else {
    console.log(d);
  }
});

assert.same = function(actual, expected) {
  for(var key in expected) {
    assert.equal(actual[key], expected[key]);
  }
};


assert.emits = function(item, eventName, callback, message) {
  var called = false;
  var id = setTimeout(function() {
    test("Should have called " + eventName, function() {
      assert.ok(called, message || "Expected '" + eventName + "' to be called.")
    });
  },2000);

  item.once(eventName, function() {
    if (eventName === 'error') {
      // belt and braces test to ensure all error events return an error
      assert.ok(arguments[0] instanceof Error,
                "Expected error events to throw instances of Error but found: " +  sys.inspect(arguments[0]));
    }
    called = true;
    clearTimeout(id);
    assert.ok(true);
    if(callback) {
      callback.apply(item, arguments);
    }
  });
};

assert.UTCDate = function(actual, year, month, day, hours, min, sec, milisecond) {
  var actualYear = actual.getUTCFullYear();
  assert.equal(actualYear, year, "expected year " + year + " but got " + actualYear);

  var actualMonth = actual.getUTCMonth();
  assert.equal(actualMonth, month, "expected month " + month + " but got " + actualMonth);

  var actualDate = actual.getUTCDate();
  assert.equal(actualDate, day, "expected day " + day + " but got " + actualDate);

  var actualHours = actual.getUTCHours();
  assert.equal(actualHours, hours, "expected hours " + hours + " but got " + actualHours);

  var actualMin = actual.getUTCMinutes();
  assert.equal(actualMin, min, "expected min " + min + " but got " + actualMin);

  var actualSec = actual.getUTCSeconds();
  assert.equal(actualSec, sec, "expected sec " + sec + " but got " + actualSec);

  var actualMili = actual.getUTCMilliseconds();
  assert.equal(actualMili, milisecond, "expected milisecond " + milisecond + " but got " + actualMili);
};

var spit = function(actual, expected) {
  console.log("");
  console.log("actual " + sys.inspect(actual));
  console.log("expect " + sys.inspect(expected));
  console.log("");
}

assert.equalBuffers = function(actual, expected) {
  if(actual.length != expected.length) {
    spit(actual, expected)
    assert.equal(actual.length, expected.length);
  }
  for(var i = 0; i < actual.length; i++) {
    if(actual[i] != expected[i]) {
      spit(actual, expected)
    }
    assert.equal(actual[i],expected[i]);
  }
};

assert.empty = function(actual) {
  assert.lengthIs(actual, 0);
};

assert.success = function(callback) {
  return assert.calls(function(err, arg) {
    if(err) {
      console.log(err);
    }
    assert.isNull(err);
    callback(arg);
  })
}

assert.throws = function(offender) {
  try {
    offender();
  } catch (e) {
    assert.ok(e instanceof Error, "Expected " + offender + " to throw instances of Error");
    return;
  }
  assert.ok(false, "Expected " + offender + " to throw exception");
}

assert.lengthIs = function(actual, expectedLength) {
  assert.equal(actual.length, expectedLength);
};

var expect = function(callback, timeout) {
  var executed = false;
  var id = setTimeout(function() {
    assert.ok(executed, "Expected execution of function to be fired");
  }, timeout || 2000)

  return function(err, queryResult) {
    clearTimeout(id);
    if (err) {
      assert.ok(err instanceof Error, "Expected errors to be instances of Error: " + sys.inspect(err));
    }
    callback.apply(this, arguments)
  }
}
assert.calls = expect;

assert.isNull = function(item, message) {
  message = message || "expected " + item + " to be null";
  assert.ok(item === null, message);
};

test = function(name, action) {
  test.testCount ++;
  if(args.verbose) {
    console.log(name);
  }
  var result = action();
  if(result === false) {
    test.ignored.push(name);
    if(!args.verbose) {
      process.stdout.write('?');
    }
  }else{
    if(!args.verbose) {
      process.stdout.write('.');
    }
  }
};

//print out the filename
process.stdout.write(require('path').basename(process.argv[1]));
//print a new line since we'll be printing test names
if(args.verbose) {
  console.log();
}
test.testCount = test.testCount || 0;
test.ignored = test.ignored || [];
test.errors = test.errors || [];

process.on('exit', function() {
  console.log('');
  if(test.ignored.length || test.errors.length) {
    test.ignored.forEach(function(name) {
      console.log("Ignored: " + name);
    });
    test.errors.forEach(function(error) {
      console.log("Error: " + error.name);
    });
    console.log('');
  }
  test.errors.forEach(function(error) {
    throw error.e;
  });
});

process.on('uncaughtException', function(err) {
  console.error("\n %s", err.stack || err.toString())
  //causes xargs to abort right away
  process.exit(255);
});

var count = 0;

var Sink = function(expected, timeout, callback) {
  var defaultTimeout = 1000;
  if(typeof timeout == 'function') {
    callback = timeout;
    timeout = defaultTimeout;
  }
  timeout = timeout || defaultTimeout;
  var internalCount = 0;
  var kill = function() {
    assert.ok(false, "Did not reach expected " + expected + " with an idle timeout of " + timeout);
  }
  var killTimeout = setTimeout(kill, timeout);
  return {
    add: function(count) {
      count = count || 1;
      internalCount += count;
      clearTimeout(killTimeout)
      if(internalCount < expected) {
        killTimeout = setTimeout(kill, timeout)
      }
      else {
        assert.equal(internalCount, expected);
        callback();
      }
    }
  }
}

module.exports = {
  args: args,
  Sink: Sink,
  pg: require(__dirname + '/../lib/'),
  config: args,
  sys: sys,
  Client: Client
};


