// Generated by CoffeeScript 1.9.3
var controllerClient, deviceManager, exec, extractCredentials, getAuthController, recoverDiskSpace, request;

deviceManager = require('../models/device');

request = require('request-json');

exec = require('child_process').exec;

controllerClient = request.newClient('http://localhost:9002');

extractCredentials = function(header) {
  var authDevice;
  if (header != null) {
    authDevice = header.replace('Basic ', '');
    authDevice = new Buffer(authDevice, 'base64').toString('ascii');
    return authDevice.split(':');
  } else {
    return ["", ""];
  }
};

recoverDiskSpace = function(cb) {
  return exec('df -h', function(err, rawDiskSpace) {
    var data, freeSpace, i, len, line, lineData, lines, totalSpace, usedSpace;
    if (err) {
      return cb("Error while retrieving disk space -- " + err);
    } else {
      data = {};
      lines = rawDiskSpace.split('\n');
      for (i = 0, len = lines.length; i < len; i++) {
        line = lines[i];
        line = line.replace(/[\s]+/g, ' ');
        lineData = line.split(' ');
        if (lineData.length > 5 && lineData[5] === '/') {
          freeSpace = lineData[3].substring(0, lineData[3].length - 1);
          usedSpace = lineData[2].substring(0, lineData[2].length - 1);
          totalSpace = lineData[1].substring(0, lineData[1].length - 1);
          data.freeDiskSpace = freeSpace;
          data.usedDiskSpace = usedSpace;
          data.totalDiskSpace = totalSpace;
        }
      }
      return cb(null, data);
    }
  });
};

getAuthController = function() {
  var err, token;
  if (process.env.NODE_ENV === 'production') {
    try {
      token = process.env.TOKEN;
      token = token.split('\n')[0];
      return token;
    } catch (_error) {
      err = _error;
      console.log(err.message);
      console.log(err.stack);
      return null;
    }
  } else {
    return "";
  }
};

module.exports.getSpace = function(req, res, next) {
  var password, ref, username;
  ref = extractCredentials(req.headers['authorization']), username = ref[0], password = ref[1];
  return deviceManager.isAuthenticated(username, password, function(auth) {
    var error;
    if (auth) {
      controllerClient.setToken(getAuthController());
      return controllerClient.get('diskinfo', function(err, resp, body) {
        if (err || resp.statusCode !== 200) {
          return recoverDiskSpace(function(err, body) {
            var error;
            if (err != null) {
              error = new Error(err);
              error.status = 500;
              return next(error);
            } else {
              return res.send(200, {
                diskSpace: body
              });
            }
          });
        } else {
          return res.send(200, {
            diskSpace: body
          });
        }
      });
    } else {
      error = new Error("Request unauthorized");
      error.status = 401;
      return next(error);
    }
  });
};
