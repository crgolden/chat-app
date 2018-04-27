require("dotenv").config();
if (process.env.NODE_ENV !== "test") {
    const cluster = require("cluster"),
        numCPUs = require("os").cpus().length;

    if (cluster.isMaster) {
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
        cluster.on("exit", function (worker, code, signal) {
            cluster.fork();
        });
    } else {
        setupApp();
    }
}
else {
    setupApp();
}

function setupApp() {
    const app = module.exports = require("express")(),
        logger = require("morgan"),
        bodyParser = require("body-parser"),
        mysql = require("mysql2"),
        chats = require("./routes/chats"),
        chat = require("./routes/chat"),
        http = require("http"),
        debug = require("debug")("under-armour:server"),
        port = normalizePort(process.env.PORT || "3000"),
        server = http.createServer(app);
    app.set("port", port);
    app.use(logger("dev"));
    app.use(bodyParser.json({type: "application/json"}));
    app.use(bodyParser.urlencoded({extended: false}));
    app.use((req, res, next) => {
        res.locals.connection = mysql.createPool({
            connectionLimit: 50,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB
        });
        next();
    });
    app.use("/chats", chats);
    app.use("/chat", chat);
    server.listen(port);
    server.on("error", onError);
    server.on("listening", onListening);

    function normalizePort(val) {
        let port = parseInt(val, 10);

        if (isNaN(port)) {
            // named pipe
            return val;
        }
        if (port >= 0) {
            // port number
            return port;
        }
        return false;
    }

    function onError(error) {
        if (error.syscall !== "listen") {
            throw error;
        }
        let bind = typeof port === "string"
            ? "Pipe " + port
            : "Port " + port;

        switch (error.code) {
            case "EACCES":
                console.error(bind + " requires elevated privileges");
                process.exit(1);
                break;
            case "EADDRINUSE":
                console.error(bind + " is already in use");
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    function onListening() {
        let addr = this.address(),
            bind = typeof addr === "string"
                ? "pipe " + addr
                : "port " + addr.port;
        debug("Listening on " + bind);
    }
}
