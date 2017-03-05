/**
 * Robinhood API NodeJS Wrapper
 * @author Alejandro U. Alvarez
 * @license AGPLv3 - See LICENSE file for more details
 */

'use strict';

// Dependencies
var Promise = require('promise');
var fetch = require('isomorphic-fetch');
var merge = require('lodash.merge');

/**
 * Build query string
 */
function encodeQueryData(data) {
  var ret = [];
  for (var d in data) {
    ret.push(`${encodeURIComponent(d)}=${encodeURIComponent(data[d])}`);
  }
  return ret.join('&');
}

function RobinhoodWebApi(opts, callback) {

  /* +--------------------------------+ *
   * |      Internal variables        | *
   * +--------------------------------+ */
  var _apiUrl = 'https://api.robinhood.com/';

  var _options = opts || {},
      // Private API Endpoints
      _endpoints = {
        login:  'api-token-auth/',
        investment_profile: 'user/investment_profile/',
        accounts: 'accounts/',
        ach_iav_auth: 'ach/iav/auth/',
        ach_relationships:  'ach/relationships/',
        ach_transfers:'ach/transfers/',
        ach_deposit_schedules: "ach/deposit_schedules/",
        applications: 'applications/',
        dividends:  'dividends/',
        edocuments: 'documents/',
        instruments:  'instruments/',
        margin_upgrade:  'margin/upgrades/',
        markets:  'markets/',
        notifications:  'notifications/',
        notifications_devices: "notifications/devices/",
        orders: 'orders/',
        cancel_order: 'orders/',      //API expects https://api.robinhood.com/orders/{{orderId}}/cancel/
        password_reset: 'password_reset/request/',
        quotes: 'quotes/',
        document_requests:  'upload/document_requests/',
        user: 'user/',

        user_additional_info: "user/additional_info/",
        user_basic_info: "user/basic_info/",
        user_employment: "user/employment/",
        user_investment_profile: "user/investment_profile/",

        watchlists: 'watchlists/',
        positions: 'positions/',
        fundamentals: 'fundamentals/',
        sp500_up: 'midlands/movers/sp500/?direction=up',
        sp500_down: 'midlands/movers/sp500/?direction=down',
        news: 'midlands/news/'
    },
    _isInit = false,
    _private = {
      session : {},
      account: null,
      username : null,
      password : null,
      headers : null,
      auth_token : null
    },
    api = {};

  function _init(){
    _private.username = _options.username;
    _private.password = _options.password;
    _private.headers = {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en;q=1, fr;q=0.9, de;q=0.8, ja;q=0.7, nl;q=0.6, it;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'X-Robinhood-API-Version': '1.0.0',
        'Connection': 'keep-alive',
        'User-Agent': 'Robinhood/823 (iPhone; iOS 7.1.2; Scale/2.00)'
    };
    _login(function(){
      _isInit = true;

      if (callback) {
        callback.call();
      }
    });
  }

  function _getFetchOpts(options){
    var _opts = {
      method: 'GET',
      mode: 'cors',
      headers: {
        host: 'api.robinhood.com',
      },
      credentials: 'include',
    };
    // merge basic template with headers and options
    merge(_opts, {
      headers: _private.headers,
    }, options);
    // convert object to FormData query
    if (_opts.body && typeof _opts.body !== 'string') {
      _opts.body = encodeQueryData(_opts.body);
    }
    // add content-length header
    if (typeof _opts.body === 'string') {
      _opts.headers['content-length'] = _opts.body.length;
    }
    return _opts;
  }

  function _fetch(url, options, callback) {
    var urlWQuery = options.qs ? url + '?' + encodeQueryData(options.qs) : url;
    fetch(urlWQuery, _getFetchOpts(options))
      .then(function (response) {
        if (!response.ok) {
          throw (response.status);
        }
        return response.json();
      })
      .then(function (body) {
        if (callback) {
          callback(null, null, body);
        }
      })
      .catch(function (err) {
        if (callback) {
          callback(err);
        }
        else {
          throw (err);
        }
      });
  }

  function _login(callback){
    _fetch(_apiUrl + _endpoints.login, {
      body: {
        password: _private.password,
        username: _private.username
      },
      method: 'POST',
    }, function(err, httpResponse, body) {
      if(err) {
        throw (err);
      }

      _private.auth_token = body.token;
      _private.headers.Authorization = 'Token ' + _private.auth_token;

      // Set account
      api.accounts(function(err, httpResponse, body) {
        if (err) {
          throw (err);
        }

        if (body.results) {
          _private.account = body.results[0].url;
        }

        callback.call();
      });
    });
  }

  /* +--------------------------------+ *
   * |      Define API methods        | *
   * +--------------------------------+ */
  api.investment_profile = function(callback){
    return _fetch(_apiUrl + _endpoints.investment_profile, {
      method: 'get',
    }, callback);
  };

  api.fundamentals = function(ticker, callback){
    return _fetch(_apiUrl + _endpoints.fundamentals, {
      method: 'get',
      qs: { 'symbols': ticker }
    }, callback);
  };

  api.instruments = function(symbol, callback){
    return _fetch(_apiUrl + _endpoints.instruments, {
      method: 'get',
      qs: { 'query': symbol.toUpperCase() }
    }, callback);
  };

  api.quote_data = function(symbol, callback){
    symbol = Array.isArray(symbol) ? symbol = symbol.join(',') : symbol;
    return _fetch(_apiUrl + _endpoints.quotes, {
      method: 'get',
      qs: { 'symbols': symbol.toUpperCase() }
    }, callback);
  };

  api.accounts= function(callback){
    return _fetch(_apiUrl + _endpoints.accounts, {
      method: 'get',
    }, callback);
  };

  api.user = function(callback){
    return _fetch(_apiUrl + _endpoints.user, {
      method: 'get',
    }, callback);
  };

  api.dividends = function(callback){
    return _fetch(_apiUrl + _endpoints.dividends, {
      method: 'get',
    }, callback);
  };

  api.orders = function(callback){
    return _fetch(_apiUrl + _endpoints.orders, {
      method: 'get',
    }, callback);
  };

  api.cancel_order = function(order, callback){
    if(order.cancel){
      return _fetch(order.cancel, {
        method: 'post',
      }, callback);
    }else{
      callback({message: order.state=="cancelled" ? "Order already cancelled." : "Order cannot be cancelled.", order: order }, null, null);
    };
  }

  var _place_order = function(options, callback){
    return _fetch(_apiUrl + _endpoints.orders, {
      method: 'post',
      body: {
        account: _private.account,
        instrument: options.instrument.url,
        price: options.bid_price,
        stop_price: options.stop_price,
        quantity: options.quantity,
        side: options.transaction,
        symbol: options.instrument.symbol.toUpperCase(),
        time_in_force: options.time || 'gfd',
        trigger: options.trigger || 'immediate',
        type: options.type || 'market'
      }
    }, callback);
  };

  api.place_buy_order = function(options, callback){
    options.transaction = 'buy';
    return _place_order(options, callback);
  };

  api.place_sell_order = function(options, callback){
    options.transaction = 'sell';
    return _place_order(options, callback);
  };

  api.positions = function(callback){
    return _fetch(_apiUrl + _endpoints.positions, {
      method: 'get',
    }, callback);
  };

  api.news = function(symbol, callback){
    return _fetch(_apiUrl + [_endpoints.news,'/'].join(symbol), {
      method: 'get',
    }, callback);
  };

  api.markets = function(callback){
    return _fetch(_apiUrl + _endpoints.markets, {
      method: 'get',
    }, callback);
  };

  api.sp500_up = function(callback){
    return _fetch(_apiUrl + _endpoints.sp500_up, {
      method: 'get',
    }, callback);
  };

  api.sp500_down = function(callback){
    return _fetch(_apiUrl + _endpoints.sp500_down, {
      method: 'get',
    }, callback);
  };

  api.create_watch_list = function(name, callback){
    return _fetch(_apiUrl + _endpoints.watchlists, {
      method: 'post',
      body: {
        name: name
      }
    }, callback);
  };

  api.watchlists = function(callback){
    return _fetch(_apiUrl + _endpoints.watchlists, {
      method: 'get',
    }, callback);
  };

  api.splits = function(instrument, callback){
    return _fetch(_apiUrl + [_endpoints.instruments,'/splits/'].join(instrument), {
      method: 'get',
    }, callback);
  };

  api.historicals = function(symbol, intv, span, callback){
    return _fetch(_apiUrl + [_endpoints.quotes + 'historicals/','/?interval='+intv+'&span='+span].join(symbol), {
      method: 'get',
    }, callback);
  };
  
  api.url = function (url,callback){
    return _fetch(url, {
      method: 'get',
    }, callback);
  };

  _init(_options);

  return api;
}

module.exports = RobinhoodWebApi;
