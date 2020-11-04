import { Request, Response, NextFunction } from "express";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";

export default function routeLogger(req: Request, res: Response, next: NextFunction) {
    const cookie = req.cookies.user;
    if (cookie === undefined) {
        const sessionUser = req.user as IUser;
        if (sessionUser !== undefined) {
            const user = {
                username: sessionUser.username,
                viewerStatus: sessionUser.userLevel,
                vipStatus: sessionUser.vipLevel,
            };
            res.cookie("user", JSON.stringify(user));
            Logger.debug(LogType.Server, "Setting user cookie", { user });
        }
    } else {
        if ((req.user !== undefined && cookie.username !== (req.user as IUser).username) || req.user === undefined) {
            res.clearCookie("user");
        }
    }
    next();
}
