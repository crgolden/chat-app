require("dotenv").config();
const express = require("express"),
    {check, validationResult} = require('express-validator/check'),
    {sanitize} = require('express-validator/filter'),
    router = express.Router(),
    updateUnexpiredChatsQuery = (results) => {
        let query = process.env.UPDATE_CHATS_QUERY;
        for (let i = 0; i < results.length - 1; i++) {
            query += results[i].id + ", ";
        }
        return query + results[results.length - 1].id + ");";
    };
/*
    GET /chats
    Returns a not found because username is required
 */
router.get("/", (req, res, next) => {
    return res.status(422).json({error: process.env.USERNAME_LENGTH});
});
/*
    GET /chats/:username
    Returns a list of all unexpired texts for the user with the given username.
    Any texts that are received are then expired.
*/
router.get("/:username", [
    sanitize("username")
], (req, res, next) => {
    res.locals.connection.query(process.env.SELECT_CHATS_QUERY, req.params.username,
        (error, results, fields) => {
            if (error) {
                return res.status(500).json({error: error});
            }
            if (results.length === 0) {
                return res.status(404).json({error: process.env.NO_CHATS_FOUND});
            }
            res.locals.connection.query(updateUnexpiredChatsQuery(results));
            return res.status(200).json({response: results});
        });
});

module.exports = router;
