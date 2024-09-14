// const { Request, Response, NextFunction } = require('express');

function asyncWrapOrError(callback) {
  return (req, res, next) => {
    return Promise
      .resolve(callback(req, res, next))
      .catch(err => err ? next(err) : next(new Error('Unknown error...')));
  };
}

module.exports = asyncWrapOrError;