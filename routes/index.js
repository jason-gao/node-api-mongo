var express = require('express');
var router = express.Router();
var common = require('./common');


// default
router.get('/', function (req, res) {
    res.json({
        status: 1,
        message: 'welcome to mongo api service!'
    });
});


module.exports = router;
