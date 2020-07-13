var express = require('express');
var router = express.Router();


// Show connections
router.post('/login', function (req, res, next) {
    var admin = req.nconf.user.get('admin');
    var username = admin["username"] || "";
    var password = admin["password"] || "";

    var reqUserName = req.body.username || "";
    var reqPassword = req.body.password || "";

    if(reqUserName === "" ||  reqPassword === ""){
        res.json({
            status:0,
            message:'用户名密码不能为空',
            data:[]
        });
        return;
    }

    if(reqUserName !== username || reqPassword !== password){
        res.json({
            status:0,
            message:'用户名密码不正确',
            data:[]
        });
        return;
    }

    res.json({
        status: 1,
        message: 'Ok',
        data: [],
    });
});

module.exports = router;