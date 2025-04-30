import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export const renderQueue = new Queue("render", {
    connection: redisConnection,
  });