import { IUser, UserLevels } from "../models";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BotContainer } from "../inversify.config";
import { UserService } from "../services";

export default class APIHelper {
    public static error(status: number, message: string) {
        return {
            error: {
                status,
                message,
            },
        };
    }

    public static async checkUserLevel(req : Request, res: Response, next: NextFunction, minLevel: UserLevels) {
        let sessionUser = req.user as IUser;
        if (sessionUser?.username === undefined) {
            res.status(StatusCodes.FORBIDDEN);
            res.send(APIHelper.error(StatusCodes.FORBIDDEN, "User not logged in"));
        }
        else {
            const user = await BotContainer.get(UserService).getUser(sessionUser.username);
            if (user?.userLevelKey === undefined || user.userLevelKey < minLevel) {
                res.status(StatusCodes.FORBIDDEN);
                res.send(APIHelper.error(StatusCodes.FORBIDDEN, "Insufficient permissions"));
            } else {
                next();
            }
        }
    }
}
