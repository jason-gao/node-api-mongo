var express = require('express');
var router = express.Router();


// Show connections
router.get('/connection_list', function (req, res, next) {
    var connection_list = req.nconf.connections.get('connections');

    res.json({
        status: 1,
        message: 'Ok',
        data: connection_list,
    });
});


// Add a new connection config
router.post('/add_config', function (req, res, next) {
    var nconf = req.nconf.connections;
    var MongoURI = require('mongo-uri');
    var connName = req.body.conn_name;
    var connString = req.body.conn_string;
    var connOptions = req.body.conn_options;

    var connPool = require('../connections');
    var connection_list = req.nconf.connections.get('connections');

    // check if name already exists
    if (connection_list !== undefined) {
        if (connection_list[connName] !== undefined) {
            res.json({
                status: 0,
                message: 'Config error: A connection by that name already exists',
                data: {},
            });
            return;
        }
    }

    // try parse uri string. If pass, add, else throw an error
    try {
        MongoURI.parse(connString);
        var options = {};
        try {
            options = JSON.parse(connOptions);
        } catch (err) {
            res.json({
                status: 0,
                message: 'Error in connection options' + ': ' + err,
                data: {},
            });
            return;
        }

        // try add the connection
        connPool.addConnection({
            connName: connName,
            connString: connString,
            connOptions: options
        }, req.app, function (err, data) {
            if (err) {
                console.error('DB Connect error: ' + err);
                res.json({
                    status: 0,
                    message: 'Config error' + ': ' + err,
                    data: {},
                });
            } else {
                // set the new config
                nconf.set('connections:' + connName, {
                    'connection_string': connString,
                    'connection_options': options
                });

                // save for ron
                nconf.save(function (err) {
                    if (err) {
                        console.error('Config error: ' + err);
                        res.json({
                            status: 0,
                            message: 'Config error' + ': ' + err,
                            data: {},
                        });
                    } else {
                        res.json({
                            status: 1,
                            message: "Config successfully added",
                            data: {},
                        });
                    }
                });
            }
        });
    } catch (err) {
        console.error('Config error: ' + err);
        res.json({
            status: 0,
            message: 'Config error' + ': ' + err,
            data: {},
        });
    }
});

// Updates an existing connection config
router.post('/update_config', function (req, res, next) {
    var nconf = req.nconf.connections;
    var connPool = require('../connections');
    var MongoURI = require('mongo-uri');

    var oldConnName = req.body.old_conn_name;
    var connName = req.body.conn_name;
    var connString = req.body.conn_string;
    var connOptions = req.body.conn_options;

    // try parse uri string. If pass, add, else throw an error
    try {
        MongoURI.parse(connString);

        // try add the connection
        connPool.addConnection({
            connName: connName,
            connString: connString,
            connOptions: connOptions
        }, req.app, function (err, data) {
            if (err) {
                console.error('DB Connect error: ' + err);
                res.json({'msg': 'Config error' + ': ' + err});
            } else {
                // delete current config
                delete nconf.store.connections[oldConnName];

                // set the new
                nconf.set('connections:' + connName, {
                    'connection_string': connString,
                    'connection_options': connOptions
                });

                // save for ron
                nconf.save(function (err) {
                    if (err) {
                        console.error('Config error1: ' + err);
                        res.json({'msg': 'Config error' + ': ' + err});
                    } else {
                        res.json({
                            'msg': 'Config successfully updated',
                            'name': connName,
                            'string': connString
                        });
                    }
                });
            }
        });
    } catch (err) {
        console.error('Config error: ' + err);
        res.json({'msg': 'Config error' + ': ' + err});
    }
});

// Delete an existing connection config
router.post('/delete_config', function (req, res, next) {
    var nconf = req.nconf.connections;
    var connPool = require('../connections');

    var connName = req.body.conn_name;


    // delete current config
    delete nconf.store.connections[connName];
    connPool.removeConnection(connName, req.app);

    // save config
    nconf.save(function (err) {
        if (err) {
            console.error('Config error: ' + err);
            res.json({'msg': 'Config error' + ': ' + err});
        } else {
            res.json({'msg': 'Config successfully deleted'});
        }
    });
});


module.exports = router;
