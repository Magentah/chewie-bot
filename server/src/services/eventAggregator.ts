import { inject, injectable } from "inversify";
import * as redis from "redis";
import AchievementMessage from "../models/achievementMessage";

export enum EventChannel {
    Achievements =  "achievements",
}

@injectable()
export default class EventAggregator {
    private readonly publisher: redis.RedisClient;

    constructor() {
        this.publisher = redis.createClient({
            url: process.env.REDIS_URL,
            port: 6379,
        });
    }

    public getSubscriber(): redis.RedisClient {
        return redis.createClient({
            url: process.env.REDIS_URL,
            port: 6379,
        });
    }

    public publishAchievement(msg: AchievementMessage) {
        this.publisher.publish(EventChannel.Achievements, JSON.stringify(msg));
    }
}
