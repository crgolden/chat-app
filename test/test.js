require("dotenv").config();
const app = require("../app.js"),
    chai = require("chai"),
    chaiHttp = require("chai-http"),
    mysql = require('mysql2'),
    connection = mysql.createPool({
        connectionLimit: 50,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB
    });

chai.should();
chai.use(chaiHttp);

before(() => {
    connection.query(process.env.INSERT_EXPIRED_QUERY);
    connection.query(process.env.INSERT_UNEXPIRED_QUERY);
});

describe("/chat", () => {
    // GET /chat/:id
    it("should return a chat for a valid id", () => {
        return chai.request(app)
            .get("/chat/1")
            .then((res) => {
                res.should.be.json;
                res.should.have.status(200);
                res.body.should.be.an("object");
                res.body.should.have.property("response");
                res.body.response.should.be.an("array");
                res.body.response.length.should.be.eql(1);
                let chat = res.body.response[0];
                chat.username.should.be.eql("jim");
                chat.text.should.be.eql("this is my first message!");
            });
    });
    // GET /chat/(out-of-range)
    it("should return 404 if id is not found", () => {
        return chai.request(app)
            .get("/chat/" + Number.MAX_SAFE_INTEGER)
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(404);
                let text = JSON.parse(err.response.text);
                text.error.should.be.eql(process.env.NO_CHAT_FOUND);
            });
    });
    // GET /chat/(a string)
    it("should return 422 if id is not a number", () => {
        return chai.request(app)
            .get("/chat/id")
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(422);
                let text = JSON.parse(err.response.text);
                text.errors.should.be.an("object");
                text.errors.id.should.be.an("object");
                text.errors.id.msg.should.be.eql(process.env.ID_TYPE);
            });
    });
    // POST /chat
    it("should add a new chat with valid username and text", () => {
        return chai.request(app)
            .post("/chat")
            .send({
                username: process.env.CHAT_TEST_NAME,
                text: process.env.TEST_TEXT
            })
            .then(function (res) {
                res.should.be.json;
                res.should.have.status(201);
                res.body.should.be.an("object");
                res.body.should.have.property("response");
                res.body.response.should.be.an("object");
                res.body.response.id.should.be.a("number");
            });
    });
    // POST /chat
    it("should return 422 for chat with empty username", () => {
        return chai.request(app)
            .post("/chat")
            .send({
                username: "",
                text: process.env.TEST_TEXT
            })
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(422);
                let text = JSON.parse(err.response.text);
                text.errors.should.be.an("object");
                text.errors.username.should.be.an("object");
                text.errors.username.msg.should.be.eql(process.env.USERNAME_LENGTH);
            });
    });
    // POST /chat
    it("should return 422 for chat with whitespace in username", () => {
        return chai.request(app)
            .post("/chat")
            .send({
                username: process.env.CHAT_TEST_NAME + " with whitespace",
                text: process.env.TEST_TEXT
            })
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(422);
                let text = JSON.parse(err.response.text);
                text.errors.should.be.an("object");
                text.errors.username.should.be.an("object");
                text.errors.username.msg.should.be.eql(process.env.USERNAME_WHITESPACE);
            });
    });
    // POST /chat
    it("should return 422 for chat with empty text", () => {
        return chai.request(app)
            .post("/chat")
            .send({
                username: process.env.CHAT_TEST_NAME,
                text: ""
            })
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(422);
                let text = JSON.parse(err.response.text);
                text.errors.should.be.an("object");
                text.errors.text.should.be.an("object");
                text.errors.text.msg.should.be.eql(process.env.TEXT_LENGTH);
            });
    });
});

describe("/chats", () => {
    // GET /chats/:username
    it("should return all unexpired chats for a valid username", () => {
        return chai.request(app)
            .get("/chats/" + process.env.UNEXPIRED_CHATS_TEST_NAME)
            .then((res) => {
                res.should.be.json;
                res.should.have.status(200);
                res.body.should.be.an("object");
                res.body.should.have.property("response");
                res.body.response.should.be.an("array");
                res.body.response.length.should.be.eql(2);
                let chat1 = res.body.response[0],
                    chat2 = res.body.response[1];
                chat1.text.should.be.eql(process.env.TEST_TEXT + 3);
                chat2.text.should.be.eql(process.env.TEST_TEXT + 4);
            });
    });
    // GET /chats
    it("should return 422 if username is missing", () => {
        return chai.request(app)
            .get("/chats/")
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(422);
                let text = JSON.parse(err.response.text);
                text.error.should.be.eql(process.env.USERNAME_LENGTH);
            });
    });
    // GET /chats/(no unexpired for username)
    it("should return 404 if no unexpired chats are found", () => {
        return chai.request(app)
            .get("/chats/" + process.env.EXPIRED_CHATS_TEST_NAME)
            .catch((err) => {
                err.response.should.be.json;
                err.response.should.have.status(404);
                let text = JSON.parse(err.response.text);
                text.error.should.be.eql(process.env.NO_CHATS_FOUND);
            });
    });
});

after(() => {
    connection.query(process.env.DELETE_TESTS_QUERY);
});
