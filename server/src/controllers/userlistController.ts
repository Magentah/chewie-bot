import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IUser } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { UserLevelsRepository, UsersRepository } from "../database";

@injectable()
class UserlistController {
    constructor(@inject(UsersRepository) private userService: UsersRepository,
                @inject(UserLevelsRepository) private userLevels: UserLevelsRepository) {
        Logger.info(
            LogType.ServerInfo,
            `UserlistController constructor. UserlistRepository exists: ${this.userService !== undefined}`
        );
    }

    /**
     * Get the full user list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getUserlist(req: Request, res: Response): Promise<void> {
        const users = await this.userService.getList();
        res.status(StatusCodes.OK);
        res.send(users);
    }

    /**
     * Get the list of user levels.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getUserLevels(req: Request, res: Response): Promise<void> {
        const userLevels = await this.userLevels.getList();
        res.status(StatusCodes.OK);
        res.send(userLevels);
    }

    /**
     * Updates the details of a user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateUser(req: Request, res: Response): Promise<void> {
        const newUser = req.body as IUser;
        if (!newUser) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        try {
            await this.userService.update(newUser);
            res.status(StatusCodes.OK);
            res.send(newUser);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the user."
                )
            );
        }
    }

    /**
     * Add a user to the user list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addUser(req: Request, res: Response): Promise<void> {
        const newUser = req.body as IUser;
        if (!newUser) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        try {
            await this.userService.add(newUser);
            res.status(StatusCodes.OK);
            res.send(newUser);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the user."
                )
            );
        }
    }

    /**
     * Remove a user from the userlist by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeUser(req: Request, res: Response): void {
        const user = req.body as IUser;
        if (user) {
            this.userService.delete(user);
        } else if (Number(req.body)) {
            this.userService.delete(req.body);
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }
}

export default UserlistController;
