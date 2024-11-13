const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql');

// Masukkan token bot langsung di sini
const token = 'YourTokenBot';
const bot = new TelegramBot(token, { polling: { interval: 5000, autoStart: true, params: { timeout: 30 } } });
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});

// Setup koneksi MySQL

let db;

function connectToDatabase() {
  db = mysql.createConnection({
    host: 'bt8d8ug5hpoxdwsukll6-mysql.services.clever-cloud.com',
    user: 'utrs1etdedrsx5og',
    password: 'nGaXw8vAZUlBJgzNpdQw',
    database: 'bt8d8ug5hpoxdwsukll6'
  });

  db.connect((err) => {
    if (err) {
      console.error('Database connection error:', err);
      setTimeout(connectToDatabase, 2000); // Retry connection after 2 seconds
    } else {
      console.log('Connected to the database');
    }
  });

  db.on('error', (err) => {
    console.log('Database error:', err.code);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
      connectToDatabase(); // Reconnect if connection is lost
    } else {
      throw err;
    }
  });
}

connectToDatabase();

// Fungsi untuk cek balance dan last_balance berdasarkan pubkey
function checkBalance(pubkey, callback) {
  const query = 'SELECT balance, last_balance FROM validator WHERE pubkey = ?';
  db.query(query, [pubkey], (error, results) => {
    if (error) return callback(error, null);
    if (results.length > 0) {
      callback(null, { balance: results[0].balance, last_balance: results[0].last_balance });
    } else {
      callback(null, null); // Pubkey tidak ditemukan
    }
  });
}

// Event ketika bot menerima pesan
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Ambil pubkeys dari pesan, dan pisahkan berdasarkan baris baru (enter)
  const pubkeys = msg.text.trim().split('\n');

  // Cek setiap pubkey dan kumpulkan hasilnya
  let results = [];
  let pending = pubkeys.length; // Untuk menghitung jumlah pubkey yang tersisa untuk diproses
  let totalPoint = 0;

  pubkeys.forEach((pubkey) => {
    pubkey = pubkey.trim();

    if (pubkey.length > 50) { // Asumsikan panjang pubkey yang valid adalah 64 karakter
      checkBalance(pubkey, (error, balanceData) => {
        if (error) {
          results.push(`Error while fetching balance for ${pubkey}.`);
        } else if (balanceData) {
          console.log('Balance:', balanceData.balance, 'Type:', typeof balanceData.balance);
          console.log('Last Balance:', balanceData.last_balance, 'Type:', typeof balanceData.last_balance);

          let point = 0;
          let points = 0;
          if (balanceData.balance > 36000) {
            point = (balanceData.balance - 36000).toFixed(2);
            points = (balanceData.balance - 36000);
          } else {
            point = (balanceData.balance - 3600).toFixed(2);
            points = (balanceData.balance - 3600);
          }

          totalPoint += points;
          const changes = (balanceData.balance - balanceData.last_balance).toFixed(4);
          results.push(`Balance for pubkey ${pubkey}\nBalance: ${balanceData.balance}\nLast balance: ${balanceData.last_balance}\nYour Point: ${point}\nChanges 10m: ${changes}`);
        } else {
          results.push(`Pubkey ${pubkey} not found in database.`);
        }

        // Kurangi jumlah pending dan cek apakah semua pubkey telah diproses
        pending--;
        if (pending === 0) {
          results.push(`Total Point = ${totalPoint.toFixed(2)}`);
          // Kirim semua hasil ke pengguna setelah semua pubkey diproses
          bot.sendMessage(chatId, results.join('\n\n'));
        }
      });
    } else {
      results.push(`Pubkey ${pubkey} invalid.`);
      pending--;

      // Jika semua pubkey selesai diproses
      if (pending === 0) {
        bot.sendMessage(chatId, results.join('\n\n'));
      }
    }
  });
});