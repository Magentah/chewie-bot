import React, { createContext, useState, useEffect, useMemo } from "react";
import { useContextFactory } from "./contextFactory";
import axios, { AxiosError, AxiosResponse } from "axios";

export enum UserLevels {
    None = 0,
    Viewer = 1,
    Subscriber,
    Moderator,
    Bot,
    Admin,
    Broadcaster,
}

const defaultUser: any = {
    streamlabsToken: undefined,
    username: "",
    userLevel: UserLevels.None
};

export const UserContext = createContext({user: defaultUser, loadUser: () => {}});

export const useUserContext = useContextFactory("UserContext", UserContext);

const UserContextProvider = (props: any) => {
    const [user, setUser] = useState<any>(defaultUser);

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
