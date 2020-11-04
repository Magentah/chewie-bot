import { Request, Response, NextFunction } from "express";
import { Logger, LogType } from "../logger";

export default function routeLogger(req: Request, res: Response, next: NextFunction) {
    Logger.info(LogType.Server, "Request made to server.", {
        statusCode: req.statusCode,
        path: req.path,
        route: req.route,
        query: req.query,
        params: req.params,
        body: req.body,
        ip: req.ip,
    });

    next();
}
