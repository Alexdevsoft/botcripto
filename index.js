const axios = require("axios");
const crypto = require("crypto");

const SYMBOL = "BTCUSDT";
const QUANTITY = "0.0001";
const PERIOD = 14;

const API_URL = "https://testnet.binance.vision"; //https://api.binance.com
const API_KEY = "6YEyQZhJlUGmdleEnl7jtV4N8c5jblh80TQb56VBAPgtx1IRqSzmfn4GRpnY6QUF"
const SECRET_KEY = "dO5oq43vnae594d1jyCA8IiDCBxWfZTRogrvlKR6Obi2IU0XLBZ73TMiNlDtaXZz"

function averages(prices, period, startIndex) {
    let gains = 0, losses = 0;

    for (let i = 0; i < period && (i + startIndex) < prices.length; i++) {
        const diff = prices[i + startIndex] - prices[i + startIndex - 1];
        if (diff >= 0)
            gains += diff;
        else
            losses += Math.abs(diff);
    }

    let avgGains = gains / period;
    let avgLosses = losses / period;
    return { avgGains, avgLosses };

}

function RSI(prices, period) {
    let avgGains = 0, avgLosses = 0;

    for (let i = 1; i < prices.length; i++) {
        let newAverages = averages(prices, period, 1);

        if (i === 1) {
            avgGains = newAverages.avgGains;
            avgLosses = newAverages.avgLosses;
            continue;
        }

        avgGains = (avgGains * (period - 1) + newAverages.avgGains) / period;
        avgLosses = (avgLosses * (period - 1) + newAverages.avgLosses) / period;
    }

    const rs = avgGains / avgLosses;
    return 100 - (100 / (1 + rs));
}

async function newOrder(symbol, quantity, side) {
    const order = { symbol, quantity, side };
    order.type = "MARKET";
    const serverTime = await fetch('https://api.binance.com/api/v3/time').then(response => response.json());
    const timeDifference = serverTime.serverTime - Date.now();
    order.timestamp = Date.now() + timeDifference;




    const signature = crypto.Hmac("sha256", SECRET_KEY)
        .update(new URLSearchParams(order).toString())
        .digest("hex");

    order.signature = signature;

    try {
        const { data } = await axios.post(API_URL + "/api/v3/order",
            new URLSearchParams(order).toString(),
            {
                headers: { "X-MBX-APIKEY": API_KEY }
            }
        )

        console.log(data);

    } catch (err) {
        console.error(err.response.data);
    }
}

let isOpened = false;

async function start() {

    const { data } = await axios.get(API_URL + "/api/v3/klines?limit=100&interval=15m&symbol=" + SYMBOL);
    const candle = data[data.length - 1];
    const lastPrice = parseFloat(candle[4]);

    console.clear();
    console.log("Price: " + lastPrice);

    const prices = data.map(k => parseFloat(k[4]));
    const rsi = RSI(prices, PERIOD);
    console.log("RSI: " + rsi);
    console.log("Já comprei? ", isOpened);

    if (rsi < 30 && isOpened === false) {
        console.log("sobrevendido, hora de comprar.");
        isOpened = true;
        newOrder(SYMBOL, QUANTITY, "BUY");
        
    }
    else if (rsi > 70 && isOpened === true) {
        console.log("sobrecomprado, hora de vender.");
        newOrder(SYMBOL, QUANTITY, "SELL");
        isOpened = false;
    }
    else
        console.log("Aguardar");


}

setInterval(start, 3000);

start();