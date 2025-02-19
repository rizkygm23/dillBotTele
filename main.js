const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Token bot Telegram
const token = '7089244977:AAEUOtH0MhWY3PKgFW3Yh7S8Snk9aJDJuqY';
const bot = new TelegramBot(token, { polling: { interval: 5000, autoStart: true, params: { timeout: 30 } } });
bot.on('polling_error', (error) => console.error('Polling error:', error.code));

// Konfigurasi Supabase
const supabase = createClient(
  "https://avtaghpbnasdxmjnahxc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGFnaHBibmFzZHhtam5haHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzU2ODcsImV4cCI6MjA0NjU1MTY4N30.msS8vrExcOUqW70DDMQ0KumXWMuBRpy7jlaU4wIEuLg"
);

// Fungsi untuk cek balance & point berdasarkan pubkeys sekaligus
async function checkBalance(pubkeys) {
  const { data, error } = await supabase
    .from('validator')
    .select('pubkey, balance, last_balance, point') // Tambahkan kolom point
    .in('pubkey', pubkeys); // Query banyak pubkeys sekaligus

  if (error) {
    console.error('Error fetching balance:', error.message);
    throw error;
  }
  
  // Konversi array ke objek untuk akses cepat berdasarkan pubkey
  return data.reduce((acc, row) => {
    acc[row.pubkey] = row;
    return acc;
  }, {});
}

// Event ketika bot menerima pesan
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  // Ambil pubkeys dari pesan dan bersihkan input
  const pubkeys = msg.text.trim().split('\n').map(p => p.trim()).filter(p => p.length > 50);
  if (pubkeys.length === 0) return bot.sendMessage(chatId, "Tidak ada pubkey valid yang ditemukan.");

  try {
    const balanceData = await checkBalance(pubkeys);
    let results = [];
    let totalPoint = 0;

    pubkeys.forEach(pubkey => {
      if (balanceData[pubkey]) {
        const { balance, last_balance, point } = balanceData[pubkey];
        const numericBalance = parseFloat(balance) || 0;
        const numericLastBalance = parseFloat(last_balance) || 0;
        const numericPoint = parseFloat(point) || 0; // Ambil point dari database
        totalPoint += numericPoint; // Gunakan point dari database

        const changes = (numericBalance - numericLastBalance).toFixed(4);

        results.push(`🔹 *Pubkey:* ${pubkey}\n💰 *Balance:* ${numericBalance}\n📉 *Last Balance:* ${numericLastBalance}\n🏆 *Your Point:* ${numericPoint.toFixed(2)}\n📊 *Changes 10m:* ${changes}`);
      } else {
        results.push(`⚠️ *Pubkey ${pubkey} not found in database.*`);
      }
    });

    results.push(`\n🎯 *Total Point:* ${totalPoint.toFixed(2)}`);
    bot.sendMessage(chatId, results.join('\n\n'), { parse_mode: "Markdown" });
  } catch (error) {
    bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil data.");
  }
});
