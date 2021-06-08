import { inject, injectable } from "inversify";
import * as redis from "redis";
import AchievementMessage from "../models/achievementMessage";

@injectable()
export default class EventAggregator {
    private readonly publisher: redis.RedisClient;

    constructor() {
        this.publisher = redis.createClient({
            url: process.env.REDIS_URL,
            port: 6379,
        });
    }

    public publishAchievement(msg: AchievementMessage) {
        this.publisher.publish("achievements", JSON.stringify(msg));
    }
}
