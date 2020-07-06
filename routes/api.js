var express = require('express');
var router = express.Router();
var common = require('./common');


// The base connection route showing all DB's for connection
router.get('/:conn', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var MongoURI = require('mongo-uri');

    var connName = req.params.conn;

    // if no connection found
    if (!connection_list || Object.keys(connection_list).length === 0) {
        res.json({
            status: 0,
            message: 'no connection found'
        });
        return;
    }

    // Check for existance of connection
    if (connection_list[connName] === undefined) {
        res.json({
            status: 0,
            message: 'Invalid connection name 1 ' + connName
        });
        return;
    }

    // parse the connection string to get DB
    var conn_string = connection_list[connName].connString;
    var uri = MongoURI.parse(conn_string);


    // Get DB's form pool
    var mongo_db = connection_list[connName].native;


    common.get_db_list(uri, mongo_db, function (err, db_list) {
        res.json({
            status: 1,
            message: "OK",
            data: {
                db_list: db_list,
            }
        });
    });
});

// show collection
router.get('/:conn/:db', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    var connName = req.params.conn;
    var dbName = req.params.db;


    // Check for existance of connection
    if (connection_list[connName] === undefined) {
        res.json({
            status: 0,
            message: 'Invalid connection name 2 ' + connName + dbName
        });
        return;
    }

    // Validate database name
    if (dbName.indexOf(' ') > -1) {
        res.json({
            status: 0,
            message: 'Invalid database name' + connName + dbName
        });
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[connName].native.db(dbName);

    // do DB stuff
    mongo_db.listCollections().toArray(function (err, collection_list) {
        res.json({
            status: 1,
            message: "OK",
            data: {
                conn_name: connName,
                db_name: dbName,
                coll_list: common.cleanCollections(collection_list),
            }
        });
    });
});

// 分页查询
router.get('/:conn/:db/:coll', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    var connName = req.params.conn;
    var dbName = req.params.db;
    var collName = req.params.coll;
    var page_num = req.query.page;
    var docs_per_page = req.query.per_page !== undefined ? parseInt(req.query.per_page) : 5;
    var q = req.query.q;
    var sort = req.query.sort !== undefined ? parseInt(req.query.sort) : -1;

    // Check for existance of connection
    if (connection_list[connName] === undefined) {
        res.json({'msg': 'Invalid connection name'});
    }

    // Validate database name
    if (dbName.indexOf(' ') > -1) {
        res.json({'msg': 'Invalid database name'});
    }

    // Get DB's form pool
    var mongo_db = connection_list[connName].native.db(dbName);

    var page_size = docs_per_page;
    var page = 1;

    if (page_num !== undefined) {
        page = parseInt(page_num);
    }

    var skip = 0;
    if (page > 1) {
        skip = (page - 1) * page_size;
    }

    var limit = page_size;

    var query_obj = {};
    var validQuery = true;
    var queryMessage = '';
    if (q) {
        try {
            query_obj = ejson.parse(q);
        } catch (e) {
            validQuery = false;
            queryMessage = e.toString();
            console.error('queryMessage error:', queryMessage);
            query_obj = {};
        }
    }

    console.log('query_obj', query_obj, 'q', q)
    mongo_db.collection(collName).find(query_obj, {
        skip: skip,
        limit: limit
    }).sort({"_id": sort}).toArray(function (err, result) {
        if (err) {
            console.error(err);
            res.json(err);
        } else {
            mongo_db.collection(collName).find({}, {
                skip: skip,
                limit: limit
            }).toArray(function (err, simpleSearchFields) {
                // get field names/keys of the Documents in collection
                var fields = [];
                for (var i = 0; i < simpleSearchFields.length; i++) {
                    var doc = simpleSearchFields[i];

                    for (var key in doc) {
                        if (key === '__v') continue;
                        fields.push(key);
                    }
                }
                ;

                fields = fields.filter(function (item, pos) {
                    return fields.indexOf(item) === pos;
                });

                // get total num docs in query
                mongo_db.collection(collName).count(query_obj, function (err, doc_count) {
                    var return_data = {
                        list: result,
                        fields: fields,
                        total: doc_count,
                        validQuery: validQuery,
                        queryMessage: queryMessage
                    };
                    res.json({
                        status: 1,
                        message: 'OK',
                        data: return_data
                    });
                });
            });
        }
    });
});


module.exports = router;
