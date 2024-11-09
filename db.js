const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://tdv0905179758:qMdBYWg45uwOUz9F@viet.fn3ykhs.mongodb.net/?retryWrites=true&w=majority&appName=Viet";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

module.exports = { client }