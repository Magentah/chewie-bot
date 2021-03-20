import { Request, Response, NextFunction } from "express";
import { UsersRepository } from "../database";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";

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
    }

    setCookie(sessionUser);

    next();
}
