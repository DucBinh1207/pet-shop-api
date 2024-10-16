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

// Function to connect to the database and execute a query
async function connectToDatabase() {
  try {
    // Create a connection pool
    const pool = await sql.connect(config);

    // Perform a sample query
    const result = await pool.request().query('SELECT * FROM role');
    
    console.log(result);

    // Close the connection after the query
    sql.close();
  } catch (err) {
    console.error('SQL error', err);
  }
}

// Call the function to connect to the database
connectToDatabase();
