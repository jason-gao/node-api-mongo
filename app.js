var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nconf = require('nconf');
var async = require('async');
var fs = require('fs');

// 定义路由
var api = require('./routes/api');

var dir_base = __dirname;

var app = express();

// setup DB for server stats
var Datastore = require('nedb');
var db = new Datastore({filename: path.join(dir_base, 'data/dbStats.db'), autoload: true});

// setup nconf to read in the file
// create config dir and blank files if they dont exist
var dir_config = path.join(dir_base, 'config/');
var config_connections = path.join(dir_config, 'config.json');
var config_app = path.join(dir_config, 'app.json');

// Check existence of config dir and config files, create if nothing
if (!fs.existsSync(dir_config)) fs.mkdirSync(dir_config);

// The base of the /config/app.json file, will check against environment values
var configApp = {
    app: {}
};
if (process.env.HOST) configApp.app.host = process.env.HOST;
if (process.env.PORT) configApp.app.port = process.env.PORT;
if (process.env.PASSWORD) configApp.app.password = process.env.PASSWORD;
if (process.env.CONTEXT) configApp.app.context = process.env.CONTEXT;
if (process.env.MONITORING) configApp.app.monitoring = process.env.MONITORING;

if (!fs.existsSync(config_app)) fs.writeFileSync(config_app, JSON.stringify(configApp));

// Check the env for a connection to initiate
var configConnection = {
    connections: {}
};
if (process.env.CONN_NAME && process.env.DB_HOST) {
    if (!process.env.DB_PORT) process.env.DB_PORT = '27017'; // Use the default mongodb port when DB_PORT is not set
    var connectionString = 'mongodb://';
    if (process.env.DB_USERNAME && process.env.DB_PASSWORD && process.env.DB_NAME) {
        connectionString += process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_HOST + ':' + process.env.DB_PORT + '/' + process.env.DB_NAME;
    } else if (process.env.DB_USERNAME && process.env.DB_PASSWORD) {
        connectionString += process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_HOST + ':' + process.env.DB_PORT + '/'
    } else {
        connectionString += process.env.DB_HOST + ':' + process.env.DB_PORT
    }
    configConnection.connections[process.env.CONN_NAME] = {
        connection_options: {},
        connection_string: connectionString
    };
}
if (!fs.existsSync(config_connections) || fs.readFileSync(config_connections, 'utf8') === '{}')
    fs.writeFileSync(config_connections, JSON.stringify(configConnection));

// if config files exist but are blank we write blank files for nconf
if (fs.existsSync(config_app, 'utf8')) {
    if (fs.readFileSync(config_app, 'utf8') === '') {
        fs.writeFileSync(config_app, '{}', 'utf8');
    }
}
if (fs.existsSync(config_connections, 'utf8')) {
    if (fs.readFileSync(config_connections, 'utf8') === '') {
        fs.writeFileSync(config_connections, '{}', 'utf8');
    }
}

// setup the two conf. 'app' holds application config, and connections
// holds the mongoDB connections
nconf.add('connections', {type: 'file', file: config_connections});
nconf.add('app', {type: 'file', file: config_app});

// set app defaults
var app_host = process.env.HOST || 'localhost';
var app_port = process.env.PORT || 12345;

// get the app configs and override if present
if (nconf.stores.app.get('app:host') !== undefined) {
    app_host = nconf.stores.app.get('app:host');
}
if (nconf.stores.app.get('app:port') !== undefined) {
    app_port = nconf.stores.app.get('app:port');
}


app.locals.app_host = app_host;
app.locals.app_port = app_port;

app.use(logger('dev'));
app.use(bodyParser.json({limit: '32mb'}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

// Make stuff accessible to our router
app.use(function (req, res, next) {
    req.nconf = nconf.stores;
    req.db = db;
    next();
});

// 组织路由
app.use('/', api);
app.use('/api/app', api);

// === Error handlers ===

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    res.status(404);
    console.debug('%s %d %s', req.method, res.statusCode, req.url);
    res.json({
        status: 0,
        message: 'Not found'
    });
    return;
});

// Error handlers
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    console.error('%s %d %s', req.method, res.statusCode, err.message);
    res.json({
        status: 0,
        message: err.message
    });
    return;
});

app.on('uncaughtException', function (err) {
    console.error(err.stack);
    process.exit();
});

// add the connections to the connection pool
var connection_list = nconf.stores.connections.get('connections');
var connPool = require('./connections');
app.locals.dbConnections = null;

async.forEachOf(connection_list, function (value, key, callback) {
        var MongoURI = require('mongo-uri');

        try {
            MongoURI.parse(value.connection_string);
            connPool.addConnection({
                connName: key,
                connString: value.connection_string,
                connOptions: value.connection_options
            }, app, function (err, data) {
                if (err) delete connection_list[key];
                callback();
            });
        } catch (err) {
            callback();
        }
    },
    function (err) {
        if (err) console.error(err.message);
        // lift the app
        app.listen(app_port, app_host, function () {
            console.log('mongo api listening on host: http://' + app_host + ':' + app_port);
        }).on('error', function (err) {
            if (err.code === 'EADDRINUSE') {
                console.error('Error starting mongoApi: Port ' + app_port + ' already in use, choose another');
            } else {
                console.error('Error starting mongoApi: ' + err);
                app.emit('errorMongoApi');
            }
        });
    });

module.exports = app;
