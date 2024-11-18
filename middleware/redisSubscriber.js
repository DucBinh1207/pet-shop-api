const redis = require("redis");

const listenForExpirationEvents = async (callback) => {
  const subscriber = redis.createClient({
    url: `redis://default:A57mPDDIkAT8BsUsp5EQ1l4A6adbmDZ8@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });

  const redisClient = redis.createClient({
    url: `redis://default:A57mPDDIkAT8BsUsp5EQ1l4A6adbmDZ8@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });

  try {
    await subscriber.connect();
    await redisClient.connect();

    // Bật keyspace notifications trong Redis nếu chưa bật
    await subscriber.sendCommand(["CONFIG", "SET", "notify-keyspace-events", "Ex"]);

    // Lắng nghe kênh keyspace events
    const keyspaceChannel = `__keyevent@0__:expired`;
    await subscriber.subscribe(keyspaceChannel, async (expiredKey) => {
      if (expiredKey.startsWith(process.env.PREFIX_RESERVED_STOCK)) {
        const userId = expiredKey.replace(process.env.PREFIX_RESERVED_STOCK, "").trim();

        // Lấy dữ liệu từ một key tạm thời mà bạn đã lưu trước đó
        const tempDataKey = process.env.PREFIX_RESERVED_STOCK_LATER + userId;
        const data = await redisClient.get(tempDataKey);  // Lấy dữ liệu từ key tạm thời

        // Gọi callback và truyền userId cùng dữ liệu của key
        await callback(expiredKey, data);
      }
    });

    console.log("Đã đăng ký lắng nghe sự kiện hết hạn Redis");
  } catch (err) {
    console.error("Lỗi khi lắng nghe Redis events:", err);
  }
};



module.exports = listenForExpirationEvents;
