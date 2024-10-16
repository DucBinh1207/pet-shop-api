const sql = require('mssql');

// Define your configuration for the Azure SQL Database connection
const config = {
  user: 'pbl6', // Azure SQL username
  password: 'petshop12!', // Azure SQL password
  server: 'pbl6.database.windows.net', // Azure SQL server name
  database: 'petshop', // Azure SQL database name
  options: {
    encrypt: true, // Use encryption for Azure SQL databases
    enableArithAbort: true // Required for compatibility
  },
};

let poolPromise = sql.connect(config)
    .then(pool => {
        console.log('Connected to Azure SQL Database');
        return pool;
    })
    .catch(err => {
        console.error('Database connection failed!', err);
        throw err;
    });

module.exports = {
    sql,
    poolPromise,
};