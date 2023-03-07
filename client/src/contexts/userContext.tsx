import React, { createContext, useState, useEffect, useMemo } from "react";
import axios, { AxiosError, AxiosResponse } from "axios";
import { IUser } from "components/common/user";
import { UserLevels } from "components/common/userLevel";

export enum ProviderType {
    Twitch,
    Streamlabs,
    Youtube,
    Spotify,
    DropBox
}

export interface IAuthorizedUser extends IUser {
    missingBroadcasterPermissions?: boolean[],
    missingModPermissions?: boolean[],
    missingBotPermissions?: boolean[],
    authorizations?: any
}

const defaultUser: IAuthorizedUser = {
    username: "",
    userLevel: UserLevels.None,
    missingBroadcasterPermissions: [],
    missingModPermissions: [],
    missingBotPermissions: [],
    points: 0,
    hasLogin: false
};

export const UserContext = createContext({user: defaultUser, loadUser: () => {}});

const UserContextProvider = (props: any) => {
    const [user, setUser] = useState<IAuthorizedUser>(defaultUser);

    const loadUser = () => {
        axios.get("/api/isloggedin", {
            withCredentials: true,
        })
        .then((response: AxiosResponse<any>) => {
            setUser(response.data);
        })
        .catch((err: AxiosError<any>) => {
            setUser(defaultUser);
        })
    };

    const value = useMemo(
        () => ({
            user,
            setUser,
            loadUser
        }),
        [user]
    );

    useEffect(loadUser, []);

    return <UserContext.Provider value={value}>{props.children}</UserContext.Provider>;
};

export default UserContextProvider;
