const redis = require("redis");
class redisClient {
  static instance;

  constructor() {
    if (redisClient.instance) {
      return redisClient.instance;
    }

    this.client = redis.createClient({
      url: `redis://default:A57mPDDIkAT8BsUsp5EQ1l4A6adbmDZ8@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });

    this.client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    this.client.on("connect", () => {
      console.log("Connected to Redis");
    });

    this.client
      .connect()
      .then(() => console.log("Kết nối đến Redis thành công!"))
      .catch((err) => console.error("Lỗi kết nối Redis:", err));

    redisClient.instance = this;
  }

  static init() {
    if (!redisClient.instance) {
      redisClient.instance = new redisClient();
    }
    return redisClient.instance.client;
  }
}

module.exports = redisClient;
