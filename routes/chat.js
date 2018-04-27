require("dotenv").config();
const express = require("express"),
    {check, validationResult} = require('express-validator/check'),
    {sanitizeBody} = require('express-validator/filter'),
    router = express.Router();
/*
    POST /chat
    Creates a new text message for passed in username.
*/
router.post("/", [
    sanitizeBody(["username", "text"]),
    check("username").trim()
        .isLength({min: 1}).withMessage(process.env.USERNAME_LENGTH)
        .matches(/^\S+$/).withMessage(process.env.USERNAME_WHITESPACE),
    check("text").trim()
        .isLength({min: 1}).withMessage(process.env.TEXT_LENGTH)
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({errors: errors.mapped()});
    }
    let timeout = req.body.timeout,
        expirationDate = new Date(),
        seconds = expirationDate.getSeconds();
    if (timeout == null || (typeof timeout !== "number")) {
        expirationDate.setSeconds(seconds + 60);
    } else {
        expirationDate.setSeconds(seconds + timeout);
    }
    res.locals.connection.query(process.env.INSERT_CHAT_QUERY, [
            req.body.username.trim(),
            req.body.text.trim(),
            expirationDate
        ],
        (error, results, fields) => {
            if (error) {
                return res.status(500).json({error: error});
            }
            return res.status(201).json({response: {id: results.insertId}});
        });
});
/*
    GET /chat/:id
    Returns the message object for the given id.
    This service can return both expired and unexpired messages.
 */
router.get("/:id", [
    check("id")
        .isInt().withMessage(process.env.ID_TYPE),
], function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({errors: errors.mapped()});
    }
    res.locals.connection.query(process.env.SELECT_CHAT_QUERY, req.params.id,
        function (error, results, fields) {
            if (error) {
                return res.status(500).json({error: error});
            }
            if (results.length === 0) {
                return res.status(404).json({error: process.env.NO_CHAT_FOUND});
            }
            return res.status(200).json({response: results});
        });
});

module.exports = router;
