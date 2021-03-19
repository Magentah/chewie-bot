import { Request, Response, NextFunction } from "express";
import { UsersRepository } from "../database";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";

export default function userCookie(req: Request, res: Response, next: NextFunction) {
    const cookie = req.cookies.user;
    if (cookie === undefined) {
        let sessionUser = req.user as IUser;

        if (sessionUser === undefined) {
            sessionUser = UsersRepository.getAnonUser();
        }

        const user = {
            username: sessionUser.username,
            viewerStatus: sessionUser.userLevel,
            vipStatus: sessionUser.vipLevel,
            twitchUserProfile: sessionUser.twitchUserProfile,
        };
        res.cookie("user", JSON.stringify(user), { expires: new Date(Date.now() + 5 * 60 * 1000) });
        Logger.debug(LogType.Server, "Setting user cookie", { user });
    } else {
        const parsedCookie = JSON.parse(cookie);
        if (
            (req.user !== undefined && parsedCookie.username !== (req.user as IUser).username) ||
            (req.user === undefined && parsedCookie.username)
        ) {
            res.clearCookie("user");
        }
    }
    next();
}
