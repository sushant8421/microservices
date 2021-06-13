const jwt = require("jsonwebtoken");

module.exports = async function isAuthenticated(req, res, next) {
    let token ;
    if(req.headers['authorization']){
        token = req.headers["authorization"].split(" ")[1];
    }else{
        return res.json({ message: 'no token provided for authorisation' });
    }

    jwt.verify(token, "secret", (err, user) => {
        if (err) {
            return res.json({ message: err });
        } else {
            req.user = user;
            next();
        }
    });

};
