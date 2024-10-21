// const sql = require('mssql');

// // Define your configuration for the Azure SQL Database connection
// const config = {
//   user: 'pbl6', // Azure SQL username
//   password: 'petshop12!', // Azure SQL password
//   server: 'pbl6.database.windows.net', // Azure SQL server name
//   database: 'petshop', // Azure SQL database name
//   options: {
//     encrypt: true, // Use encryption for Azure SQL databases
//     enableArithAbort: true // Required for compatibility
//   },
// };

// let poolPromise = sql.connect(config)
//     .then(pool => {
//         console.log('Connected to Azure SQL Database');
//         return pool;
//     })
//     .catch(err => {
//         console.error('Database connection failed!', err);
//         throw err;
//     });

// module.exports = {
//     sql,
//     poolPromise,
// };


// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://thtrue012:qY5HiPphK1EW2SJo@cluster0.z7ifu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);

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