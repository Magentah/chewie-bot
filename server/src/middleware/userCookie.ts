import { Request, Response, NextFunction } from "express";
import { UsersRepository } from "../database";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";
import * as Config from "../config.json";

export default function userCookie(req: Request, res: Response, next: NextFunction) {
    function setCookie(newUser: IUser) {
        const user = {
            username: newUser.username,
            viewerStatus: newUser.userLevel,
            vipStatus: newUser.vipLevel,
            twitchUserProfile: newUser.twitchUserProfile,
        };
        res.cookie("user", JSON.stringify(user), { expires: new Date(Date.now() + 5 * 60 * 1000) });
        Logger.debug(LogType.Server, "Setting user cookie", { user });
    }

    let sessionUser = req.user as IUser;

    if (sessionUser === undefined) {
        sessionUser = UsersRepository.getAnonUser();
    } else if (sessionUser.username === Config.twitch.broadcasterName) {
        res.cookie("broadcaster_user", "1", { expires: new Date(253402300000000) });
    } else {
        res.cookie("broadcaster_user", "0");
    }

    setCookie(sessionUser);

    next();
}
