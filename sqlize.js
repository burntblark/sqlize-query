'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;

function processValue(value, options) {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(function(item) { return processValue(item, options); });
  }
  if (typeof value === 'object') {
    return processObject(value, options);
  }
  return value;
}

function processObject(obj, options) {
  const blacklist = (options && Array.isArray(options.blacklist)) ? options.blacklist : [];
  const result = {};

  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (key.charAt(0) === '$') {
      const opName = key.slice(1);
      const opSymbol = Op[opName];
      if (opSymbol === undefined) {
        throw new Error('Unknown Sequelize operator: ' + key);
      }
      result[opSymbol] = processValue(obj[key], options);
    } else {
      if (blacklist.includes(key)) continue;
      result[key] = processValue(obj[key], options);
    }
  }

  return result;
}

exports.retrieveWhere = function retrieveWhere(whereStr, options) {
  if (!whereStr) {
    return undefined;
  }

  let whereObj;
  try {
    whereObj = JSON.parse(whereStr);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('invalid JSON');
    }
    throw err;
  }

  if (typeof whereObj !== 'object' || whereObj === null || Array.isArray(whereObj)) {
    throw new Error('where must be a JSON object');
  }

  return { where: processObject(whereObj, options || {}) };
};
