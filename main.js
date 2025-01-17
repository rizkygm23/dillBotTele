const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Token bot Telegram
const token = '7089244977:AAEUOtH0MhWY3PKgFW3Yh7S8Snk9aJDJuqY';
const bot = new TelegramBot(token, { polling: { interval: 5000, autoStart: true, params: { timeout: 30 } } });
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});

// Konfigurasi Supabase
const supabase_url = "https://avtaghpbnasdxmjnahxc.supabase.co";
const supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGFnaHBibmFzZHhtam5haHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzU2ODcsImV4cCI6MjA0NjU1MTY4N30.msS8vrExcOUqW70DDMQ0KumXWMuBRpy7jlaU4wIEuLg";

const supabase = createClient(supabase_url, supabase_key);

// Fungsi untuk cek balance dan last_balance berdasarkan pubkey
async function checkBalance(pubkey) {
  const { data, error } = await supabase
    .from('validator')
    .select('balance, last_balance')
    .eq('pubkey', pubkey)
    .single(); // Ambil satu record

  if (error) {
    console.error('Error fetching balance:', error.message);
    throw error;
  }
  return data;
}

// Event ketika bot menerima pesan
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Ambil pubkeys dari pesan, dan pisahkan berdasarkan baris baru (enter)
  const pubkeys = msg.text.trim().split('\n');

  // Cek setiap pubkey dan kumpulkan hasilnya
  let results = [];
  let totalPoint = 0;

  for (const pubkey of pubkeys) {
    const cleanPubkey = pubkey.trim();
    if (cleanPubkey.length > 50) { // Validasi panjang pubkey
      try {
        const balanceData = await checkBalance(cleanPubkey);
        if (balanceData) {
          const { balance, last_balance } = balanceData;
          let point = balance > 36000 ? (balance - 36000).toFixed(2) : (balance - 3600).toFixed(2);
          totalPoint += balance > 36000 ? balance - 36000 : balance - 3600;

          const changes = (balance - last_balance).toFixed(4);
          results.push(`Balance for pubkey ${cleanPubkey}\nBalance: ${balance}\nLast balance: ${last_balance}\nYour Point: ${point}\nChanges 10m: ${changes}`);
        } else {
          results.push(`Pubkey ${cleanPubkey} not found in database.`);
        }
      } catch (error) {
        results.push(`Error while fetching balance for ${cleanPubkey}.`);
      }
    } else {
      results.push(`Pubkey ${cleanPubkey} invalid.`);
    }
  }

  results.push(`Total Point = ${totalPoint.toFixed(2)}`);
  bot.sendMessage(chatId, results.join('\n\n'));
});
