import { IUser, UserLevels } from "../models";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export default class APIHelper {
    public static error(status: number, message: string) {
        return {
            error: {
                status,
                message,
            },
        };
    }

    public static checkUserLevel(req : Request, res: Response, next: NextFunction, minLevel: UserLevels) {
        let sessionUser = req.user as IUser;
        if (sessionUser?.userLevelKey === undefined || sessionUser.userLevelKey < minLevel) {
            res.status(StatusCodes.FORBIDDEN);
            res.send(APIHelper.error(StatusCodes.FORBIDDEN, "Insufficient permissions"));
        }
        else {
            next();
        }
    }
}
